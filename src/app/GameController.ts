/**
 * GameController — the running game's composition root (no framework).
 *
 * Coordinates the HTML world view, conversation/dialogue overlays, and the pure
 * domain (the farming loop: field, daily gate, money, inventory). Domain logic
 * stays pure; this is wiring + presentation.
 *
 * The loop:
 *   - Jackie at the seed farm (seeds) → plant a new 7-day garden row.
 *   - Jorgito at La Plaza (water, daily) → bloom today's plant; a skipped day withers it.
 *   - Doña Tienda (store) → a graded review that pays money.
 */

import { HtmlWorldView } from "../ui/html/HtmlWorldView";
import { HtmlDialogueView, type DialogueViewData } from "../ui/html/HtmlDialogueView";
import { HtmlConversationView } from "../ui/html/HtmlConversationView";
import { HtmlDevPanel } from "../ui/html/HtmlDevPanel";
import { blockCanvas, unblockCanvas } from "../ui/html/canvasBlock";
import { buildHubMap } from "../content/maps";
import { findNpc, visibleLocations, type Npc } from "../content/world";
import { themeForRole, type Campaign, type ResourceTheme } from "../content/campaigns";
import { renderSceneHtml } from "../content/sceneArt";
import type { MapNpc } from "../domain/gameMap";
import type { ObjectiveGraph, ObjectiveContext } from "../domain/objective";
import { grid, needsSeed, bloomsThisRow, ROW_LENGTH, type CellState } from "../domain/garden";
import { hoursUntilNextDay, type DailyRole } from "../domain/dailyLoop";
import { settleDailyState, type ApplyResult } from "../domain/player";
import { appDay } from "../domain/time";
import { currentCheckpointSunday } from "../domain/checkpoint";
import { getMyGroupId } from "../net/groupMembership";
import { ConversationSession } from "./ConversationSession";
import type { PlayerService } from "./PlayerService";
import type { Adapters } from "./adapters";

export class GameController {
  private worldView!: HtmlWorldView;
  private objectives: ObjectiveGraph;
  private devPanel?: HtmlDevPanel;

  constructor(
    private readonly player: PlayerService,
    private readonly adapters: Adapters,
    private readonly campaign: Campaign,
  ) {
    this.objectives = campaign.objectives;
  }

  start() {
    this.worldView = new HtmlWorldView({
      onNpcTap: (npc) => this.onNpcTap(npc),
    });

    const user = this.adapters.auth.current();
    this.worldView.setUser(user.displayName, () => {
      void this.adapters.auth.signOut().then(() => window.location.reload());
    });
    if (!user.isGuest) void this.setupCheckpointLink(user.id);

    if (this.adapters.fakes) this.setupDevPanel();

    this.render();
    // Keep the reset countdown fresh.
    setInterval(() => this.render(), 60_000);
  }

  /**
   * Look up the signed-in user's group and, if found, show a link to this
   * week's checkpoint in the HUD. A never-blocking best-effort — no group
   * (guest/local-fakes, or a backend hiccup) just means no link.
   */
  private async setupCheckpointLink(userId: string) {
    const groupId = await getMyGroupId(userId);
    if (!groupId) return;
    const today = appDay(this.adapters.clock.now());
    const sunday = currentCheckpointSunday(today);
    this.worldView.setCheckpointLink(`/organizations/${groupId}/checkpoints/${sunday}`);
  }

  // --- Rendering ------------------------------------------------------------

  private render() {
    const state = this.player.getState();
    const objState = state.daily.objectiveState;
    const today = appDay(this.adapters.clock.now());

    const visibleNpcIds = new Set(
      visibleLocations(this.campaign.area).flatMap((loc) => loc.npcIds),
    );
    const activeObjectives = this.objectives
      .all()
      .filter((obj) => visibleNpcIds.has(obj.npcId));

    // Which NPCs have been talked to (reward claimed) today?
    const completedNpcIds = new Set(
      activeObjectives.filter((obj) => objState[obj.id] != null).map((obj) => obj.npcId),
    );

    // Rebuilt every render (not cached) — cheap, and some campaigns place an
    // NPC dynamically based on the day (e.g. Fiesta de Daphne's Silly Goose).
    const hub = buildHubMap(this.campaign.area, today);
    this.worldView.loadMap(hub, completedNpcIds);
    this.worldView.updateHud(state.money);
    this.worldView.setExtraCards([this.gardenCard(), this.foliageCard(), this.ribbonsCard()]);

    const now = new Date();
    const hours = hoursUntilNextDay(state.daily, now);
    // Bonus objectives (e.g. Arlene's foliage) don't gate "day complete".
    const requiredObjectives = activeObjectives.filter((obj) => !obj.bonus);
    const allClaimed = requiredObjectives.every((obj) => objState[obj.id] != null);
    this.worldView.updateDailyStatus({
      allDone: allClaimed,
      hoursUntilReset: hours,
    });
  }

