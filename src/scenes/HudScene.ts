import Phaser from "phaser";
import { CEFR_LEVELS } from "../domain/cefr";
import { GameState, REGISTRY_KEY } from "../game/state";
import { AREAS, GOOD_NAMES, townInfoOf, type Area } from "../content/world";
import { townReachable } from "../domain/town";
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
      menuOpen: this.menuOpen,
    };
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
    if (auth.current().isGuest) await auth.signIn();
    else await auth.signOut();
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
