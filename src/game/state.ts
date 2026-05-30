/**
 * Shared game state bridging the pure domain (Proficiency) and Phaser scenes.
 * A single instance is created in main.ts and passed via the Phaser registry.
 */

import { Proficiency } from "../domain/proficiency";
import { curriculumByLevel } from "../content/curriculum";

const STORAGE_KEY = "lingua-valley.mastered";

function loadMastered(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export class GameState {
  readonly proficiency: Proficiency;

  constructor() {
    this.proficiency = new Proficiency(curriculumByLevel(), loadMastered());
    // Persist on every change.
    this.proficiency.subscribe((snap) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(snap.masteredObjectiveIds),
        );
      } catch {
        /* ignore storage errors */
      }
    });
  }
}

export const REGISTRY_KEY = "gameState";
