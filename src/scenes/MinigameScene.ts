import Phaser from "phaser";
import { objectiveById, CURRICULUM } from "../content/curriculum";
import type { VocabEntry } from "../domain/cefr";
import { GameState, REGISTRY_KEY } from "../game/state";
import { FONT, TYPE, COLOR, MARGIN, TOUCH_TARGET, makeButton } from "../game/layout";

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

    const dim = this.add.rectangle(0, 0, w, h, COLOR.ink, 0.92).setOrigin(0, 0);
    const title = this.add
      .text(w / 2, h * 0.12, `Lesson · ${obj.label}`, {
        fontFamily: FONT,
        fontSize: TYPE.title,
        color: COLOR.gold,
      })
      .setOrigin(0.5);
    const canDo = this.add
      .text(w / 2, h * 0.12 + 36, obj.canDo, {
        fontFamily: FONT,
        fontSize: TYPE.label,
        color: COLOR.green,
        fontStyle: "italic",
        wordWrap: { width: w - MARGIN * 4 },
        align: "center",
      })
      .setOrigin(0.5);

    const q = this.quiz[this.index];
    const progress = this.add
      .text(w / 2, h * 0.12 + 78, `${this.index + 1} / ${this.quiz.length}`, {
        fontFamily: FONT,
        fontSize: TYPE.small,
        color: COLOR.goldText,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(w / 2, h * 0.3, `How do you say…\n“${q.prompt}”`, {
        fontFamily: FONT,
        fontSize: TYPE.heading,
        color: COLOR.parchment,
        align: "center",
        wordWrap: { width: w - MARGIN * 3 },
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [
      dim,
      title,
      canDo,
      progress,
      prompt,
    ];

    // Full-width answer buttons, generously spaced for thumbs.
    const btnW = w - MARGIN * 2;
    const startY = h * 0.45;
    const gap = TOUCH_TARGET + 18;
    q.options.forEach((opt, i) => {
      const y = startY + i * gap;
      const btn = this.add
        .rectangle(w / 2, y, btnW, TOUCH_TARGET, COLOR.blue, 1)
        .setStrokeStyle(2, COLOR.goldNum)
        .setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(w / 2, y, opt, {
          fontFamily: FONT,
          fontSize: TYPE.body,
          color: "#ffffff",
        })
        .setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(0x4f73a3));
      btn.on("pointerout", () => btn.setFillStyle(COLOR.blue));
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
    const dim = this.add.rectangle(0, 0, w, h, COLOR.ink, 0.92).setOrigin(0, 0);

    if (passed) {
      this.state.proficiency.master(this.objectiveId);
    }

    const headline = passed ? "¡Muy bien!" : "Casi…";
    const sub = passed ? "Objective mastered." : "Try again when ready.";
    const head = this.add
      .text(w / 2, h / 2 - 70, headline, {
        fontFamily: FONT,
        fontSize: TYPE.display,
        color: passed ? COLOR.green : COLOR.rose,
      })
      .setOrigin(0.5);
    const subText = this.add
      .text(w / 2, h / 2 - 30, sub, {
        fontFamily: FONT,
        fontSize: TYPE.body,
        color: COLOR.parchment,
      })
      .setOrigin(0.5);
    const score = this.add
      .text(w / 2, h / 2 + 10, `Score: ${this.correct}/${this.quiz.length}`, {
        fontFamily: FONT,
        fontSize: TYPE.label,
        color: COLOR.goldText,
      })
      .setOrigin(0.5);

    this.layer = this.add.container(0, 0, [dim, head, subText, score]).setDepth(60);

    const back = makeButton(
      this,
      w / 2,
      h / 2 + 80,
      "Return to the valley",
      () => {
        this.scene.stop();
        this.scene.resume("WorldScene");
      },
      { width: 280, depth: 61 },
    );
    this.layer.add(back.container);

    // Keyboard still works on desktop.
    this.input.keyboard!.once("keydown-SPACE", () => {
      this.scene.stop();
      this.scene.resume("WorldScene");
    });
  }
}
