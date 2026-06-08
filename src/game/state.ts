/**
 * Shared game state bridging the application layer and Phaser scenes.
 * Constructed once at the composition root (main.ts) and passed via the Phaser
 * registry. Holds no game rules — it wires PlayerService to the Proficiency
 * view (level progress / mastery) and exposes the adapters + services scenes need.
 */

import { Proficiency } from "../domain/proficiency";
import { curriculumByLevel } from "../content/curriculum";
import type { PlayerService } from "../app/PlayerService";
import { QuestService } from "../app/QuestService";
import { buildDailyGraph } from "../domain/objectives/daily";
import type { ObjectiveGraph } from "../domain/objective";
import type { Adapters } from "../app/adapters";

export class GameState {
  /** Proficiency view kept in sync with the player's mastered objectives. */
  readonly proficiency: Proficiency;
  readonly player: PlayerService;
  readonly quests: QuestService;
  /** The daily objective graph (pure domain — deps, data flow, completion). */
  readonly objectives: ObjectiveGraph;
  readonly adapters: Adapters;

  constructor(adapters: Adapters, player: PlayerService) {
    this.adapters = adapters;
    this.player = player;
    this.quests = new QuestService(player);
    this.objectives = buildDailyGraph();
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
