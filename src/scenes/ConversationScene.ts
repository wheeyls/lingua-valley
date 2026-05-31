import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { MicRecorder, playAudioBytes } from "../game/voice";
import { transcribe, speak } from "../game/api";
import { ConversationSession } from "../app/ConversationSession";
import { FONT, TYPE, COLOR, MARGIN, makeButton } from "../game/layout";

function findNpc(id: string): Npc | undefined {
  for (const a of AREAS) {
    const n = a.npcs.find((n) => n.id === id);
    if (n) return n;
  }
  return undefined;
}

type Phase = "intro" | "npcSpeaking" | "awaitInput" | "recording" | "thinking" | "done";

export class ConversationScene extends Phaser.Scene {
  private state!: GameState;
  private npc!: Npc;
  private session!: ConversationSession;
  private recorder = new MicRecorder();
  private phase: Phase = "intro";
  private statusText!: Phaser.GameObjects.Text;
  private transcriptText!: Phaser.GameObjects.Text;
  private npcText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private recordKey!: Phaser.Input.Keyboard.Key;
  private micButton?: Phaser.GameObjects.Arc;
  private micIcon?: Phaser.GameObjects.Text;
  private mastered = false;

  constructor() {
    super("ConversationScene");
  }

  create(data: { npcId: string }) {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.npc = findNpc(data.npcId)!;
    this.phase = "intro";
    this.mastered = false;

    const obj = objectiveById(this.npc.teachesObjectiveId!)!;
    this.session = new ConversationSession(
      {
        npcId: this.npc.id,
        level: obj.level,
        objectiveId: obj.id,
        canDo: obj.canDo,
        vocab: obj.vocab.map((v) => ({ es: v.es, en: v.en })),
        skill: "speaking",
      },
      this.state.adapters.conversationGrader,
      this.state.player,
    );

    this.buildUi();
    this.recordKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.input.keyboard!.on("keydown-ESC", () => this.close());

    if (!MicRecorder.isSupported()) {
      this.setStatus(
        "Microphone not supported here. Tap Leave to go back.",
        "#b56576",
      );
      this.phase = "done";
      return;
    }

    void this.startConversation();
  }

  // --- UI ------------------------------------------------------------------

  private buildUi() {
    const w = this.scale.width;
    const h = this.scale.height;
    const dim = this.add.rectangle(0, 0, w, h, 0x0d0a12, 0.95).setOrigin(0, 0);

    const title = this.add
      .text(w / 2, h * 0.06, this.npc.name, {
        fontFamily: FONT,
        fontSize: TYPE.title,
        color: COLOR.gold,
      })
      .setOrigin(0.5);

    const obj = this.npc.teachesObjectiveId
      ? objectiveById(this.npc.teachesObjectiveId)
      : undefined;
    const goal = this.add
      .text(w / 2, h * 0.06 + 34, obj ? obj.canDo : "", {
        fontFamily: FONT,
        fontSize: TYPE.label,
        color: COLOR.green,
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: w - MARGIN * 3 },
      })
      .setOrigin(0.5);

