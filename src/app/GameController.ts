/**
 * GameController — the main application controller, the main app controller (no framework)
 * system. Coordinates the HTML world view, conversation/dialogue overlays,
 * and the domain (objectives, daily loop, player state).
 *
 * This is the composition root for the running game. Domain logic stays pure;
 * this is just wiring.
 */

import { HtmlWorldView } from "../ui/html/HtmlWorldView";
import { HtmlDialogueView, type DialogueViewData } from "../ui/html/HtmlDialogueView";
import { HtmlConversationView } from "../ui/html/HtmlConversationView";
import { blockCanvas, unblockCanvas } from "../ui/html/canvasBlock";
import { getMap } from "../content/maps";
import { AREAS } from "../content/world";
import { objectiveById as getObjective } from "../content/curriculum";
import { scaffoldingFor } from "../domain/scaffolding";
import { tierFor, tierLabel } from "../domain/friendship";
import { isDoorUnlocked, isItemVisible, type MapNpc, type MapDoor, type MapItem } from "../domain/gameMap";
import { townOfNpc, townInfoOf, type Npc } from "../content/world";
import { gradingStrictness } from "../domain/town";
import type { ObjectiveState } from "../domain/objective";
import { buildDailyGraph } from "../domain/objectives/daily";
import type { ObjectiveGraph } from "../domain/objective";
import { ConversationSession } from "./ConversationSession";
import { MicRecorder, playAudioBytes, unlockAudio } from "../game/voice";
import { transcribe, cleanTranscription, speak } from "../game/api";
import type { PlayerService } from "./PlayerService";
import type { Adapters } from "./adapters";

function findNpc(id: string): Npc | undefined {
  for (const a of AREAS) {
    const n = a.npcs.find((n) => n.id === id);
    if (n) return n;
  }
  return undefined;
}

export class GameController {
  private worldView!: HtmlWorldView;
  private currentMapId = "street";
  private objectives: ObjectiveGraph;
  private recorder = new MicRecorder();

  constructor(
    private readonly player: PlayerService,
    private readonly adapters: Adapters,
  ) {
    this.objectives = buildDailyGraph();
  }

  start() {
    this.worldView = new HtmlWorldView({
      onNpcTap: (npc) => this.onNpcTap(npc),
      onDoorTap: (door) => this.onDoorTap(door),
      onItemTap: (item) => this.onItemTap(item),
    });
    this.loadMap("street");
    // Tick the countdown every 60s so the reset timer stays current.
    setInterval(() => this.updateHudStatus(), 60_000);
  }

  private getObjState(): ObjectiveState {
    return this.player.getState().daily.objectiveState;
  }

  private loadMap(mapId: string) {
    this.currentMapId = mapId;
    this.updateHudStatus(); // renders the map with badges + HUD
  }

  /** Push daily status to the HUD + character badges. */
  private updateHudStatus() {
    const daily = this.player.getState().daily;
    const objState = daily.objectiveState;
    const now = new Date();

    const allDone = this.objectives.all().every((obj) => objState[obj.id] != null);

    // Which NPCs have had their objective completed today?
    const completedNpcIds = new Set(
      this.objectives.all()
        .filter((obj) => objState[obj.id] != null)
        .map((obj) => obj.npcId),
    );

    // Refresh the room so NPC badges update.
    const map = getMap(this.currentMapId);
    if (map) {
      this.worldView.loadMap(map, objState, completedNpcIds);
      this.worldView.updateHud(this.player.getState().pesos);
    }

    let hoursUntilReset: number | undefined;
    let minutesUntilReset: number | undefined;
    if (allDone && daily.dayStartedAt) {
      const elapsed = now.getTime() - new Date(daily.dayStartedAt).getTime();
      const remainingMs = Math.max(0, 12 * 60 * 60 * 1000 - elapsed);
      hoursUntilReset = Math.floor(remainingMs / (60 * 60 * 1000));
      minutesUntilReset = Math.ceil((remainingMs % (60 * 60 * 1000)) / 60_000);
    }

    this.worldView.updateDailyStatus({ allDone, hoursUntilReset, minutesUntilReset });
  }

  private onNpcTap(mapNpc: MapNpc) {
    const npc = findNpc(mapNpc.npcId);
    if (!npc) return;
    this.openDialogue(npc);
  }

