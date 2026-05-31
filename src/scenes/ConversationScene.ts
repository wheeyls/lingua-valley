import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { MicRecorder, playAudioBytes } from "../game/voice";
import { transcribe, speak } from "../game/api";
import { ConversationSession } from "../app/ConversationSession";
import { RolePlay } from "../domain/rolePlay";
import { HoldToTalk, type HoldAction } from "../domain/holdToTalk";
import { tierFor, tierLabel } from "../domain/friendship";
import { townOfNpc } from "../content/world";
import { isTownUnlocked, capstonePassed, unlockTown } from "../domain/town";
import { lessonBySlug } from "../content/lessons";
import { COLOR } from "../game/layout";
import { conversationLayout } from "../ui/layouts/conversation";
import { renderNodes } from "../ui/PhaserRenderer";

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
  private mastered = false;

  // Running average quality across the conversation (for gatekeeper capstones).
  private qualitySum = 0;
  private qualityTurns = 0;
  private townUnlockedThisVisit = false;

  // Press-and-hold state machine (pure, tested). Robust to async mic startup
  // and touch jitter.
  private hold!: HoldToTalk;

  constructor() {
    super("ConversationScene");
  }

  create(data: { npcId: string }) {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.npc = findNpc(data.npcId)!;
    this.phase = "intro";
    this.mastered = false;
    this.hold = new HoldToTalk({ minHoldMs: 250, now: () => this.time.now });

    const obj = objectiveById(this.npc.teachesObjectiveId!)!;

    // If this NPC is tied to a lesson, run that lesson's lab as a scripted
    // role-play (NPC = role A, player = role B).
    let rolePlay: RolePlay | undefined;
    const lesson = this.npc.lessonSlug ? lessonBySlug(this.npc.lessonSlug) : undefined;
    if (lesson) rolePlay = new RolePlay(lesson.lab);

    this.session = new ConversationSession(
      {
        npcId: this.npc.id,
        level: obj.level,
        objectiveId: obj.id,
        canDo: obj.canDo,
        vocab: obj.vocab.map((v) => ({ es: v.es, en: v.en })),
        skill: "speaking",
        rolePlay,
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
    const obj = this.npc.teachesObjectiveId
      ? objectiveById(this.npc.teachesObjectiveId)
      : undefined;

    // Render from the pure, tested conversation layout. We grab the live text
    // and mic objects by id and keep updating them in place.
    const rapport = this.state.player.getState().rapport[this.npc.id] ?? 0;
    const nodes = conversationLayout({
      npcName: this.npc.name,
      friendship: tierLabel(tierFor(rapport)),
      goal: obj ? obj.canDo : "",
      npcSpeech: "",
      transcript: "",
      feedback: "",
      status: "",
      statusColor: COLOR.goldText,
      recording: false,
    });
    const ui = renderNodes(this, nodes, { leave: () => this.close() });

    this.npcText = ui.byId.get("npcSpeech") as Phaser.GameObjects.Text;
    this.transcriptText = ui.byId.get("transcript") as Phaser.GameObjects.Text;
    this.feedbackText = ui.byId.get("feedback") as Phaser.GameObjects.Text;
    this.statusText = ui.byId.get("status") as Phaser.GameObjects.Text;
    this.micButton = ui.byId.get("micButton") as Phaser.GameObjects.Arc;

    // Press-and-hold on the mic. Press starts; release (anywhere) sends.
    // NOTE: we intentionally do NOT use POINTER_OUT — finger jitter must not end
    // a hold — and we listen for release on the global input so a finger that
    // drifts off the button still ends the recording.
    this.micButton.setInteractive({ useHandCursor: true });
    this.micButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.phase === "done") {
        this.close();
        return;
      }
      this.onHoldStart();
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => this.onHoldEnd());
  }

  /** Begin a press-and-hold. */
  private onHoldStart() {
    if (this.phase !== "awaitInput") return;
    this.applyHoldAction(this.hold.press());
  }

  /** End a press-and-hold (from button or global pointerup / key up). */
  private onHoldEnd() {
    this.applyHoldAction(this.hold.release());
  }

  /** Translate a HoldToTalk decision into scene actions. */
  private applyHoldAction(action: HoldAction) {
    switch (action) {
      case "begin-recording":
        void this.beginRecording();
        break;
      case "send":
        void this.endRecordingAndSend();
        break;
      case "cancel":
        this.cancelRecording();
        break;
      case "none":
        break;
    }
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
    // Role-play NPCs return their scripted opening line(s); free-form gates use
    // the NPC's `conversation.opener`.
    const lines = this.session.isRolePlay
      ? this.session.begin()
      : this.session.begin(this.npc.conversation?.opener ?? "¡Hola!");

    for (const line of lines) await this.npcSay(line);
    this.phase = "awaitInput";
    this.setStatus(this.turnPrompt());
  }

  /** Status prompt for the player's turn (shows the role-play goal if scripted). */
  private turnPrompt(): string {
    const goal = this.session.currentGoal;
    return goal
      ? `Your turn: ${goal}`
      : "Your turn — hold the mic and reply in Spanish.";
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
    // Keyboard SPACE acts as a press-and-hold, mirroring the mic button.
    if (this.phase === "done") {
      if (Phaser.Input.Keyboard.JustDown(this.recordKey)) this.close();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.recordKey)) {
      this.onHoldStart();
    } else if (Phaser.Input.Keyboard.JustUp(this.recordKey)) {
      this.onHoldEnd();
    }
  }

  private async beginRecording() {
    this.phase = "recording";
    this.feedbackText.setText("");
    this.transcriptText.setText("");
    this.setMicState(true);
    this.setStatus("🔴 Recording… release to send.", "#b56576");
    try {
      await this.recorder.start();
      // Mic is live. If the user already released during startup, this resolves
      // to send/cancel; otherwise it waits for release.
      this.applyHoldAction(this.hold.startResolved());
    } catch {
      this.hold.reset();
      this.setStatus("Microphone permission denied.", "#b56576");
      this.setMicState(false);
      this.phase = "done";
    }
  }

  /** Abort a recording without sending (too-short hold / cancel). */
  private cancelRecording() {
    this.setMicState(false);
    if (this.phase === "recording") {
      this.phase = "awaitInput";
      this.setStatus(this.turnPrompt());
      // Best-effort: stop the mic stream if it started.
      void this.recorder.stop().catch(() => {});
    }
  }

  private async endRecordingAndSend() {
    if (this.phase !== "recording") return; // guard against double-fire
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
      const rapport =
        outcome.applied.rapportGained && outcome.applied.rapportGained > 0
          ? `  ♥ +${outcome.applied.rapportGained} friendship`
          : "";
      this.feedbackText.setText(outcome.grade.feedback + corr + earned + rapport);

      // Track quality for gatekeeper capstones (0.6 communication / 0.4 accuracy).
      this.qualitySum +=
        0.6 * outcome.grade.communication + 0.4 * outcome.grade.accuracy;
      this.qualityTurns += 1;

      await this.npcSay(outcome.npcReply);

      if (outcome.mastered) {
        this.mastered = true;
        await this.maybeUnlockTown();
        this.finish(true);
      } else if (outcome.complete) {
        // Completing a scripted role-play to the end is itself a success.
        await this.maybeUnlockTown();
        this.finish(this.session.isRolePlay);
      } else {
        this.phase = "awaitInput";
        this.setStatus(this.turnPrompt());
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

  /**
   * If this NPC is a town's gatekeeper and the player cleared the capstone
   * quality bar, unlock the town's producers.
   */
  private async maybeUnlockTown() {
    const town = townOfNpc(this.npc.id);
    if (
      !town?.gatekeeper ||
      town.gatekeeper.npcId !== this.npc.id ||
      this.qualityTurns === 0
    ) {
      return;
    }
    if (isTownUnlocked(this.state.player.getState(), town.id)) return;

    const avgQuality = this.qualitySum / this.qualityTurns;
    if (capstonePassed(town.gatekeeper, avgQuality)) {
      await this.state.player.update((s) => unlockTown(s, town.id));
      this.townUnlockedThisVisit = true;
    }
  }

  private finish(passed: boolean) {
    this.phase = "done";
    if (this.townUnlockedThisVisit) {
      this.setStatus(
        "¡Te ganaste su confianza! The community opens — producers unlocked. Tap to continue.",
        "#9bc995",
      );
    } else if (passed) {
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
