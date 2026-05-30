import Phaser from "phaser";
import { objectiveById, CURRICULUM } from "../content/curriculum";
import type { VocabEntry } from "../domain/cefr";
import { GameState, REGISTRY_KEY } from "../game/state";

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
  private layer!: Phaser.GameObjects.Container;

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
    this.layer?.destroy();
    const w = this.scale.width;
    const h = this.scale.height;
    const obj = objectiveById(this.objectiveId)!;

    const dim = this.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0, 0);
    const title = this.add
      .text(w / 2, 60, `Lesson · ${obj.label}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: "#ffe08a",
      })
      .setOrigin(0.5);
    const canDo = this.add
      .text(w / 2, 92, obj.canDo, {
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        color: "#9bc995",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    const q = this.quiz[this.index];
    const progress = this.add
      .text(w / 2, 130, `${this.index + 1} / ${this.quiz.length}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#d9b08c",
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(w / 2, 190, `How do you say:  “${q.prompt}”`, {
        fontFamily: "Trebuchet MS",
        fontSize: "26px",
        color: "#f4ecd8",
      })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [
      dim,
      title,
      canDo,
      progress,
      prompt,
    ];

    q.options.forEach((opt, i) => {
      const y = 260 + i * 64;
      const btn = this.add
        .rectangle(w / 2, y, 420, 50, 0x3d5a80, 1)
        .setStrokeStyle(2, 0xd9b08c)
        .setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(w / 2, y, opt, {
          fontFamily: "Trebuchet MS",
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(0x4f73a3));
      btn.on("pointerout", () => btn.setFillStyle(0x3d5a80));
      btn.on("pointerdown", () => this.answer(opt === q.answer, btn));

      children.push(btn, txt);
    });

    this.layer = this.add.container(0, 0, children).setDepth(60);
  }

  private answer(isCorrect: boolean, btn: Phaser.GameObjects.Rectangle) {
    btn.setFillStyle(isCorrect ? 0x4a7c59 : 0xb56576);
    if (isCorrect) this.correct++;
    this.time.delayedCall(450, () => {
      if (this.index < this.quiz.length - 1) {
        this.index++;
        this.renderQuestion();
      } else {
        this.finish();
      }
    });
  }

  private finish() {
    const w = this.scale.width;
    const h = this.scale.height;
    const ratio = this.correct / this.quiz.length;
    const passed = ratio >= 0.8;

    this.layer?.destroy();
    const dim = this.add.rectangle(0, 0, w, h, 0x000000, 0.8).setOrigin(0, 0);

    if (passed) {
      this.state.proficiency.master(this.objectiveId);
    }

    const headline = passed ? "¡Muy bien! Objective mastered." : "Casi… try again.";
    const head = this.add
      .text(w / 2, h / 2 - 40, headline, {
        fontFamily: "Trebuchet MS",
        fontSize: "30px",
        color: passed ? "#9bc995" : "#b56576",
      })
      .setOrigin(0.5);
    const score = this.add
      .text(w / 2, h / 2 + 4, `Score: ${this.correct}/${this.quiz.length}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: "#f4ecd8",
      })
      .setOrigin(0.5);
    const prompt = this.add
      .text(w / 2, h / 2 + 56, "[SPACE] return to the valley", {
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        color: "#d9b08c",
      })
      .setOrigin(0.5);

    this.layer = this.add.container(0, 0, [dim, head, score, prompt]).setDepth(60);
    this.input.keyboard!.once("keydown-SPACE", () => {
      this.scene.stop();
      this.scene.resume("WorldScene");
    });
  }
}
