import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { MicRecorder, playAudioBytes } from "../game/voice";
import { transcribe, speak } from "../game/api";
import { ConversationSession } from "../app/ConversationSession";

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
        "Microphone not supported in this browser. Press ESC to leave.",
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
    const dim = this.add.rectangle(0, 0, w, h, 0x0d0a12, 0.92).setOrigin(0, 0);

    const title = this.add
      .text(w / 2, 36, `Conversation · ${this.npc.name}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: "#ffe08a",
      })
      .setOrigin(0.5);

    const obj = this.npc.teachesObjectiveId
      ? objectiveById(this.npc.teachesObjectiveId)
      : undefined;
    const goal = this.add
      .text(w / 2, 68, obj ? `Goal: ${obj.canDo}` : "", {
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        color: "#9bc995",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.npcText = this.add
      .text(w / 2, 150, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: "#f4ecd8",
        align: "center",
        wordWrap: { width: w - 160 },
      })
      .setOrigin(0.5);

    this.transcriptText = this.add
      .text(w / 2, 250, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        color: "#9ec5ff",
        align: "center",
        fontStyle: "italic",
        wordWrap: { width: w - 200 },
      })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(w / 2, 330, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
        color: "#f2cc8f",
        align: "center",
        wordWrap: { width: w - 200 },
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(w / 2, h - 70, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        color: "#d9b08c",
        align: "center",
      })
      .setOrigin(0.5);

    const help = this.add
      .text(w / 2, h - 30, "Hold [SPACE] to speak · release to send · [ESC] leave", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#8a8290",
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
        help,
      ])
      .setDepth(70);
  }

  private setStatus(msg: string, color = "#d9b08c") {
    this.statusText.setText(msg).setColor(color);
  }

  // --- Conversation flow ---------------------------------------------------

  private async startConversation() {
    const opener = this.npc.conversation!.opener;
    this.session.begin(opener);
    await this.npcSay(opener);
    this.phase = "awaitInput";
    this.setStatus("Your turn — hold SPACE and reply in Spanish.");
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
    try {
      await this.recorder.start();
      this.setStatus("🔴 Recording… release SPACE when done.", "#b56576");
    } catch {
      this.setStatus("Microphone permission denied. Press ESC.", "#b56576");
      this.phase = "done";
    }
  }

  private async endRecordingAndSend() {
    this.phase = "thinking";
    this.setStatus("Transcribing…");
    try {
      const { audioBase64, mimeType } = await this.recorder.stop();
      const utterance = await transcribe(audioBase64, mimeType);

      if (!utterance.trim()) {
        this.setStatus("I didn't catch that — hold SPACE and try again.");
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
        this.setStatus("Keep going — hold SPACE to reply.");
      }
    } catch (err) {
      console.error(err);
      this.setStatus(
        "Something went wrong reaching the language service. Press ESC.",
        "#b56576",
      );
      this.phase = "done";
    }
  }

  private finish(passed: boolean) {
    this.phase = "done";
    if (passed) {
      this.setStatus("¡Excelente! You demonstrated the skill. [SPACE] to continue.", "#9bc995");
    } else {
      this.setStatus("Good practice — try again when ready. [SPACE] to continue.", "#f2cc8f");
    }
  }

  private close() {
    this.scene.stop();
    this.scene.resume("WorldScene");
    // If mastered, the HUD already updated via the proficiency subscription.
    void this.mastered;
  }
}
