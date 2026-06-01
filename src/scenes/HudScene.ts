import Phaser from "phaser";
import { CEFR_LEVELS } from "../domain/cefr";
import { GameState, REGISTRY_KEY } from "../game/state";
import { AREAS, GOOD_NAMES, townInfoOf, type Area } from "../content/world";
import { townReachable } from "../domain/town";
import { QUESTS } from "../content/quests";
import { FOCUS_MAX } from "../domain/player";
import { hudLayout, type HudVM } from "../ui/layouts/hud";
import { bannerLayout } from "../ui/layouts/banner";
import { renderNodes, type RenderedUI } from "../ui/PhaserRenderer";

export class HudScene extends Phaser.Scene {
  private state!: GameState;
  private ui?: RenderedUI;
  private banner?: RenderedUI;
  private menuOpen = false;

  constructor() {
    super({ key: "HudScene", active: false });
  }

  create() {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.renderHud();

    this.state.proficiency.subscribe(() => this.renderHud());
    this.state.player.subscribe(() => this.renderHud());
    this.state.adapters.auth.onChange(() => this.renderHud());
    this.game.events.on("areaChanged", (area: Area) => this.showArea(area));
  }

  /** Build the HUD view-model from current state. */
  private viewModel(): HudVM {
    const prof = this.state.proficiency;
    const ps = this.state.player.getState();
    const user = this.state.adapters.auth.current();
    const levels = CEFR_LEVELS.filter((l) => prof.totalCount(l) > 0).map((l) => ({
      level: l,
      pct: Math.round((prof.masteredCount(l) / prof.totalCount(l)) * 100),
    }));
    const goods = Object.entries(ps.goods)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ name: GOOD_NAMES[id] ?? id, qty }));
    return {
      authLabel: user.isGuest ? "Playing as guest" : `Signed in: ${user.displayName}`,
      authAction: user.isGuest ? "Sign in" : "Sign out",
      pesos: ps.pesos,
      focus: ps.focus,
      focusMax: FOCUS_MAX,
      skills: ps.skills,
      effectiveLevel: prof.effectiveLevel() ?? "—",
      levels,
      goods,
      quest: this.activeQuestVM(),
      menuOpen: this.menuOpen,
    };
  }

  /** Active quest summary for the HUD (title + step done states), if any. */
  private activeQuestVM(): HudVM["quest"] {
    const ps = this.state.player.getState();
    for (const quest of QUESTS) {
      const prog = ps.quests[quest.id];
      if (!prog || prog.phase === "done" || prog.phase === "offered") continue;
      return {
        title: quest.title,
        phase: prog.phase,
        steps: quest.steps.map((s) => ({
          label: s.description,
          done: prog.completedStepIds.includes(s.id),
        })),
      };
    }
    return undefined;
  }

  private renderHud() {
    this.ui?.destroy();
    this.ui = renderNodes(this, hudLayout(this.viewModel()), {
      auth: () => this.onAuth(),
      menu: () => {
        this.menuOpen = !this.menuOpen;
        this.renderHud();
      },
    });
    this.ui.container.setScrollFactor(0);
  }

  private async onAuth() {
    const auth = this.state.adapters.auth;
    if (!auth.current().isGuest) {
      await auth.signOut();
      return;
    }
    // Magic-link sign-in: ask for an email, then send the link.
    const email = window.prompt(
      "Sign in — enter your email and we'll send you a magic link:",
    );
    if (!email) return;
    try {
      await auth.signIn(email.trim());
      this.flashBanner("✉️ Check your email for a sign-in link.", false);
    } catch (err) {
      console.error("[auth] sign-in failed", err);
      this.flashBanner("Sign-in failed — please try again.", true);
    }
  }

  /** Show a transient HUD banner (reuses the area-banner rendering). */
  private flashBanner(message: string, isError: boolean) {
    this.banner?.destroy();
    this.banner = renderNodes(this, bannerLayout({ message, overLevel: isError }));
    this.banner.container.setScrollFactor(0);
    this.tweens.add({
      targets: this.banner.container,
      alpha: { from: 1, to: 0 },
      delay: 3000,
      duration: 800,
      onComplete: () => this.banner?.destroy(),
    });
  }

  private showArea(area: Area) {
    this.banner?.destroy();
    const clear = this.state.proficiency.effectiveLevel();
    const overLevel =
      clear === null
        ? area.level !== "A1"
        : CEFR_LEVELS.indexOf(area.level) > CEFR_LEVELS.indexOf(clear);

    // Travel gating: have you earned your way into this town (beaten the
    // previous town's gatekeeper)?
    const prev = AREAS.find((a) => a.depth === area.depth - 1) ?? null;
    const reachable = townReachable(
      this.state.player.getState(),
      prev ? townInfoOf(prev) : null,
    );

    const msg = !reachable
      ? `${area.name}: you haven't earned the community's trust yet — go back and prove yourself.`
      : overLevel
        ? `Entering ${area.name} — they speak ${area.level} here, over your head…`
        : `Entering ${area.name}`;

    this.banner = renderNodes(
      this,
      bannerLayout({ message: msg, overLevel: overLevel || !reachable }),
    );
    this.banner.container.setScrollFactor(0);

    this.tweens.add({
      targets: this.banner.container,
      alpha: { from: 1, to: 0 },
      delay: 2200,
      duration: 800,
      onComplete: () => this.banner?.destroy(),
    });
  }
}
