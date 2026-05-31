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

  /**
   * Top resource strip (portrait): full-width bar below the auth header with
   * Pesos, a Focus bar, and skills. Pure rendering of state.
   */
  private renderResources(ps: PlayerState) {
    this.resourcePanel?.destroy();
    const w = this.scale.width;
    const children: Phaser.GameObjects.GameObject[] = [];

    const margin = 8;
    const top = 48; // below the auth header bar
    const panelW = w - margin * 2;
    const bg = this.add
      .rectangle(margin, top, panelW, 64, 0x1a1423, 0.82)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xd9b08c);
    children.push(bg);

    const pesos = this.add.text(margin + 12, top + 10, `💰 ${ps.pesos}`, {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#ffe08a",
    });
    children.push(pesos);

    // Focus bar (to the right of pesos).
    const barX = margin + 120;
    const barW = panelW - 132;
    const focusLabel = this.add.text(barX, top + 6, "Focus", {
      fontFamily: "Trebuchet MS",
      fontSize: "11px",
      color: "#9ec5ff",
    });
    const barBg = this.add
      .rectangle(barX, top + 26, barW, 10, 0x3a2f42)
      .setOrigin(0, 0.5);
    const barFill = this.add
      .rectangle(barX, top + 26, barW * (ps.focus / FOCUS_MAX), 10, 0x6db1ff)
      .setOrigin(0, 0.5);
    const focusNum = this.add
      .text(barX + barW, top + 6, `${ps.focus}/${FOCUS_MAX}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "10px",
        color: "#8a8290",
      })
      .setOrigin(1, 0);
    children.push(focusLabel, barBg, barFill, focusNum);

    const skills = this.add.text(
      margin + 12,
      top + 40,
      `🗣 ${ps.skills.speaking}   👂 ${ps.skills.listening}   📖 ${ps.skills.vocab}`,
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

    // Sits below the resource strip (which ends ~112).
    const top = 120;
    const left = 8;
    const panelW = 200;

    const bg = this.add
      .rectangle(left, top, panelW, 34 + CEFR_LEVELS.length * 22, 0x1a1423, 0.82)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xd9b08c);
    children.push(bg);

    const eff = prof.effectiveLevel();
    const title = this.add.text(left + 10, top + 6, `Level: ${eff ?? "—"}`, {
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
      const y = top + 32 + row * 22;

      const label = this.add.text(left + 10, y, `${level}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#f4ecd8",
      });
      const barBg = this.add
        .rectangle(left + 42, y + 7, 120, 10, 0x3a2f42)
        .setOrigin(0, 0.5);
      const barFill = this.add
        .rectangle(left + 42, y + 7, 120 * (done / total), 10, 0x9bc995)
        .setOrigin(0, 0.5);
      const num = this.add.text(left + 168, y, `${pct}%`, {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#9bc995",
      });
      children.push(label, barBg, barFill, num);
      row++;
    }

    const help = this.add.text(
      left + 10,
      top + 32 + row * 22 + 2,
      "Tap to move · tap someone to talk",
      { fontFamily: "Trebuchet MS", fontSize: "10px", color: "#8a8290" },
    );
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
