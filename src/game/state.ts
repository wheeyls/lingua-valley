/**
 * Shared game state bridging the application layer and Phaser scenes.
 * Constructed once at the composition root (main.ts) and passed via the Phaser
 * registry. Holds no game rules — it wires PlayerService to the Proficiency
 * view the comprehension gate consumes, and exposes the adapters scenes need.
 */

import { Proficiency } from "../domain/proficiency";
import { curriculumByLevel } from "../content/curriculum";
import type { PlayerService } from "../app/PlayerService";
import type { Adapters } from "../app/adapters";

export class GameState {
  /** Proficiency view kept in sync with the player's mastered objectives. */
  readonly proficiency: Proficiency;
  readonly player: PlayerService;
  readonly adapters: Adapters;

  constructor(adapters: Adapters, player: PlayerService) {
    this.adapters = adapters;
    this.player = player;
    this.proficiency = new Proficiency(
      curriculumByLevel(),
      player.getState().masteredObjectiveIds,
    );
    player.subscribe((state) => {
      for (const id of state.masteredObjectiveIds) {
        this.proficiency.master(id);
      }
    });
  }
}

export const REGISTRY_KEY = "gameState";
