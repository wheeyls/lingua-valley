/**
 * GameController — the running game's composition root (no framework).
 *
 * Coordinates the HTML world view, conversation/dialogue overlays, and the pure
 * domain (the farming loop: field, daily gate, money, inventory). Domain logic
 * stays pure; this is wiring + presentation.
 *
 * The loop:
 *   - Seedsman conversation → plant a crop in your field.
 *   - Waterkeeper conversation (daily) → water the field, crops grow +1.
 *   - At full growth, the Shopkeeper conversation → sell the crop for money.
 *   - The Station → spend money on a train ticket to the next area.
 */

import { HtmlWorldView } from "../ui/html/HtmlWorldView";
import { HtmlDialogueView, type DialogueViewData } from "../ui/html/HtmlDialogueView";
import { HtmlConversationView } from "../ui/html/HtmlConversationView";
import { blockCanvas, unblockCanvas } from "../ui/html/canvasBlock";
import { getMap, HUB_MAP_ID } from "../content/maps";
import { findNpc, CURRENT_AREA, type Npc } from "../content/world";
import { CURRENT_LESSON } from "../content/lessons";
import type { MapNpc, MapDoor } from "../domain/gameMap";
import { buildDailyGraph } from "../domain/objectives/daily";
import type { ObjectiveGraph } from "../domain/objective";
import {
  hasEmptySlot,
  hasHarvest,
  harvest,
  readySlots,
  plantSeed,
  MAX_GROWTH,
} from "../domain/field";
import { add as addItem, ticketId, hasTicketTo } from "../domain/inventory";
import { hoursUntilNextDay } from "../domain/dailyLoop";
import { ConversationSession } from "./ConversationSession";
import { MicRecorder, playAudioBytes, unlockAudio } from "../game/voice";
import { transcribe, cleanTranscription, speak } from "../game/api";
import type { PlayerService } from "./PlayerService";
import type { Adapters } from "./adapters";

/** Money paid per harvested crop sold at the store. */
const CROP_VALUE = 25;

export class GameController {
  private worldView!: HtmlWorldView;
  private objectives: ObjectiveGraph;
  private recorder = new MicRecorder();
  /** Which map is on screen: the hub, or a location room. */
  private currentMapId = HUB_MAP_ID;

  constructor(
    private readonly player: PlayerService,
    private readonly adapters: Adapters,
  ) {
    this.objectives = buildDailyGraph(CURRENT_LESSON);
  }

  start() {
    this.worldView = new HtmlWorldView({
      onNpcTap: (npc) => this.onNpcTap(npc),
      onDoorTap: (door) => this.onDoorTap(door),
      onItemTap: () => {},
    });

    const user = this.adapters.auth.current();
    this.worldView.setUser(user.displayName, () => {
      void this.adapters.auth.signOut().then(() => window.location.reload());
    });

    this.render();
    // Keep the reset countdown fresh.
    setInterval(() => this.render(), 60_000);
  }

  // --- Rendering ------------------------------------------------------------

  private render() {
    const state = this.player.getState();
    const objState = state.daily.objectiveState;

    // Which NPCs have been talked to (reward claimed) today?
    const completedNpcIds = new Set(
      this.objectives
        .all()
        .filter((obj) => objState[obj.id] != null)
        .map((obj) => obj.npcId),
    );

    const map = getMap(this.currentMapId) ?? getMap(HUB_MAP_ID)!;
    this.worldView.loadMap(map, objState, completedNpcIds);
    this.worldView.updateHud(state.money);

    // The live field + station cards only live on the hub.
    this.worldView.setExtraCards(
      this.currentMapId === HUB_MAP_ID
        ? [this.fieldCard(), this.stationCard()]
        : [],
    );

    const now = new Date();
    const hours = hoursUntilNextDay(state.daily, now);
    const allClaimed = this.objectives
      .all()
      .every((obj) => objState[obj.id] != null);
    this.worldView.updateDailyStatus({
      allDone: allClaimed,
      hoursUntilReset: hours,
    });
  }

  // --- Navigation -----------------------------------------------------------

  private onDoorTap(door: MapDoor) {
    this.currentMapId = door.targetMapId;
    this.render();
  }

  private fieldCard() {
    const field = this.player.getState().field;
    const crop = field.slots[0];
    let icon = "🟫";
    let label = "Your field";
    let hint = "Empty — get seeds from the farm";

    if (crop) {
      const bars = "🌱".repeat(Math.max(1, crop.growth)) || "🌱";
      if (crop.growth >= MAX_GROWTH) {
        icon = "🌻";
        label = "Ready to harvest!";
        hint = "Tap to harvest, then sell at the store";
      } else {
        icon = crop.growth >= 3 ? "🌿" : "🌱";
        label = `Growing (${crop.growth}/${MAX_GROWTH})`;
        hint = `${bars} — water daily to grow`;
      }
    }

    return {
      id: "field",
      icon,
      label,
      hint,
      onTap: () => this.onFieldTap(),
    };
  }

