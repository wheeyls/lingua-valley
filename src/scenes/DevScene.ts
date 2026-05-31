/**
 * DevScene — an interactive harness for the FAKE adapters, enabled only when
 * running the "local-fakes" profile (e.g. ?dev=fakes). It lets you drive the
 * game with no real services: spawn wandering ghost players, advance the clock
 * (to test daily Focus regen / SRS maturation), set the next conversation
 * grade, and inspect live PlayerState.
 *
 * It is a DRIVING adapter: it only pokes the fakes and reads state. No rules.
 */

import Phaser from "phaser";
import { GameState, REGISTRY_KEY } from "../game/state";
import type { RemotePlayer } from "../domain/ports";

export class DevScene extends Phaser.Scene {
  private state!: GameState;
  private info!: Phaser.GameObjects.Text;
  private ghostCount = 0;

  constructor() {
    super({ key: "DevScene", active: false });
  }

  create() {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    if (!this.state.adapters.fakes) {
      // Not in a fakes profile; do nothing.
      this.scene.stop();
      return;
    }

    const x = 8;
    const y = this.scale.height - 150;
    this.add
      .rectangle(x, y, 360, 142, 0x101018, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x6db1ff)
      .setScrollFactor(0)
      .setDepth(80);

    this.add
      .text(x + 10, y + 8, "DEV HARNESS (fakes)", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#6db1ff",
      })
      .setScrollFactor(0)
      .setDepth(81);

    this.makeButton(x + 10, y + 32, "[G] spawn ghost", () => this.spawnGhost());
    this.makeButton(x + 10, y + 56, "[N] advance 1 day", () => this.advanceDay());
    this.makeButton(x + 10, y + 80, "[P] next grade: PASS", () => this.setGrade(true));
    this.makeButton(x + 180, y + 80, "[F] next grade: FAIL", () => this.setGrade(false));

    this.info = this.add
      .text(x + 10, y + 104, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#cfe8ff",
        wordWrap: { width: 340 },
      })
      .setScrollFactor(0)
      .setDepth(81);

    this.state.player.subscribe(() => this.refresh());
    this.refresh();

    // Keyboard shortcuts.
    this.input.keyboard!.on("keydown-G", () => this.spawnGhost());
    this.input.keyboard!.on("keydown-N", () => this.advanceDay());
    this.input.keyboard!.on("keydown-P", () => this.setGrade(true));
    this.input.keyboard!.on("keydown-F", () => this.setGrade(false));
  }

  private makeButton(x: number, y: number, label: string, fn: () => void) {
    const t = this.add
      .text(x, y, label, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffe08a",
      })
      .setScrollFactor(0)
      .setDepth(81)
      .setInteractive({ useHandCursor: true });
    t.on("pointerdown", fn);
  }

  private spawnGhost() {
    const fakes = this.state.adapters.fakes!;
    this.ghostCount++;
    const ghost: RemotePlayer = {
      userId: `ghost_${this.ghostCount}`,
      displayName: `Fantasma ${this.ghostCount}`,
      color: Phaser.Display.Color.RandomRGB().color,
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300,
      facing: "down",
    };
    fakes.presence.spawnGhost("world", ghost, {
      bounds: { x: 40, y: 40, w: 560, h: 480 },
    });
    this.refresh();
  }

  private advanceDay() {
    this.state.adapters.fakes!.clock.advanceDays(1);
    this.refresh();
  }

  private setGrade(pass: boolean) {
    this.state.adapters.fakes!.grader.setDefault(
      pass
        ? { communication: 0.95, accuracy: 0.9, objectiveMet: true }
        : { communication: 0.3, accuracy: 0.3, objectiveMet: false },
    );
    this.refresh();
  }

  private refresh() {
    const ps = this.state.player.getState();
    const clock = this.state.adapters.fakes!.clock.now().toISOString().slice(0, 10);
    this.info?.setText(
      `day=${clock}  pesos=${ps.pesos}  focus=${ps.focus}  ghosts=${this.ghostCount}\n` +
        `skills spk=${ps.skills.speaking} lis=${ps.skills.listening} voc=${ps.skills.vocab}  ` +
        `mastered=${ps.masteredObjectiveIds.length}`,
    );
  }
}
