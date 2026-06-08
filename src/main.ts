/**
 * Entry point — pure HTML/CSS app, no Phaser.
 *
 * Composes the application (adapters, player service) and starts the
 * GameController, which renders everything as DOM elements.
 */

import { composeApp } from "./app/composition";
import { GameController } from "./app/GameController";

async function bootstrap() {
  const app = await composeApp();
  const controller = new GameController(app.player, app.adapters);
  controller.start();
}

bootstrap().catch((err) => {
  console.error("[bootstrap] fatal error:", err);
  const el = document.getElementById("game");
  if (el) {
    el.innerHTML =
      '<div style="color:#f4ecd8;font-family:sans-serif;padding:24px;text-align:center;max-width:480px">' +
      "<h2>Couldn't start the game</h2>" +
      "<p style=\"color:#b56576\">" +
      String(err instanceof Error ? err.message : err) +
      "</p></div>";
  }
});