    // NPC speech (the big focal text).
    this.npcText = this.add
      .text(w / 2, h * 0.28, "", {
        fontFamily: FONT,
        fontSize: TYPE.title,
        color: COLOR.parchment,
        align: "center",
        wordWrap: { width: w - MARGIN * 3 },
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    // What you said (transcript).
    this.transcriptText = this.add
      .text(w / 2, h * 0.46, "", {
        fontFamily: FONT,
        fontSize: TYPE.body,
        color: COLOR.blueLight,
        align: "center",
        fontStyle: "italic",
        wordWrap: { width: w - MARGIN * 3 },
      })
      .setOrigin(0.5);

    // Feedback / corrections / pesos.
    this.feedbackText = this.add
      .text(w / 2, h * 0.56, "", {
        fontFamily: FONT,
        fontSize: TYPE.label,
        color: "#f2cc8f",
        align: "center",
        wordWrap: { width: w - MARGIN * 3 },
      })
      .setOrigin(0.5);

    // Status line just above the mic.
    this.statusText = this.add
      .text(w / 2, h * 0.68, "", {
        fontFamily: FONT,
        fontSize: TYPE.label,
        color: COLOR.goldText,
        align: "center",
        wordWrap: { width: w - MARGIN * 2 },
      })
      .setOrigin(0.5);

    // Big hold-to-talk mic button — the primary interaction. Large + central.
    const micY = h * 0.82;
    const micR = 76;
    this.micButton = this.add
      .circle(w / 2, micY, micR, COLOR.blue, 1)
      .setStrokeStyle(5, COLOR.goldNum)
      .setDepth(71)
      .setInteractive({ useHandCursor: true });
    this.micIcon = this.add
      .text(w / 2, micY, "🎤", { fontSize: "60px" })
      .setOrigin(0.5)
      .setDepth(72);

    this.micButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.phase === "awaitInput") void this.beginRecording();
      else if (this.phase === "done") this.close();
    });
    const release = () => {
      if (this.phase === "recording") void this.endRecordingAndSend();
    };
    this.micButton.on(Phaser.Input.Events.POINTER_UP, release);
    this.micButton.on(Phaser.Input.Events.POINTER_OUT, release);

    const help = this.add
      .text(w / 2, micY + micR + 24, "Hold the mic to speak · release to send", {
        fontFamily: FONT,
        fontSize: TYPE.small,
        color: COLOR.muted,
        align: "center",
        wordWrap: { width: w - MARGIN * 2 },
      })
      .setOrigin(0.5);

    this.add
      .container(0, 0, [
        dim,
        title,
        goal,
        this.npcText,
        this.transcriptText,
        this.feedbackText,
        this.statusText,
        this.micButton,
        this.micIcon,
        help,
      ])
      .setDepth(70);

    // Leave button (top-left, always reachable).
    makeButton(this, MARGIN + 56, h * 0.06, "Leave", () => this.close(), {
      width: 100,
      height: 44,
      fill: COLOR.roseFill,
      fontSize: TYPE.label,
      depth: 73,
    });
  }

  /** Reflect recording state on the mic button. */
  private setMicState(recording: boolean) {
    this.micButton?.setFillStyle(recording ? COLOR.roseFill : COLOR.blue);
    if (this.micButton) this.micButton.setScale(recording ? 1.12 : 1);
  }

  private setStatus(msg: string, color: string = COLOR.goldText) {
    this.statusText.setText(msg).setColor(color);
  }

  // --- Conversation flow ---------------------------------------------------

  private async startConversation() {
    const opener = this.npc.conversation!.opener;
    this.session.begin(opener);
    await this.npcSay(opener);
    this.phase = "awaitInput";
    this.setStatus("Your turn — hold the mic and reply in Spanish.");
  }

  /** Show + speak an NPC line. Falls back to text if TTS fails. */
  private async npcSay(text: string) {
    this.phase = "npcSpeaking";
    this.npcText.setText(text);
    this.setStatus("🔊 " + this.npc.name + " is speaking…");
    try {
      const bytes = await speak(text, this.npc.voice);
      await playAudioBytes(bytes);
    } catch {
      // Voice is a bonus; never block the gate on TTS failure.
    }
  }

  update() {
    if (this.phase === "awaitInput" && this.recordKey.isDown) {
      void this.beginRecording();
    } else if (this.phase === "recording" && this.recordKey.isUp) {
      void this.endRecordingAndSend();
    }

    if (
      this.phase === "done" &&
      Phaser.Input.Keyboard.JustDown(this.recordKey)
    ) {
      this.close();
    }
  }

  private async beginRecording() {
    this.phase = "recording";
    this.feedbackText.setText("");
    this.transcriptText.setText("");
    this.setMicState(true);
    try {
      await this.recorder.start();
      this.setStatus("🔴 Recording… release to send.", "#b56576");
    } catch {
      this.setStatus("Microphone permission denied.", "#b56576");
      this.setMicState(false);
      this.phase = "done";
    }
  }

  private async endRecordingAndSend() {
    this.phase = "thinking";
    this.setMicState(false);
    this.setStatus("Transcribing…");
    try {
      const { audioBase64, mimeType } = await this.recorder.stop();
      const utterance = await transcribe(audioBase64, mimeType);

      if (!utterance.trim()) {
        this.setStatus("I didn't catch that — hold the mic and try again.");
        this.phase = "awaitInput";
        return;
      }
      this.transcriptText.setText(`You: “${utterance}”`);
      this.setStatus(`${this.npc.name} is thinking…`);

      // The session orchestrates grading + economy via ports. The scene only
      // renders the outcome — no game rules here.
      const outcome = await this.session.submit(utterance);

      const corr =
        outcome.grade.corrections.length > 0
          ? "  (" + outcome.grade.corrections.join("; ") + ")"
          : "";
      const earned =
        outcome.applied.reward && outcome.applied.reward.pesos > 0
          ? `  +${outcome.applied.reward.pesos} pesos`
          : outcome.applied.blockedReason === "insufficient-focus"
            ? "  (out of Focus — rest until tomorrow)"
            : "";
      this.feedbackText.setText(outcome.grade.feedback + corr + earned);

      await this.npcSay(outcome.npcReply);

      if (outcome.mastered) {
        this.mastered = true;
        this.finish(true);
      } else if (outcome.complete) {
        this.finish(false);
      } else {
        this.phase = "awaitInput";
        this.setStatus("Keep going — hold the mic to reply.");
      }
    } catch (err) {
      console.error(err);
      this.setStatus(
        "Could not reach the language service. Tap Leave to go back.",
        "#b56576",
      );
      this.phase = "done";
    }
  }

  private finish(passed: boolean) {
    this.phase = "done";
    if (passed) {
      this.setStatus("¡Excelente! You demonstrated the skill. Tap to continue.", "#9bc995");
    } else {
      this.setStatus("Good practice — try again when ready. Tap to continue.", "#f2cc8f");
    }
  }

  private close() {
    this.scene.stop();
    this.scene.resume("WorldScene");
    // If mastered, the HUD already updated via the proficiency subscription.
    void this.mastered;
  }
}