  private onDoorTap(door: MapDoor) {
    if (!isDoorUnlocked(door, this.getObjState())) return;
    this.loadMap(door.targetMapId);
  }

  private onItemTap(item: MapItem) {
    if (!isItemVisible(item, this.getObjState())) return;
    if (item.itemId === "water-bottle") {
      this.showSuccess();
    }
  }

  // --- Dialogue (intro screen before voice conversation) --------------------

  private openDialogue(npc: Npc) {
    const line = npc.lines[0];
    if (!line) return;

    const town = townOfNpc(npc.id);
    const scaffold = scaffoldingFor(town?.englishAvailability ?? 1);
    const hasConversation = !!(npc.conversation || npc.lessonSlug || npc.givesQuest);

    const data: DialogueViewData = {
      npcName: npc.name,
      spanish: line.es,
      showSpanish: scaffold.spanishSubtitles,
      englishHint: line.en,
      showEnglishHint: scaffold.englishHints,
      lineIndex: 0,
      lineCount: 1,
      continueLabel: hasConversation ? "Talk ▶" : "Done",
      canTrade: false,
    };

    blockCanvas();
    const view = new HtmlDialogueView({
      onContinue: () => {
        view.destroy();
        unblockCanvas();
        if (hasConversation) {
          this.openConversation(npc);
        }
      },
      onLeave: () => {
        view.destroy();
        unblockCanvas();
        this.refreshWorld();
      },
    });
    view.update(data);
  }

  // --- Voice conversation ---------------------------------------------------

