import Phaser from "phaser";
import { CEFR_LEVELS } from "../domain/cefr";
import { GameState, REGISTRY_KEY } from "../game/state";
import type { Area } from "../content/world";

export class HudScene extends Phaser.Scene {
  private state!: GameState;
  private panel!: Phaser.GameObjects.Container;
  private areaBanner?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "HudScene", active: false });
  }

  create() {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.renderHud();

    this.state.proficiency.subscribe(() => this.renderHud());
    this.game.events.on("areaChanged", (area: Area) => this.showArea(area));
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
