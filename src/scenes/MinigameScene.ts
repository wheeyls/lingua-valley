import Phaser from "phaser";
import { objectiveById, CURRICULUM } from "../content/curriculum";
import type { VocabEntry } from "../domain/cefr";
import { GameState, REGISTRY_KEY } from "../game/state";
import { COLOR } from "../game/layout";
import { questionLayout, resultLayout } from "../ui/layouts/minigame";
import { renderNodes, type RenderedUI } from "../ui/PhaserRenderer";

interface Question {
  prompt: string; // English
  answer: string; // Spanish
  options: string[];
}

/** Build a quiz: translate English -> Spanish, picking the right word. */
function buildQuiz(vocab: VocabEntry[]): Question[] {
  const pool = CURRICULUM.flatMap((o) => o.vocab.map((v) => v.es));
  return vocab.map((v) => {
    const distractors = Phaser.Utils.Array.Shuffle(
      pool.filter((es) => es !== v.es),
    ).slice(0, 3);
    const options = Phaser.Utils.Array.Shuffle([v.es, ...distractors]);
    return { prompt: v.en, answer: v.es, options };
  });
}

export class MinigameScene extends Phaser.Scene {
  private state!: GameState;
  private objectiveId!: string;
  private quiz: Question[] = [];
  private index = 0;
  private correct = 0;
  private answered = false;
  private ui?: RenderedUI;

  constructor() {
    super("MinigameScene");
  }

  create(data: { objectiveId: string }) {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.objectiveId = data.objectiveId;
    const obj = objectiveById(this.objectiveId)!;
    this.quiz = Phaser.Utils.Array.Shuffle(buildQuiz(obj.vocab));
    this.index = 0;
    this.correct = 0;
    this.renderQuestion();
  }

  private renderQuestion() {
    this.ui?.destroy();
    const obj = objectiveById(this.objectiveId)!;
    const q = this.quiz[this.index];

    const handlers: Record<string, () => void> = {};
    q.options.forEach((opt, i) => {
      handlers[`answer-${i}`] = () => this.answer(opt === q.answer, i);
    });

    this.ui = renderNodes(
      this,
      questionLayout({
        lessonLabel: obj.label,
        canDo: obj.canDo,
        index: this.index,
        total: this.quiz.length,
        prompt: q.prompt,
        options: q.options,
      }),
      handlers,
    );
  }

  private answer(isCorrect: boolean, optionIndex: number) {
    if (this.answered) return;
    this.answered = true;
    if (isCorrect) this.correct++;

    // Recolor the chosen option to show right/wrong.
    const btn = this.ui?.byId.get(`option-${optionIndex}`) as
      | Phaser.GameObjects.Container
      | undefined;
    const bg = btn?.list[0] as Phaser.GameObjects.Rectangle | undefined;
    bg?.setFillStyle(isCorrect ? COLOR.greenFill : COLOR.roseFill);

    this.time.delayedCall(450, () => {
      this.answered = false;
      if (this.index < this.quiz.length - 1) {
        this.index++;
        this.renderQuestion();
      } else {
        this.finish();
      }
    });
  }

  private finish() {
    const passed = this.correct / this.quiz.length >= 0.8;
    if (passed) this.state.proficiency.master(this.objectiveId);

    this.ui?.destroy();
    this.ui = renderNodes(
      this,
      resultLayout({ passed, correct: this.correct, total: this.quiz.length }),
      { return: () => this.exit() },
    );

    this.input.keyboard!.once("keydown-SPACE", () => this.exit());
  }

  private exit() {
    this.scene.stop();
    this.scene.resume("WorldScene");
  }
}