  private stationCard() {
    const state = this.player.getState();
    const area = CURRENT_AREA;
    const owned = area.nextAreaId ? hasTicketTo(state.inventory, area.nextAreaId) : false;
    const canAfford = state.money >= area.ticketPrice;

    let hint: string;
    if (!area.nextAreaId) hint = "End of the line";
    else if (owned) hint = "Ticket bought! ✓";
    else if (canAfford) hint = `Tap to buy a ticket (${area.ticketPrice} 💰)`;
    else hint = `Need ${area.ticketPrice} 💰 for a ticket`;

    return {
      id: "station",
      icon: "🚂",
      label: "Train station",
      hint,
      onTap: () => this.onStationTap(),
    };
  }

  // --- Field interactions ---------------------------------------------------

  private onFieldTap() {
    const field = this.player.getState().field;
    const crop = field.slots[0];

    if (crop && crop.growth >= MAX_GROWTH) {
      // Harvest is automatic; selling happens at the store.
      void this.harvestField();
      return;
    }
    if (!crop) {
      this.toast("Visit the seed farm to get seeds to plant.");
      return;
    }
    this.toast(
      `Your crop is growing (${crop.growth}/${MAX_GROWTH}). Do your daily practice at La Plaza to water it.`,
    );
  }

  private async harvestField() {
    await this.player.update((s) => {
      const res = harvest(s.field);
      return { ...s, field: res.field };
    });
    this.toast("Harvested! Take it to Doña Tienda's store to sell. 🌻");
    this.render();
  }

  // --- Station --------------------------------------------------------------

  private onStationTap() {
    const area = CURRENT_AREA;
    if (!area.nextAreaId) {
      this.toast("This is the last town for now — more on the way!");
      return;
    }
    const state = this.player.getState();
    if (hasTicketTo(state.inventory, area.nextAreaId)) {
      this.toast("You already have your ticket. ¡Buen viaje!");
      return;
    }
    if (state.money < area.ticketPrice) {
      this.toast(`A ticket costs ${area.ticketPrice} 💰. Sell more crops to afford it!`);
      return;
    }
    void this.player.update((s) => ({
      ...s,
      money: s.money - area.ticketPrice,
      inventory: addItem(s.inventory, ticketId(area.nextAreaId!)),
    }));
    this.toast("🚂 Ticket bought! The next town awaits.");
    this.render();
  }

  // --- NPC dialogue + conversation ------------------------------------------

  private onNpcTap(mapNpc: MapNpc) {
    const npc = findNpc(mapNpc.npcId);
    if (!npc) return;
    this.openDialogue(npc);
  }

  private openDialogue(npc: Npc) {
    const line = npc.lines[0];
    if (!line) return;

    const data: DialogueViewData = {
      npcName: npc.name,
      spanish: line.es,
      showSpanish: true,
      englishHint: line.en,
      showEnglishHint: true,
      lineIndex: 0,
      lineCount: 1,
      continueLabel: "Talk ▶",
      canTrade: false,
    };

    blockCanvas();
    const view = new HtmlDialogueView({
      onContinue: () => {
        view.destroy();
        unblockCanvas();
        this.openConversation(npc);
      },
      onLeave: () => {
        view.destroy();
        unblockCanvas();
        this.render();
      },
    });
    view.update(data);
  }

