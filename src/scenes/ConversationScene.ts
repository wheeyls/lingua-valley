import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { MicRecorder, playAudioBytes, unlockAudio } from "../game/voice";
import { transcribe, speak } from "../game/api";
import { ConversationSession } from "../app/ConversationSession";
import { tierFor, tierLabel } from "../domain/friendship";
import { townOfNpc, townInfoOf } from "../content/world";
import {
  isTownUnlocked,
  capstonePassed,
  unlockTown,
  gradingStrictness,
} from "../domain/town";
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
    const obj = objectiveById(this.npc.teachesObjectiveId!)!;

    // Set a specific theme/instruction per NPC role in the daily loop.
    const theme = this.themeForNpc();

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

    // Unlock browser audio while we're still within the user gesture that opened
    // this scene. iOS Safari expires the audio permission ~1s after a tap, but
    // TTS takes 1-3s — unlocking now means playback works when the audio arrives.
    unlockAudio();

    // --- HTML overlay UI (replaces canvas text rendering) ---
    const rapport = this.state.player.getState().rapport[this.npc.id]?.points ?? 0;
    this.view = new HtmlConversationView({
      onMicTap: () => { unlockAudio(); this.onMicTap(); },
      onLeave: () => this.close(),
      onContinue: () => this.close(),
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
      // "done" is handled by the Continue button in the HTML view — not mic tap.
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

  /** Build a role-specific theme/instruction for the LLM based on the NPC's daily role. */
  private themeForNpc(): string | undefined {
    const step = this.npc.dailyStep;
    if (step === "rosa") {
      return "A casual, friendly greeting between neighbors. Keep it very simple — ask how they are, what's new, basic small talk. Stay at the most basic beginner level.";
    }
    if (step === "marisol") {
      return (
        "You are telling the player about YOUR morning — what YOU did today. " +
        "Tell them exactly 2-3 specific, discrete things you did, using simple past tense. " +
        "For example: 'Me desperté temprano. Fui al mercado. Compré tomates.' " +
        "Use VERY simple vocabulary. Speak slowly and clearly. After telling your story, " +
        "ask if they understood: '¿Entendiste?' The player just needs to listen and " +
        "respond with simple acknowledgments like 'sí' or 'ah, ok'. " +
        "Keep your story to 2-3 short sentences about concrete actions."
      );
    }
    if (step === "pablo") {
      // Get today's story from daily state so Pablo can reference it.
      const story = this.state.player.getState().daily.todayStory;
      return (
        "You are Marisol's brother. Marisol just told the player about her morning. " +
        "Ask the player: '¿Qué hizo Marisol hoy?' (What did Marisol do today?) " +
        (story
          ? `Marisol's story was: "${story}". The player should try to retell these things. `
          : "The player should try to retell what Marisol told them. ") +
        "Prompt them through it one thing at a time. If they get stuck, give hints: " +
        "'¿Y luego?' (And then?), '¿Qué más?' (What else?), or give the first word. " +
        "Be patient and encouraging. When they've covered the main points, praise them."
      );
    }
    return undefined;
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
      // Mute the mic while playing TTS — on iOS, an active mic stream can
      // interfere with audio output and cause TTS to silently fail on turn 2+.
      this.recorder.mute();
      const bytes = await speak(text, this.npc.voice);
      await playAudioBytes(bytes);
    } catch {
      // Voice is a bonus; never block on TTS failure.
    } finally {
      this.recorder.unmute();
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

      // Mastery happens quietly in the background — it never cuts the chat
      // short. The conversation ends only when it reaches a natural wrap-up.
      if (outcome.mastered) this.mastered = true;

      await this.npcSay(outcome.npcReply);

      if (outcome.complete) {
        // If Marisol just finished, save her story so Pablo can reference it.
        if (this.npc.dailyStep === "marisol") {
          await this.saveMarisStory();
        }
        await this.maybeUnlockTown();

        this.finish();
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

  /** Extract Marisol's story from the conversation and save it for Pablo. */
  private async saveMarisStory() {
    const npcLines = this.session.history
      .filter((t) => t.role === "npc")
      .map((t) => t.text);
    const story = npcLines.join(" ");
    if (story) {
      const { setTodayStory } = await import("../domain/dailyLoop");
      await this.state.player.update((s) => ({
        ...s,
        daily: setTodayStory(s.daily, story),
      }));
    }
  }

  private finish() {
    this.phase = "done";
    let msg: string;
    let color = "#9bc995";
    if (this.townUnlockedThisVisit) {
      msg = "¡Te ganaste su confianza! The community opens — producers unlocked.";
    } else if (this.mastered) {
      msg = "¡Excelente! Great conversation — objective mastered!";
    } else {
      msg = "Good practice — come back and chat again soon!";
      color = "#f2cc8f";
    }
    // Show the end state: hides mic, shows the message + a clear Continue button.
    // This replaces the old setStatus approach so there's no surprise close-on-tap.
    this.view.showEndState(msg, color);
  }

  private close() {
    this.recorder.release();
    this.view.destroy();
    this.scene.stop();
    this.scene.resume("WorldScene");
    void this.mastered;
  }
}
