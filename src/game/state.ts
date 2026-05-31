/**
 * Shared game state bridging the domain/application layer and Phaser scenes.
 * Constructed once at the composition root (main.ts) and passed via the
 * Phaser registry. Holds no game rules — it wires PlayerService to the
 * Proficiency view the comprehension gate consumes.
 */

import { Proficiency } from "../domain/proficiency";
import { curriculumByLevel } from "../content/curriculum";
import type { PlayerService } from "../app/PlayerService";

export class GameState {
  /** Proficiency view kept in sync with the player's mastered objectives. */
  readonly proficiency: Proficiency;

  constructor(readonly player: PlayerService) {
    this.proficiency = new Proficiency(
      curriculumByLevel(),
      player.getState().masteredObjectiveIds,
    );
    // Keep the comprehension gate's view in sync with authoritative mastery.
    player.subscribe((state) => {
      for (const id of state.masteredObjectiveIds) {
        this.proficiency.master(id);
      }
    });
  }
}

export const REGISTRY_KEY = "gameState";
