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
import { hasHarvest, MAX_GROWTH } from "../domain/field";
import { hasTicketTo } from "../domain/inventory";
import { hoursUntilNextDay } from "../domain/dailyLoop";
import type { ApplyResult } from "../domain/player";
import { ConversationSession } from "./ConversationSession";
import { MicRecorder, playAudioBytes, unlockAudio } from "../game/voice";
import { transcribe, cleanTranscription, speak } from "../game/api";
import type { PlayerService } from "./PlayerService";
import type { Adapters } from "./adapters";

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

    // On the hub, show each location's "who's left to talk to" status so the
    // player doesn't have to enter a house to check.
    this.worldView.setDoorStatus(
      this.currentMapId === HUB_MAP_ID ? this.hubDoorStatus(objState) : {},
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

  /**
   * Per-location status for the hub doors: how many people inside still have
   * something to do today. Keyed by door id (`<locationId>-door`).
   */
  private hubDoorStatus(objState: ReturnType<PlayerService["getState"]>["daily"]["objectiveState"]) {
    const status: Record<string, { hint: string; done: boolean }> = {};
    for (const loc of CURRENT_AREA.locations) {
      const total = loc.npcIds.length;
      const done = loc.npcIds.filter((npcId) => {
        const obj = this.objectives.forNpc(npcId);
        return obj != null && objState[obj.id] != null;
      }).length;
      const remaining = total - done;

      let hint: string;
      if (done >= total) {
        hint = total > 1 ? "All done today ✓" : "Done today ✓";
      } else if (done === 0) {
        hint = total > 1 ? `${total} people to talk to` : "Tap to talk";
      } else {
        hint = `${remaining} of ${total} left`;
      }
      status[`${loc.id}-door`] = { hint, done: done >= total };
    }
    return status;
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
      this.toast("🌻 Ready! Take it to Doña Tienda's store to sell it.");
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
    void this.buyTicket(area.nextAreaId, area.ticketPrice);
  }

  private async buyTicket(areaId: string, price: number) {
    const result = await this.player.performAction({
      type: "buy-ticket",
      areaId,
      price,
    });
    if (result.ok) {
      this.toast("🚂 Ticket bought! The next town awaits.");
    } else if (result.reason === "insufficient-funds") {
      this.toast(`A ticket costs ${price} 💰. Sell more crops to afford it!`);
    } else if (result.reason === "already-owned") {
      this.toast("You already have your ticket. ¡Buen viaje!");
    } else {
      this.toast("Couldn't buy the ticket — try again.");
    }
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
        cropTheme: lesson.id,
        extractOutputs: (npcLines) => objective.extractOutputs(npcLines),
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
        this.afterConversation(objective.role, lastApplied);
        this.render();
      },
    });

    // The most recent authoritative result, used for end-of-chat toasts.
    let lastApplied: ApplyResult | null = null;

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
          lastApplied = outcome.applied;

          const corr =
            outcome.grade.corrections.length > 0 ? outcome.grade.corrections.join("; ") : "";
          // Money only comes from selling at the store; show sale + growth here.
          const sold =
            outcome.applied.soldValue > 0 ? `+${outcome.applied.soldValue} 💰` : "";
          const grew = outcome.applied.grown > 0 ? "💧 Your crop grew!" : "";
          view.setFeedback(outcome.grade.feedback, corr, [sold, grew].filter(Boolean).join("  "));

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
   * End-of-conversation feedback. The field/money/objective side-effects already
   * happened authoritatively inside `applyActivity` (so they persist server-side);
   * here we only surface what changed and re-render.
   */
  private afterConversation(role: string, applied: ApplyResult | null) {
    const s = this.player.getState();
    if (!applied) return;

    if (applied.planted) {
      this.toast("🌱 Seeds planted! Do your daily practice at La Plaza to grow them.");
    } else if (applied.sold > 0) {
      this.toast(`🛒 Sold for ${applied.soldValue} 💰! Save up for a train ticket.`);
    } else if (role === "water" && applied.grown > 0) {
      this.toast(
        hasHarvest(s.field)
          ? "🌻 Your crop is fully grown — sell it at the store!"
          : "💧 Nice retelling! Your crop grew a step.",
      );
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