  private openConversation(npc: Npc) {
    const objective = this.objectives.forNpc(npc.id);
    if (!objective) return;
    const lesson = CURRENT_LESSON;

    const inputs = this.objectives.gatherInputs(
      objective.id,
      this.player.getState().daily.objectiveState,
    );
    const theme = objective.buildTheme({
      inputs,
      state: this.player.getState().daily.objectiveState,
    });

    const session = new ConversationSession(
      {
        npcId: npc.id,
        npcName: npc.name,
        level: lesson.level,
        objectiveId: objective.id,
        role: objective.role,
        canDo: lesson.canDo,
        vocab: lesson.vocab.map((v) => ({ es: v.es, en: v.en })),
        theme,
      },
      this.adapters.conversationGrader,
      this.player,
    );

    blockCanvas();
    unlockAudio();
    void this.recorder.acquire().catch(() => {});

    const view = new HtmlConversationView({
      onMicTap: () => unlockAudio(),
      onLeave: () => {
        // Left early — no completion, no progress.
        this.recorder.release();
        view.destroy();
        unblockCanvas();
        this.render();
      },
      onContinue: () => {
        this.recorder.release();
        view.destroy();
        unblockCanvas();
        void this.completeObjective(npc, session, grewThisConversation);
      },
    });

    // Track whether the field grew at any point during this conversation.
    let grewThisConversation = false;

    view.setHeader(npc.name, "", lesson.canDo);

    const opener = npc.conversation.opener;
    session.begin(opener);
    void this.npcSay(view, npc, opener).then(() => {
      view.setStatus("Your turn — tap the mic and reply in Spanish.");
    });

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
          const { cleaned, corrected } = await cleanTranscription(utterance, lastNpc, lesson.level);
          if (corrected && cleaned !== utterance) {
            view.setTranscript(`Heard: "${utterance}" → You meant: "${cleaned}"`);
          } else {
            view.setTranscript(`You: "${cleaned}"`);
          }
          view.setStatus(`${npc.name} is thinking…`);

          const outcome = await session.submit(cleaned);

          const corr =
            outcome.grade.corrections.length > 0 ? outcome.grade.corrections.join("; ") : "";
          const earned =
            outcome.applied.earnedReward && outcome.applied.reward.money > 0
              ? `+${outcome.applied.reward.money} 💰`
              : "";
          if (outcome.applied.grown > 0) grewThisConversation = true;
          const grew = outcome.applied.grown > 0 ? "💧 Your crop grew!" : "";
          view.setFeedback(outcome.grade.feedback, corr, [earned, grew].filter(Boolean).join("  "));

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

  /**
   * Record that the player completed an NPC's conversation today, then apply the
   * role's side effect on the field/inventory (plant on seeds, sell on store).
   */
  private async completeObjective(
    npc: Npc,
    session: ConversationSession,
    grew: boolean,
  ) {
    const objective = this.objectives.forNpc(npc.id);
    if (!objective) {
      this.render();
      return;
    }

    const alreadyDone = this.objectives.isComplete(
      objective.id,
      this.player.getState().daily.objectiveState,
    );

    const npcLines = session.history.filter((t) => t.role === "npc").map((t) => t.text);
    const now = new Date();

    await this.player.update((s) => {
      let next = s;

      // Mark the objective complete in the daily objective state (for badges/gating).
      if (!alreadyDone) {
        const newObjState = this.objectives.complete(
          objective.id,
          s.daily.objectiveState,
          npcLines,
          now,
        );
        next = {
          ...next,
          daily: {
            ...next.daily,
            objectiveState: newObjState,
            dayStartedAt: next.daily.dayStartedAt || now.toISOString(),
          },
        };
      }

      // Role side-effects (only the first completion per role per day matters).
      if (!alreadyDone) {
        if (objective.role === "seeds") {
          next = this.applySeeds(next, now);
        } else if (objective.role === "store") {
          next = this.applyStore(next);
        }
      }
      return next;
    });

    this.afterConversation(objective.role, grew);
    this.render();
  }

  /** Planting: if there's room, plant a crop with this week's theme. */
  private applySeeds(s: ReturnType<PlayerService["getState"]>, now: Date) {
    if (!hasEmptySlot(s.field)) return s;
    return {
      ...s,
      field: plantSeed(s.field, CURRENT_LESSON.id, now.toISOString().slice(0, 10)),
    };
  }

  /** Selling: harvest any ready crops and pay out money for each. */
  private applyStore(s: ReturnType<PlayerService["getState"]>) {
    const ready = readySlots(s.field);
    if (ready.length === 0) return s;
    const res = harvest(s.field);
    const payout = res.harvested.length * CROP_VALUE;
    return { ...s, field: res.field, money: s.money + payout };
  }

  private afterConversation(role: string, grew: boolean) {
    const s = this.player.getState();
    if (role === "seeds" && s.field.slots[0]) {
      this.toast("🌱 Seeds planted! Do your daily practice at La Plaza to grow them.");
    } else if (role === "store") {
      this.toast("🛒 Sold! Money added. Save up for a train ticket. 💰");
    } else if (role === "water") {
      if (grew) {
        this.toast(
          hasHarvest(s.field)
            ? "🌻 Your crop is fully grown — sell it at the store!"
            : "💧 Nice retelling! Your crop grew a step.",
        );
      }
    }
  }

  // --- Small toast overlay --------------------------------------------------

  private toast(message: string) {
    const el = document.createElement("div");
    el.style.cssText = `
      position:fixed; left:50%; bottom:24px; transform:translateX(-50%);
      z-index:30; max-width:90%; background:rgba(20,16,28,0.96); color:#f4ecd8;
      border:1px solid #4a7c59; border-radius:12px; padding:12px 18px;
      font-family:"Trebuchet MS",sans-serif; font-size:15px; text-align:center;
      box-shadow:0 6px 24px rgba(0,0,0,0.4);
    `;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}
