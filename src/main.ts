import Phaser from "phaser";
import { WorldScene } from "./scenes/WorldScene";
import { DialogueScene } from "./scenes/DialogueScene";
import { MinigameScene } from "./scenes/MinigameScene";
import { ConversationScene } from "./scenes/ConversationScene";
import { HudScene } from "./scenes/HudScene";
import { GameState, REGISTRY_KEY } from "./game/state";
import { composeGuestApp } from "./app/composition";

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
  scene: [WorldScene, HudScene, DialogueScene, MinigameScene, ConversationScene],
};

// Composition root: build the application (guest path today; cloud activates
// when Supabase env vars + sign-in are present), then start the game once the
// player's state has loaded.
async function bootstrap() {
  const app = composeGuestApp();
  await app.player.init();

  const game = new Phaser.Game(config);
  game.registry.set(REGISTRY_KEY, new GameState(app.player));
  return game;
}

const gamePromise = bootstrap();

export default gamePromise;
