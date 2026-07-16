/**
 * GameController — the running game's composition root (no framework).
 *
 * Coordinates the HTML world view, conversation/dialogue overlays, and the pure
 * domain (the farming loop: field, daily gate, money, inventory). Domain logic
 * stays pure; this is wiring + presentation.
 *
 * The loop:
 *   - Don Semilla (seeds) → plant a new 7-day garden row.
 *   - La Plaza (water, daily) → bloom today's plant; a skipped day withers it.
 *   - Doña Tienda (store) → a graded review that pays money.
 */

import { HtmlWorldView } from "../ui/html/HtmlWorldView";
import { HtmlDialogueView, type DialogueViewData } from "../ui/html/HtmlDialogueView";
import { HtmlConversationView } from "../ui/html/HtmlConversationView";
import { HtmlDevPanel } from "../ui/html/HtmlDevPanel";
import { blockCanvas, unblockCanvas } from "../ui/html/canvasBlock";
import { getMap, HUB_MAP_ID } from "../content/maps";
import { findNpc, visibleLocations, type Npc } from "../content/world";
import { CURRENT_LESSON } from "../content/lessons";
import type { MapNpc, MapDoor } from "../domain/gameMap";
import { buildDailyGraph } from "../domain/objectives/daily";
import type { ObjectiveGraph } from "../domain/objective";
import { grid, needsSeed, bloomsThisRow, ROW_LENGTH, type CellState } from "../domain/garden";
import { hoursUntilNextDay, type DailyRole } from "../domain/dailyLoop";
import { settleDailyState, type ApplyResult } from "../domain/player";
import { appDay } from "../domain/time";
import { ConversationSession } from "./ConversationSession";
import type { PlayerService } from "./PlayerService";
import type { Adapters } from "./adapters";

export class GameController {
  private worldView!: HtmlWorldView;
  private objectives: ObjectiveGraph;
  /** Which map is on screen: the hub, or a location room. */
  private currentMapId = HUB_MAP_ID;
  private devPanel?: HtmlDevPanel;

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

    if (this.adapters.fakes) this.setupDevPanel();

