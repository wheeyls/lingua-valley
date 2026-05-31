/**
 * AuthScene — a thin login overlay (top-center). Renders the current identity
 * and lets the player sign in / out via the AuthGateway port. No auth logic
 * lives here; it only calls the port and reflects state changes.
 *
 * The guest→account claim is orchestrated elsewhere (ClaimService) and triggered
 * on the auth "signed in" transition; this scene just surfaces status.
 */

import Phaser from "phaser";
import { GameState, REGISTRY_KEY } from "../game/state";
import type { AuthUser } from "../domain/ports";

export class AuthScene extends Phaser.Scene {
  private state!: GameState;
  private label!: Phaser.GameObjects.Text;
  private button!: Phaser.GameObjects.Text;
  private unsub: (() => void) | null = null;

  constructor() {
    super({ key: "AuthScene", active: false });
  }

  create() {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;

    const cx = this.scale.width / 2;
    this.add
      .rectangle(cx, 14, 320, 30, 0x1a1423, 0.8)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0xd9b08c)
      .setScrollFactor(0)
      .setDepth(60);

    this.label = this.add
      .text(cx - 140, 22, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#f4ecd8",
      })
      .setScrollFactor(0)
      .setDepth(61);

    this.button = this.add
      .text(cx + 140, 22, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#ffe08a",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(61)
      .setInteractive({ useHandCursor: true });

    this.button.on("pointerdown", () => this.onButton());

    this.render(this.state.adapters.auth.current());
    this.unsub = this.state.adapters.auth.onChange((u) => this.render(u));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
  }

  private render(user: AuthUser) {
    if (user.isGuest) {
      this.label.setText("Playing as guest");
      this.button.setText("[ Sign in ]");
    } else {
      this.label.setText(`Signed in: ${user.displayName}`);
      this.button.setText("[ Sign out ]");
    }
  }

  private async onButton() {
    const auth = this.state.adapters.auth;
    if (auth.current().isGuest) {
      await auth.signIn();
    } else {
      await auth.signOut();
    }
  }
}
