import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { MicRecorder, playAudioBytes } from "../game/voice";
import { transcribe, speak } from "../game/api";
import { ConversationSession } from "../app/ConversationSession";
import { RolePlay } from "../domain/rolePlay";
import { tierFor, tierLabel } from "../domain/friendship";
import { lessonForPhase } from "../domain/quest";
import { questById } from "../content/quests";
import { townOfNpc, townInfoOf } from "../content/world";
import {
  isTownUnlocked,
  capstonePassed,
  unlockTown,
  gradingStrictness,
} from "../domain/town";
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
  private strictness = 1;
  private quest?: import("../domain/quest").Quest;
  private questPhaseAtStart?: import("../domain/quest").QuestPhase;
  private questOutcome?: "activated" | "completed";
  private questReward = 0;

  constructor() {
    super("ConversationScene");
  }

  create(data: { npcId: string }) {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.npc = findNpc(data.npcId)!;
    this.phase = "intro";
    this.mastered = false;

    const obj = objectiveById(this.npc.teachesObjectiveId!)!;

    // Quest-giver? Choose the lesson by quest phase: future-tense plan when
    // offered, past-tense recap when reporting back. Remember which for the
    // post-conversation transition.
    this.quest = this.npc.givesQuest ? questById(this.npc.givesQuest) : undefined;
    let slug = this.npc.lessonSlug;
    if (this.quest) {
      const prog = this.state.quests.progressFor(this.quest.id);
      this.questPhaseAtStart = prog.phase;
      slug = lessonForPhase(this.quest, prog) ?? slug;
    }

    // If this NPC is tied to a lesson, run that lesson's lab as a scripted
    // role-play (NPC = role A, player = role B).
    let rolePlay: RolePlay | undefined;
    const lesson = slug ? lessonBySlug(slug) : undefined;
    if (lesson) rolePlay = new RolePlay(lesson.lab);

    // Remoter towns grade stricter.
    const town = townOfNpc(this.npc.id);
    this.strictness = town ? gradingStrictness(townInfoOf(town)) : 1;

    this.session = new ConversationSession(
      {
        npcId: this.npc.id,
        npcName: this.npc.name,
        level: obj.level,
        objectiveId: obj.id,
        canDo: obj.canDo,
        vocab: obj.vocab.map((v) => ({ es: v.es, en: v.en })),
        skill: "speaking",
        rolePlay,
        strictness: this.strictness,
      },
      this.state.adapters.conversationGrader,
      this.state.player,
    );

    this.buildUi();
    this.recordKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.input.keyboard!.on("keydown-ESC", () => this.close());

    // Safety net: always release the mic when this scene shuts down, however it
    // happens, so the mic never stays active after a conversation ends.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.recorder.release());

    if (!MicRecorder.isSupported()) {
      this.setStatus(
        "Microphone not supported here. Tap Leave to go back.",
        "#b56576",
      );
      this.phase = "done";
      return;
    }

    // Acquire the mic ONCE up front so the permission prompt doesn't interrupt
    // the press-to-talk gesture, and so we never re-prompt on later turns/NPCs.
    // (The stream is kept alive for the whole conversation; released on close.)
    void this.recorder.acquire().catch(() => {
      /* if denied/deferred, the first mic press will request it again */
    });

    void this.startConversation();
  }

  // --- UI ------------------------------------------------------------------

  private buildUi() {
    const obj = this.npc.teachesObjectiveId
      ? objectiveById(this.npc.teachesObjectiveId)
      : undefined;

    // Render from the pure, tested conversation layout. We grab the live text
    // and mic objects by id and keep updating them in place.
    const rapport = this.state.player.getState().rapport[this.npc.id]?.points ?? 0;
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

    // TAP-TO-TOGGLE mic: tap once to start recording, tap again to stop & send.
    // Far more robust on touch than press-and-hold (no hold timing, no
    // global-pointerup races, no async-startup desync).
    this.micButton.setInteractive({ useHandCursor: true });
    this.micButton.on(Phaser.Input.Events.POINTER_DOWN, () => this.onMicTap());
  }

  /** Single source of truth for a mic tap, by phase. */
  private onMicTap() {
    switch (this.phase) {
      case "awaitInput":
        void this.beginRecording();
        break;
      case "recording":
        void this.endRecordingAndSend();
        break;
      case "done":
        this.close();
        break;
      // npcSpeaking / thinking / intro: ignore taps.
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
    // The NPC always greets first with their in-character opener. (Role-play
    // sessions also advance the script to the first player cue inside begin().)
    const opener = this.npc.conversation?.opener ?? "¡Hola! ¿Cómo estás?";
    const lines = this.session.begin(opener);

    for (const line of lines) await this.npcSay(line);
    this.phase = "awaitInput";
    this.setStatus(this.turnPrompt());
  }

  /** Status prompt for the player's turn (shows the role-play goal if scripted). */
  private turnPrompt(): string {
    const goal = this.session.currentGoal;
    return goal
      ? `Your turn: ${goal}`
      : "Your turn — tap the mic and reply in Spanish.";
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
    // Keyboard SPACE mirrors the tap-to-toggle mic (press to start, press again
    // to send). Use JustDown so each key press is a single toggle.
    if (Phaser.Input.Keyboard.JustDown(this.recordKey)) this.onMicTap();
  }

  private async beginRecording() {
    if (this.phase !== "awaitInput") return;
    this.phase = "recording";
    this.feedbackText.setText("");
    this.transcriptText.setText("");
    this.setMicState(true);
    this.setStatus("🔴 Recording… tap to send.", "#b56576");
    try {
      await this.recorder.start();
    } catch {
      this.setStatus("Microphone permission denied. Tap Leave to go back.", "#b56576");
      this.setMicState(false);
      this.phase = "awaitInput";
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
        this.setStatus("I didn't catch that — tap the mic to try again.");
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
        await this.maybeAdvanceQuest();
        this.finish(true);
      } else if (outcome.complete) {
        // Completing a scripted role-play to the end is itself a success.
        await this.maybeUnlockTown();
        await this.maybeAdvanceQuest();
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

  /**
   * Advance the quest after a quest-giver conversation completes:
   *  - finished the future-tense PLAN -> activate (go do your steps)
   *  - finished the past-tense RECAP  -> complete the quest + award reward
   */
  private async maybeAdvanceQuest() {
    if (!this.quest) return;
    if (this.questPhaseAtStart === "offered" || this.questPhaseAtStart === "planning") {
      await this.state.quests.activate(this.quest.id);
      this.questOutcome = "activated";
    } else if (this.questPhaseAtStart === "recap") {
      const reward = await this.state.quests.finishRecap(this.quest);
      this.questReward = reward;
      this.questOutcome = "completed";
    }
  }

  private finish(passed: boolean) {
    this.phase = "done";
    if (this.questOutcome === "activated") {
      this.setStatus(
        "¡Buen plan! Now go do it — talk to the people you mentioned, then come back. Tap to continue.",
        "#9bc995",
      );
    } else if (this.questOutcome === "completed") {
      this.setStatus(
        `¡Bien hecho! Quest complete — +${this.questReward} pesos. Tap to continue.`,
        "#9bc995",
      );
    } else if (this.townUnlockedThisVisit) {
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
    // Release the mic when leaving the conversation — the stream is only kept
    // alive for the duration of a single chat (no re-prompt between turns).
    this.recorder.release();
    this.scene.stop();
    this.scene.resume("WorldScene");
    // If mastered, the HUD already updated via the proficiency subscription.
    void this.mastered;
  }
}