  private openConversation(npc: Npc) {
    const obj = getObjective(npc.teachesObjectiveId!);
    if (!obj) return;

    const objective = this.objectives.forNpc(npc.id);
    const inputs = objective
      ? this.objectives.gatherInputs(objective.id, this.getObjState())
      : {};
    const theme = objective
      ? objective.buildTheme({ inputs, state: this.getObjState() })
      : undefined;

    const town = townOfNpc(npc.id);
    const strictness = town ? gradingStrictness(townInfoOf(town)) : 1;
    const rapport = this.player.getState().rapport[npc.id]?.points ?? 0;

    const session = new ConversationSession(
      {
        npcId: npc.id,
        npcName: npc.name,
        level: obj.level,
        objectiveId: obj.id,
        canDo: obj.canDo,
        vocab: obj.vocab.map((v) => ({ es: v.es, en: v.en })),
        skill: "speaking",
        theme,
        strictness,
      },
      this.adapters.conversationGrader,
      this.player,
    );

    blockCanvas();
    unlockAudio();
    void this.recorder.acquire().catch(() => {});

    const view = new HtmlConversationView({
      onMicTap: () => { unlockAudio(); },
      onLeave: () => {
        this.recorder.release();
        view.destroy();
        unblockCanvas();
        this.completeObjective(npc, session);
        this.refreshWorld();
      },
      onContinue: () => {
        this.recorder.release();
        view.destroy();
        unblockCanvas();
        this.completeObjective(npc, session);
        this.refreshWorld();
      },
    });

    view.setHeader(npc.name, tierLabel(tierFor(rapport)), obj.canDo);

    // Start the conversation.
    const opener = npc.conversation?.opener ?? "¡Hola!";
    session.begin(opener);
    void this.npcSay(view, npc, opener).then(() => {
      view.setStatus("Your turn — tap the mic and reply in Spanish.");
    });

    // Mic tap handling — managed outside Phaser now.
    let phase: "awaitInput" | "recording" | "thinking" | "done" = "awaitInput";

    const onMicTap = async () => {
      if (phase === "awaitInput") {
        phase = "recording";
        view.setMicRecording(true);
        view.setStatus("🔴 Recording… tap to send.", "#b56576");
        view.setFeedback("", "", "");
        view.setTranscript("");
        try {
          await this.recorder.start();
        } catch {
          view.setStatus("Microphone permission denied.");
          view.setMicRecording(false);
          phase = "awaitInput";
        }
      } else if (phase === "recording") {
        phase = "thinking";
        view.setMicRecording(false);
        view.setStatus("Transcribing…");
        try {
          const { audioBase64, mimeType } = await this.recorder.stop();
          const utterance = await transcribe(audioBase64, mimeType);
          if (!utterance.trim()) {
            view.setStatus("I didn't catch that — tap the mic to try again.");
            phase = "awaitInput";
            return;
          }
          view.setStatus("Processing…");
          const lastNpc = session.history.filter((t) => t.role === "npc").pop()?.text ?? "";
          const { cleaned, corrected } = await cleanTranscription(utterance, lastNpc, obj.level);
          if (corrected && cleaned !== utterance) {
            view.setTranscript(`Heard: "${utterance}" → You meant: "${cleaned}"`);
          } else {
            view.setTranscript(`You: "${cleaned}"`);
          }
          view.setStatus(`${npc.name} is thinking…`);

          const outcome = await session.submit(cleaned);

          const corr = outcome.grade.corrections.length > 0
            ? outcome.grade.corrections.join("; ") : "";
          const earned = outcome.applied.reward && outcome.applied.reward.pesos > 0
            ? `+${outcome.applied.reward.pesos} pesos` : "";
          const rapportGain = outcome.applied.rapportGained && outcome.applied.rapportGained > 0
            ? `♥ +${outcome.applied.rapportGained} friendship` : "";
          view.setFeedback(outcome.grade.feedback, corr, [earned, rapportGain].filter(Boolean).join("  "));

          await this.npcSay(view, npc, outcome.npcReply);

          if (outcome.complete) {
            phase = "done";
            view.showEndState("Great conversation! 🎉", "#9bc995");
          } else {
            phase = "awaitInput";
            view.setStatus("Your turn — tap the mic and reply in Spanish.");
          }
        } catch (err) {
          console.error(err);
          view.setStatus("Could not reach the language service.");
          phase = "awaitInput";
        }
      }
    };

    // Wire mic tap — replace the placeholder callback.
    view.setMicVisible(MicRecorder.isSupported());
    const micBtn = document.querySelector(".mic-btn");
    micBtn?.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      unlockAudio();
      void onMicTap();
    });
  }

  private async npcSay(view: HtmlConversationView, npc: Npc, text: string) {
    view.setNpcSpeech(text);
    view.setStatus(`🔊 ${npc.name} is speaking…`);
    try {
      this.recorder.mute();
      const bytes = await speak(text, npc.voice);
      await playAudioBytes(bytes);
    } catch {
      // Voice is a bonus.
    } finally {
      this.recorder.unmute();
    }
  }

  private async completeObjective(npc: Npc, session: ConversationSession) {
    const objective = this.objectives.forNpc(npc.id);
    if (!objective) return;
    const npcLines = session.history.filter((t) => t.role === "npc").map((t) => t.text);

    const now = new Date();
    await this.player.update((s) => {
      const prevObjState = s.daily.objectiveState;
      const earns = this.objectives.earnsReward(objective.id, prevObjState);
      const newObjState = this.objectives.complete(objective.id, prevObjState, npcLines, now);
      // Set dayStartedAt on the first objective completion of the day.
      const dayStartedAt = s.daily.dayStartedAt || now.toISOString();
      return {
        ...s,
        pesos: earns ? s.pesos + objective.reward : s.pesos,
        daily: { ...s.daily, objectiveState: newObjState, dayStartedAt },
      };
    });
    // Refresh the HUD status after completing.
    this.updateHudStatus();
  }

  private refreshWorld() {
    this.updateHudStatus();
  }

  private showSuccess() {
    blockCanvas();
    const root = document.createElement("div");
    root.style.cssText = `
      position:fixed; inset:0; z-index:20;
      background:rgba(13,10,18,0.97);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      font-family:"Trebuchet MS",sans-serif; color:#f4ecd8;
      padding:24px; text-align:center;
    `;
    root.innerHTML = `
      <div style="font-size:48px; margin-bottom:12px;">🌸</div>
      <div style="font-size:28px; font-weight:bold; color:#ffe08a; margin-bottom:8px;">¡Muy bien!</div>
      <div style="font-size:20px; color:#9bc995; margin-bottom:20px;">Great practice today!</div>
      <div style="font-size:16px; color:#8a8290; margin-bottom:30px;">
        Come back later for new practice!<br>You can replay conversations anytime.
      </div>
      <button style="
        background:#4a7c59; color:#f4ecd8; border:none; border-radius:14px;
        padding:16px 40px; font-size:20px; font-weight:bold; cursor:pointer;
        font-family:inherit;
      ">Continue ▶</button>
    `;
    root.querySelector("button")!.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      root.remove();
      unblockCanvas();
    });
    document.body.appendChild(root);
  }
}
