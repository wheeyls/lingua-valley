import Phaser from "phaser";
import { CEFR_LEVELS } from "../domain/cefr";
import { GameState, REGISTRY_KEY } from "../game/state";
import type { Area } from "../content/world";

import { FOCUS_MAX } from "../domain/player";
import type { PlayerState } from "../domain/player";

export class HudScene extends Phaser.Scene {
  private state!: GameState;
  private panel!: Phaser.GameObjects.Container;
  private resourcePanel!: Phaser.GameObjects.Container;
  private areaBanner?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "HudScene", active: false });
  }

  create() {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.renderHud();

    this.state.proficiency.subscribe(() => this.renderHud());
    this.state.player.subscribe((ps) => this.renderResources(ps));
    this.game.events.on("areaChanged", (area: Area) => this.showArea(area));
  }

  /** Top-right resource strip: Pesos, Focus, skills. Pure rendering of state. */
  private renderResources(ps: PlayerState) {
    this.resourcePanel?.destroy();
    const w = this.scale.width;
    const children: Phaser.GameObjects.GameObject[] = [];

    const panelW = 210;
    const x = w - panelW - 8;
    const bg = this.add
      .rectangle(x, 8, panelW, 104, 0x1a1423, 0.82)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xd9b08c);
    children.push(bg);

    const pesos = this.add.text(x + 12, 16, `💰 ${ps.pesos} pesos`, {
      fontFamily: "Trebuchet MS",
      fontSize: "15px",
      color: "#ffe08a",
    });
    children.push(pesos);

    // Focus bar.
    const focusLabel = this.add.text(x + 12, 42, "Focus", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#9ec5ff",
    });
    const barBg = this.add
      .rectangle(x + 64, 49, 130, 10, 0x3a2f42)
      .setOrigin(0, 0.5);
    const barFill = this.add
      .rectangle(x + 64, 49, 130 * (ps.focus / FOCUS_MAX), 10, 0x6db1ff)
      .setOrigin(0, 0.5);
    const focusNum = this.add.text(x + 12, 58, `${ps.focus}/${FOCUS_MAX}`, {
      fontFamily: "Trebuchet MS",
      fontSize: "10px",
      color: "#8a8290",
    });
    children.push(focusLabel, barBg, barFill, focusNum);

    const skills = this.add.text(
      x + 12,
      76,
      `🗣 ${ps.skills.speaking}  👂 ${ps.skills.listening}  📖 ${ps.skills.vocab}`,
      { fontFamily: "Trebuchet MS", fontSize: "12px", color: "#9bc995" },
    );
    children.push(skills);

    this.resourcePanel = this.add
      .container(0, 0, children)
      .setScrollFactor(0)
      .setDepth(41);
  }

  private renderHud() {
    this.panel?.destroy();
    const prof = this.state.proficiency;
    const children: Phaser.GameObjects.GameObject[] = [];

    const bg = this.add
      .rectangle(8, 8, 240, 34 + CEFR_LEVELS.length * 22, 0x1a1423, 0.82)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xd9b08c);
    children.push(bg);

    const eff = prof.effectiveLevel();
    const title = this.add.text(18, 14, `Level: ${eff ?? "—"} (no XP, just skill)`, {
      fontFamily: "Trebuchet MS",
      fontSize: "13px",
      color: "#ffe08a",
    });
    children.push(title);

    // Show levels that actually have content (A1, A2 in the slice).
    let row = 0;
    for (const level of CEFR_LEVELS) {
      const total = prof.totalCount(level);
      if (total === 0) continue;
      const done = prof.masteredCount(level);
      const pct = Math.round((done / total) * 100);
      const y = 40 + row * 22;

      const label = this.add.text(18, y, `${level}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#f4ecd8",
      });
      // bar
      const barBg = this.add.rectangle(50, y + 7, 140, 10, 0x3a2f42).setOrigin(0, 0.5);
      const barFill = this.add
        .rectangle(50, y + 7, 140 * (done / total), 10, 0x9bc995)
        .setOrigin(0, 0.5);
      const num = this.add
        .text(196, y, `${pct}%`, {
          fontFamily: "Trebuchet MS",
          fontSize: "12px",
          color: "#9bc995",
        });
      children.push(label, barBg, barFill, num);
      row++;
    }

    const help = this.add.text(18, 40 + row * 22 + 2, "Arrows/WASD move · SPACE talk", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      color: "#8a8290",
    });
    children.push(help);

    this.panel = this.add.container(0, 0, children).setScrollFactor(0).setDepth(40);
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
      .text(this.scale.width / 2, 30, msg, {
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
