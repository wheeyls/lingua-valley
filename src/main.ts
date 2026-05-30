import Phaser from "phaser";
import { WorldScene } from "./scenes/WorldScene";
import { DialogueScene } from "./scenes/DialogueScene";
import { MinigameScene } from "./scenes/MinigameScene";
import { HudScene } from "./scenes/HudScene";
import { GameState, REGISTRY_KEY } from "./game/state";

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
  scene: [WorldScene, HudScene, DialogueScene, MinigameScene],
};

const game = new Phaser.Game(config);

// One shared domain state for the whole game.
game.registry.set(REGISTRY_KEY, new GameState());

export default game;