  /** The display name of the NPC fulfilling a given role, if any (campaign-driven, not hardcoded). */
  private roleNpcName(role: DailyRole): string | undefined {
    const loc = this.campaign.area.locations.find((l) => l.role === role);
    if (!loc) return undefined;
    return findNpc(loc.npcIds[0])?.name;
  }

  private resourceTheme(role: DailyRole): ResourceTheme {
    // Every role gardenCard/foliageCard/ribbonsCard/afterConversation call
    // this for has a theme (only "store" doesn't, and none of them pass it).
    return themeForRole(this.campaign.rewardTheme, role)!;
  }

  private gardenCard() {
    const field = this.player.getState().field;
    const today = appDay(this.adapters.clock.now());
    const theme = this.resourceTheme("water");
    const cells = grid(field, today).map((row) => row.map((c) => cellEmoji(c, theme.icon)));
    const seedName = this.roleNpcName("seeds");
    const waterName = this.roleNpcName("water");
    const hint = needsSeed(field, today)
      ? field.rows.length === 0
        ? `Hear ${seedName ?? "the story"}'s story to plant your first row`
        : `Row done! Hear ${seedName ?? "the"} next story for the next row`
      : `${bloomsThisRow(field, today)}/${ROW_LENGTH} ${theme.grownVerb} — talk to ${waterName ?? "them"} daily`;

    return {
      id: "field",
      icon: theme.icon,
      label: theme.label,
      hint,
      grid: cells,
      onTap: () => this.onGardenTap(),
    };
  }

  private foliageCard() {
    const foliage = this.player.getState().foliage;
    const today = appDay(this.adapters.clock.now());
    const theme = this.resourceTheme("foliage");
    const cells = grid(foliage, today).map((row) => row.map((c) => cellEmoji(c, theme.icon)));
    const npcName = this.roleNpcName("foliage");
    const hint = needsSeed(foliage, today)
      ? `Visit ${npcName ?? "someone"} to start ${theme.startVerb} ${theme.itemPlural}`
      : `${bloomsThisRow(foliage, today)}/${ROW_LENGTH} ${theme.grownVerb} — bonus practice, any time`;

    return {
      id: "foliage",
      icon: theme.icon,
      label: theme.label,
      hint,
      grid: cells,
      onTap: () =>
        this.toast(`Talk to ${npcName ?? "someone"} any time for a bonus practice rep.`),
    };
  }

  private ribbonsCard() {
    const ribbons = this.player.getState().ribbons;
    const today = appDay(this.adapters.clock.now());
    const theme = this.resourceTheme("ribbons");
    const cells = grid(ribbons, today).map((row) => row.map((c) => cellEmoji(c, theme.icon)));
    const npcName = this.roleNpcName("ribbons");
    const hint = needsSeed(ribbons, today)
      ? `Visit ${npcName ?? "someone"} to start ${theme.startVerb} ${theme.itemPlural}`
      : `${bloomsThisRow(ribbons, today)}/${ROW_LENGTH} ${theme.grownVerb} — bonus practice, any time`;

    return {
      id: "ribbons",
      icon: theme.icon,
      label: theme.label,
      hint,
      grid: cells,
      onTap: () =>
        this.toast(`Talk to ${npcName ?? "someone"} any time for a bonus practice rep.`),
    };
  }

  // --- Garden interactions --------------------------------------------------

  private onGardenTap() {
    const field = this.player.getState().field;
    const today = appDay(this.adapters.clock.now());
    const seedName = this.roleNpcName("seeds");
    const waterName = this.roleNpcName("water");
    if (needsSeed(field, today)) {
      this.toast(
        field.rows.length === 0
          ? `🌱 Visit ${seedName ?? "them"} to plant your first row.`
          : `🌱 This week's row is complete — hear ${seedName ?? "the"} next story for the next one.`,
      );
      return;
    }
    const theme = this.resourceTheme("water");
    this.toast(
      `💧 ${bloomsThisRow(field, today)}/${ROW_LENGTH} ${theme.itemPlural} ${theme.grownVerb} this week. Talk to ${waterName ?? "them"} daily to keep your streak alive.`,
    );
  }

  // --- Dev harness (fakes only) ---------------------------------------------

  private setupDevPanel() {
    this.devPanel = new HtmlDevPanel({
      onSeeds: () => void this.devCompleteRole("seeds"),
      onWater: () => void this.devCompleteRole("water"),
      onStore: () => void this.devCompleteRole("store"),
      onFoliage: () => void this.devCompleteRole("foliage"),
      onRibbons: () => void this.devCompleteRole("ribbons"),
      onAdvanceDay: (n) => void this.devAdvanceDay(n),
    });
    this.updateDevStatus();
  }

