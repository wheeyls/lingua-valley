import Phaser from "phaser";
import { WorldScene } from "./scenes/WorldScene";
import { DialogueScene } from "./scenes/DialogueScene";
import { MinigameScene } from "./scenes/MinigameScene";
import { ConversationScene } from "./scenes/ConversationScene";
import { HudScene } from "./scenes/HudScene";
import { DevScene } from "./scenes/DevScene";
import { AuthScene } from "./scenes/AuthScene";
import { GameState, REGISTRY_KEY } from "./game/state";
import { composeApp } from "./app/composition";
import { cloudConfigured } from "./app/composition";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 600,
  backgroundColor: "#1a1423",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [
    WorldScene,
    HudScene,
    DialogueScene,
    MinigameScene,
    ConversationScene,
    DevScene,
    AuthScene,
  ],
};

// Composition root: build the application for the chosen adapter profile, then
// start the game once the player's state has loaded. The dev harness launches
// automatically under the "local-fakes" profile (e.g. ?dev=fakes).
async function bootstrap() {
  const app = await composeApp();

  const game = new Phaser.Game(config);
  game.registry.set(REGISTRY_KEY, new GameState(app.adapters, app.player));

  if (app.adapters.fakes) {
    game.scene.start("DevScene");
  }
  // Show the login overlay whenever cloud auth is available.
  if (cloudConfigured() || app.adapters.fakes) {
    game.scene.start("AuthScene");
  }
  return game;
}

const gamePromise = bootstrap();

export default gamePromise;
