import Phaser from "phaser";
import { WorldScene } from "./scenes/WorldScene";
import { DialogueScene } from "./scenes/DialogueScene";
import { MinigameScene } from "./scenes/MinigameScene";
import { ConversationScene } from "./scenes/ConversationScene";
import { TradeScene } from "./scenes/TradeScene";
import { HudScene } from "./scenes/HudScene";
import { DevScene } from "./scenes/DevScene";
import { AuthScene } from "./scenes/AuthScene";
import { GameState, REGISTRY_KEY } from "./game/state";
import { composeApp } from "./app/composition";
import { cloudConfigured } from "./app/composition";
import { VIEW_WIDTH, VIEW_HEIGHT } from "./game/layout";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: "#1a1423",
  pixelArt: true,
  // Responsive: fit the portrait canvas to any screen, centered.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
  },
  input: { activePointers: 3 }, // multi-touch (joystick-less, but tap + hold mic)
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
    TradeScene,
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
  // Auth UI is now part of the HUD header (HudScene), so AuthScene is no longer
  // launched separately. cloudConfigured retained for future use.
  void cloudConfigured;
  return game;
}

const gamePromise = bootstrap();

export default gamePromise;
