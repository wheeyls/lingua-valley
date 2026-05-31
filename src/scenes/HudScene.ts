import Phaser from "phaser";
import { CEFR_LEVELS } from "../domain/cefr";
import { GameState, REGISTRY_KEY } from "../game/state";
import type { Area } from "../content/world";
import { FOCUS_MAX } from "../domain/player";
import { hudLayout, type HudVM } from "../ui/layouts/hud";
import { renderNodes, type RenderedUI } from "../ui/PhaserRenderer";

export class HudScene extends Phaser.Scene {
  private state!: GameState;
  private ui?: RenderedUI;
  private areaBanner?: Phaser.GameObjects.Text;

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
    return {
      authLabel: user.isGuest ? "Playing as guest" : `Signed in: ${user.displayName}`,
      authAction: user.isGuest ? "Sign in" : "Sign out",
      pesos: ps.pesos,
      focus: ps.focus,
      focusMax: FOCUS_MAX,
      skills: ps.skills,
      effectiveLevel: prof.effectiveLevel() ?? "—",
      levels,
    };
  }

  private renderHud() {
    this.ui?.destroy();
    this.ui = renderNodes(this, hudLayout(this.viewModel()), {
      auth: () => this.onAuth(),
    });
    this.ui.container.setScrollFactor(0);
  }

  private async onAuth() {
    const auth = this.state.adapters.auth;
    if (auth.current().isGuest) await auth.signIn();
    else await auth.signOut();
  }

  private showArea(area: Area) {
    this.areaBanner?.destroy();
    const clear = this.state.proficiency.effectiveLevel();
    const overLevel =
      clear === null
        ? area.level !== "A1"
        : CEFR_LEVELS.indexOf(area.level) > CEFR_LEVELS.indexOf(clear);

    const msg = overLevel
      ? `Entering ${area.name} — they speak ${area.level} here. It's over your head…`
      : `Entering ${area.name}`;

    this.areaBanner = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 60, msg, {
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
        color: overLevel ? "#b56576" : "#9bc995",
        backgroundColor: "rgba(26,20,35,0.85)",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(45);

    this.tweens.add({
      targets: this.areaBanner,
      alpha: { from: 1, to: 0 },
      delay: 2200,
      duration: 800,
      onComplete: () => this.areaBanner?.destroy(),
    });
  }
}