    this.render();
    // Keep the reset countdown fresh.
    setInterval(() => this.render(), 60_000);
  }

  // --- Rendering ------------------------------------------------------------

  private render() {
    const state = this.player.getState();
    const objState = state.daily.objectiveState;

    const visibleNpcIds = new Set(visibleLocations().flatMap((loc) => loc.npcIds));
    const activeObjectives = this.objectives
      .all()
      .filter((obj) => visibleNpcIds.has(obj.npcId));

    // Which NPCs have been talked to (reward claimed) today?
    const completedNpcIds = new Set(
      activeObjectives.filter((obj) => objState[obj.id] != null).map((obj) => obj.npcId),
    );

    const map = getMap(this.currentMapId) ?? getMap(HUB_MAP_ID)!;
    this.worldView.loadMap(map, objState, completedNpcIds);
    this.worldView.updateHud(state.money);

    this.worldView.setExtraCards(
      this.currentMapId === HUB_MAP_ID ? [this.gardenCard()] : [],
    );

    // On the hub, show each location's "who's left to talk to" status so the
    // player doesn't have to enter a house to check.
    this.worldView.setDoorStatus(
      this.currentMapId === HUB_MAP_ID ? this.hubDoorStatus(objState) : {},
    );

    const now = new Date();
    const hours = hoursUntilNextDay(state.daily, now);
    const allClaimed = activeObjectives.every((obj) => objState[obj.id] != null);
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
    for (const loc of visibleLocations()) {
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

  private gardenCard() {
    const field = this.player.getState().field;
    const today = appDay(this.adapters.clock.now());
    const cells = grid(field, today).map((row) => row.map(cellEmoji));
    const hint = needsSeed(field, today)
      ? field.rows.length === 0
        ? "Get seed from Don Semilla to plant your first row"
        : "Row done! Get seed from Don Semilla for the next row"
      : `${bloomsThisRow(field, today)}/${ROW_LENGTH} bloomed — water daily at La Plaza`;

    return {
      id: "field",
      icon: "🌱",
      label: "Your garden",
      hint,
      grid: cells,
      onTap: () => this.onGardenTap(),
    };
  }

  // --- Garden interactions --------------------------------------------------

  private onGardenTap() {
    const field = this.player.getState().field;
    const today = appDay(this.adapters.clock.now());
    if (needsSeed(field, today)) {
      this.toast(
        field.rows.length === 0
          ? "🌱 Visit Don Semilla at the seed farm to plant your first row."
          : "🌱 This week's row is complete — get seed from Don Semilla for the next one.",
      );
      return;
    }
    this.toast(
      `💧 ${bloomsThisRow(field, today)}/${ROW_LENGTH} plants bloomed this week. Water daily at La Plaza to keep your streak alive.`,
    );
  }

  // --- Dev harness (fakes only) ---------------------------------------------

  private setupDevPanel() {
    this.devPanel = new HtmlDevPanel({
      onSeeds: () => void this.devComplete("seeds-intro", "seeds"),
      onWater: () => void this.devComplete("story-telling", "water"),
      onStore: () => void this.devComplete("store-review", "store"),
      onAdvanceDay: (n) => void this.devAdvanceDay(n),
    });
    this.updateDevStatus();
  }

  private async devComplete(objectiveId: string, role: DailyRole) {
    await this.player.completeActivity({
      objectiveId,
      role,
      level: CURRENT_LESSON.level,
      communication: 1,
      accuracy: 1,
    });
    this.render();
    this.updateDevStatus();
  }

  private async devAdvanceDay(days: number) {
    this.adapters.fakes!.clock.advanceDays(days);
    await this.player.update((s) => settleDailyState(s, this.adapters.clock.now()));
    this.render();
    this.updateDevStatus();
  }

  private updateDevStatus() {
    const state = this.player.getState();
    const today = appDay(this.adapters.clock.now());
    const where = needsSeed(state.field, today)
      ? "needs seed"
      : `${bloomsThisRow(state.field, today)}/${ROW_LENGTH} bloomed this row`;
    this.devPanel?.setStatus(`${today} · ${where} · 💰 ${state.money}`);
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

    const channel = this.adapters.conversationChannel;
    let lastApplied: ApplyResult | null = null;

    blockCanvas();
    channel.prepare();

    const view = new HtmlConversationView({
      onLeave: () => {
        // Left early — no completion, no progress.
        channel.dispose();
        view.destroy();
        unblockCanvas();
        this.render();
      },
      onContinue: () => {
        channel.dispose();
        view.destroy();
        unblockCanvas();
        this.afterConversation(objective.role, lastApplied);
        this.render();
      },
    });

    view.setHeader(npc.name, "", lesson.canDo);

    const opener = npc.conversation.opener;
    session.begin(opener);
    view.setNpcSpeech(opener);
    void channel
      .speak(opener, npc.voice)
      .then(() => view.setStatus("Your turn — reply in Spanish."));

    const handleTurn = async (utterance: string) => {
      channel.setBusy(true);
      view.setFeedback("", "", "");
      view.setStatus(`${npc.name} is thinking…`);
      try {
        const outcome = await session.submit(utterance);
        lastApplied = outcome.applied;

        const corr =
          outcome.grade.corrections.length > 0 ? outcome.grade.corrections.join("; ") : "";
        const sold = outcome.applied.soldValue > 0 ? `+${outcome.applied.soldValue} 💰` : "";
        const grew = outcome.applied.grown > 0 ? "🌸 Your plant bloomed!" : "";
        view.setFeedback(outcome.grade.feedback, corr, [sold, grew].filter(Boolean).join("  "));

        view.setNpcSpeech(outcome.npcReply);
        await channel.speak(outcome.npcReply, npc.voice);

        if (outcome.complete) {
          view.showEndState("Great conversation! 🎉", "#9bc995");
        } else {
          channel.setBusy(false);
          view.setStatus("Your turn — reply in Spanish.");
        }
      } catch (err) {
        console.error(err);
        view.setStatus("Something went wrong.");
        channel.setBusy(false);
      }
    };

    channel.mountInput(view.inputArea(), view, (utterance) => void handleTurn(utterance));
  }

  /**
   * End-of-conversation feedback. The field/money/objective side-effects already
   * happened authoritatively inside `applyActivity` (so they persist server-side);
   * here we only surface what changed and re-render.
   */
  private afterConversation(role: string, applied: ApplyResult | null) {
    if (!applied) return;

    if (applied.planted) {
      this.toast("🌱 New row planted! Water it daily at La Plaza this week.");
    } else if (applied.sold > 0) {
      this.toast(`🛒 Nice review! +${applied.soldValue} 💰`);
    } else if (role === "water" && applied.grown > 0) {
      this.toast("🌸 Your plant bloomed! Come back tomorrow to keep the streak.");
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

function cellEmoji(c: CellState): string {
  switch (c) {
    case "bloomed":
      return "🌸";
    case "withered":
      return "🥀";
    case "today":
      return "🌱";
    case "empty":
      return "·";
  }
}