  /** Completes whichever objective fulfills `role` in the active campaign — campaign-agnostic. */
  private async devCompleteRole(role: DailyRole) {
    const objectiveId = this.objectives.all().find((o) => o.role === role)?.id;
    if (!objectiveId) return;
    await this.player.completeActivity({
      objectiveId,
      role,
      level: this.campaign.lesson.level,
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
    const objective = this.objectives.forNpc(mapNpc.npcId);
    const objState = this.player.getState().daily.objectiveState;
    if (objective && !this.objectives.isAvailable(objective.id, objState)) {
      this.toast(`${npc.name} isn't ready yet — talk to the others first.`);
      return;
    }
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
    const lesson = this.campaign.lesson;
    const canDo = objective.canDo ?? lesson.canDo;
    const vocab = objective.vocab ?? lesson.vocab;

    const inputs = this.objectives.gatherInputs(
      objective.id,
      this.player.getState().daily.objectiveState,
    );
    const ctx: ObjectiveContext = {
      inputs,
      state: this.player.getState().daily.objectiveState,
      today: appDay(this.adapters.clock.now()),
    };
    const theme = objective.buildTheme(ctx);
    const ref = objective.referenceScene?.(ctx);
    const sceneHtml = ref ? renderSceneHtml(ref.scene) : null;

    const session = new ConversationSession(
      {
        npcId: npc.id,
        npcName: npc.name,
        level: lesson.level,
        objectiveId: objective.id,
        role: objective.role,
        canDo,
        vocab: vocab.map((v) => ({ es: v.es, en: v.en })),
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

    view.setHeader(npc.name, "", canDo);
    view.setScenePeek(sceneHtml);

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
        const grew = outcome.applied.grown > 0 ? this.grownBadge("water") : "";
        const grewFoliage = outcome.applied.grownFoliage > 0 ? this.grownBadge("foliage") : "";
        const grewRibbons = outcome.applied.grownRibbons > 0 ? this.grownBadge("ribbons") : "";
        view.setFeedback(
          outcome.grade.feedback,
          corr,
          [sold, grew, grewFoliage, grewRibbons].filter(Boolean).join("  "),
        );

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

  /** The compact "X grew" badge shown inline during a conversation turn. */
  private grownBadge(role: DailyRole): string {
    const theme = this.resourceTheme(role);
    return `${theme.icon} Your ${theme.itemSingular} ${theme.grownVerb}!`;
  }

  /**
   * End-of-conversation feedback. The field/money/objective side-effects already
   * happened authoritatively inside `applyActivity` (so they persist server-side);
   * here we only surface what changed and re-render.
   */
  private afterConversation(role: string, applied: ApplyResult | null) {
    if (!applied) return;

    if (applied.planted) {
      const waterName = this.roleNpcName("water") ?? "them";
      this.toast(`🌱 New row planted! Talk to ${waterName} daily this week to keep it growing.`);
    } else if (applied.sold > 0) {
      const gooseResult = this.player.getState().daily.objectiveState["find-the-goose"]?.outputs
        ?.result;
      if (gooseResult === "correcto") {
        this.toast("🔑 ¡Las encontraste! You found the keys — time for cake and presents!");
      } else if (gooseResult === "incorrecto") {
        this.toast("🔍 Not this time — ask around again tomorrow.");
      } else {
        this.toast(`🛒 Nice review! +${applied.soldValue} 💰`);
      }
    } else if (role === "water" && applied.grown > 0) {
      const theme = this.resourceTheme("water");
      this.toast(`${theme.icon} Your ${theme.itemSingular} ${theme.grownVerb}! Come back tomorrow to keep the streak.`);
    } else if (role === "foliage" && applied.grownFoliage > 0) {
      const theme = this.resourceTheme("foliage");
      this.toast(
        `${theme.icon} Your ${theme.itemSingular} ${theme.grownVerb} for the ${this.campaign.rewardTheme.collectionName}!`,
      );
    } else if (role === "ribbons" && applied.grownRibbons > 0) {
      const theme = this.resourceTheme("ribbons");
      this.toast(
        `${theme.icon} Your ${theme.itemSingular} ${theme.grownVerb} for the ${this.campaign.rewardTheme.collectionName}!`,
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

function cellEmoji(c: CellState, bloomIcon: string): string {
  switch (c) {
    case "bloomed":
      return bloomIcon;
    case "withered":
      return "🥀";
    case "today":
      return "🌱";
    case "empty":
      return "·";
  }
}
