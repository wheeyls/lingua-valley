import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { MicRecorder, playAudioBytes } from "../game/voice";
import { transcribe, speak } from "../game/api";
import { ConversationSession } from "../app/ConversationSession";
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
import { HtmlConversationView } from "../ui/html/HtmlConversationView";

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
  private view!: HtmlConversationView;
  private recordKey!: Phaser.Input.Keyboard.Key;
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
    this.qualitySum = 0;
    this.qualityTurns = 0;
    this.townUnlockedThisVisit = false;
    this.questOutcome = undefined;
    this.questReward = 0;

    const obj = objectiveById(this.npc.teachesObjectiveId!)!;

    this.quest = this.npc.givesQuest ? questById(this.npc.givesQuest) : undefined;
    let slug = this.npc.lessonSlug;
    if (this.quest) {
      const prog = this.state.quests.progressFor(this.quest.id);
      this.questPhaseAtStart = prog.phase;
      slug = lessonForPhase(this.quest, prog) ?? slug;
    }

    // The lesson (if any) just sets the conversation's THEME — the LLM plays the
    // NPC freely and reacts to what the player actually says (no rigid script).
    const lesson = slug ? lessonBySlug(slug) : undefined;
    const theme = lesson?.lab?.scenario;

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
        theme,
        strictness: this.strictness,
      },
      this.state.adapters.conversationGrader,
      this.state.player,
    );

    // --- HTML overlay UI (replaces canvas text rendering) ---
    const rapport = this.state.player.getState().rapport[this.npc.id]?.points ?? 0;
    this.view = new HtmlConversationView({
      onMicTap: () => this.onMicTap(),
      onLeave: () => this.close(),
    });
    this.view.setHeader(
      this.npc.name,
      tierLabel(tierFor(rapport)),
      obj ? obj.canDo : "",
    );

    this.recordKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.on("keydown-ESC", () => this.close());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.recorder.release();
      this.view.destroy();
    });

    if (!MicRecorder.isSupported()) {
      this.view.setStatus("Microphone not supported here. Tap Leave to go back.", "#b56576");
      this.view.setMicVisible(false);
      this.phase = "done";
      return;
    }

    void this.recorder.acquire().catch(() => {});
    void this.startConversation();
  }

  // --- Mic input (tap-to-toggle) -------------------------------------------

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
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.recordKey)) this.onMicTap();
  }

  // --- Conversation flow ---------------------------------------------------

  private async startConversation() {
    const opener = this.npc.conversation?.opener ?? "¡Hola! ¿Cómo estás?";
    const lines = this.session.begin(opener);
    for (const line of lines) await this.npcSay(line);
    this.phase = "awaitInput";
    this.view.setStatus(this.turnPrompt());
  }

  private turnPrompt(): string {
    const goal = this.session.currentGoal;
    return goal
      ? `Your turn: ${goal}`
      : "Your turn — tap the mic and reply in Spanish.";
  }

  private async npcSay(text: string) {
    this.phase = "npcSpeaking";
    this.view.setNpcSpeech(text);
    this.view.setStatus("🔊 " + this.npc.name + " is speaking…");
    try {
      const bytes = await speak(text, this.npc.voice);
      await playAudioBytes(bytes);
    } catch {
      // Voice is a bonus; never block on TTS failure.
    }
  }

  private async beginRecording() {
    if (this.phase !== "awaitInput") return;
    this.phase = "recording";
    this.view.setFeedback("", "", "");
    this.view.setTranscript("");
    this.view.setMicRecording(true);
    this.view.setStatus("🔴 Recording… tap to send.", "#b56576");
    try {
      await this.recorder.start();
    } catch {
      this.view.setStatus("Microphone permission denied. Tap Leave to go back.", "#b56576");
      this.view.setMicRecording(false);
      this.phase = "awaitInput";
    }
  }

  private async endRecordingAndSend() {
    if (this.phase !== "recording") return;
    this.phase = "thinking";
    this.view.setMicRecording(false);
    this.view.setStatus("Transcribing…");
    try {
      const { audioBase64, mimeType } = await this.recorder.stop();
      const utterance = await transcribe(audioBase64, mimeType);

      if (!utterance.trim()) {
        this.view.setStatus("I didn't catch that — tap the mic to try again.");
        this.phase = "awaitInput";
        return;
      }
      this.view.setTranscript(`You: "${utterance}"`);
      this.view.setStatus(`${this.npc.name} is thinking…`);

      const outcome = await this.session.submit(utterance);

      const corr =
        outcome.grade.corrections.length > 0
          ? outcome.grade.corrections.join("; ")
          : "";
      const earned =
        outcome.applied.reward && outcome.applied.reward.pesos > 0
          ? `+${outcome.applied.reward.pesos} pesos`
          : outcome.applied.blockedReason === "insufficient-focus"
            ? "(out of Focus — rest until tomorrow)"
            : "";
      const rapport =
        outcome.applied.rapportGained && outcome.applied.rapportGained > 0
          ? `♥ +${outcome.applied.rapportGained} friendship`
          : "";
      this.view.setFeedback(
        outcome.grade.feedback,
        corr,
        [earned, rapport].filter(Boolean).join("  "),
      );

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
        await this.maybeUnlockTown();
        await this.maybeAdvanceQuest();
        this.finish(this.session.isRolePlay);
      } else {
        this.phase = "awaitInput";
        this.view.setStatus(this.turnPrompt());
      }
    } catch (err) {
      console.error(err);
      this.view.setStatus(
        "Could not reach the language service. Tap Leave to go back.",
        "#b56576",
      );
      this.phase = "done";
    }
  }

  // --- Gatekeeper / quest --------------------------------------------------

  private async maybeUnlockTown() {
    const town = townOfNpc(this.npc.id);
    if (!town?.gatekeeper || town.gatekeeper.npcId !== this.npc.id || this.qualityTurns === 0) return;
    if (isTownUnlocked(this.state.player.getState(), town.id)) return;
    const avgQuality = this.qualitySum / this.qualityTurns;
    if (capstonePassed(town.gatekeeper, avgQuality)) {
      await this.state.player.update((s) => unlockTown(s, town.id));
      this.townUnlockedThisVisit = true;
    }
  }

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
    let msg: string;
    let color = "#9bc995";
    if (this.questOutcome === "activated") {
      msg = "¡Buen plan! Now go do it — talk to the people you mentioned, then come back. Tap to continue.";
    } else if (this.questOutcome === "completed") {
      msg = `¡Bien hecho! Quest complete — +${this.questReward} pesos. Tap to continue.`;
    } else if (this.townUnlockedThisVisit) {
      msg = "¡Te ganaste su confianza! The community opens — producers unlocked. Tap to continue.";
    } else if (passed) {
      msg = "¡Excelente! You demonstrated the skill. Tap to continue.";
    } else {
      msg = "Good practice — try again when ready. Tap to continue.";
      color = "#f2cc8f";
    }
    this.view.setStatus(msg, color);
  }

  private close() {
    this.recorder.release();
    this.view.destroy();
    this.scene.stop();
    this.scene.resume("WorldScene");
    void this.mastered;
  }
}
