/**
 * The player's language proficiency.
 *
 * Progression is purely a function of which learning objectives the player has
 * mastered — there is no XP, no health, no character level. You "level up" by
 * proving you can do things in Spanish.
 */

import type { CefrLevel, LearningObjective } from "./cefr.js";
import { CEFR_LEVELS, levelRank } from "./cefr.js";

export interface ProficiencySnapshot {
  /** IDs of every objective the player has mastered. */
  masteredObjectiveIds: string[];
  /** The highest level for which ALL objectives are mastered. */
  effectiveLevel: CefrLevel | null;
}

type Listener = (snapshot: ProficiencySnapshot) => void;

export class Proficiency {
  private mastered = new Set<string>();
  private listeners = new Set<Listener>();

  constructor(
    /** The full curriculum, grouped by level, used to compute effective level. */
    private readonly objectivesByLevel: Map<CefrLevel, LearningObjective[]>,
    /** Optionally restore previously mastered objective ids. */
    initialMastered: string[] = [],
  ) {
    for (const id of initialMastered) this.mastered.add(id);
  }

  isMastered(objectiveId: string): boolean {
    return this.mastered.has(objectiveId);
  }

  /** Mark an objective mastered. Returns true if this was newly mastered. */
  master(objectiveId: string): boolean {
    if (this.mastered.has(objectiveId)) return false;
    this.mastered.add(objectiveId);
    this.emit();
    return true;
  }

  masteredCount(level: CefrLevel): number {
    const objs = this.objectivesByLevel.get(level) ?? [];
    return objs.filter((o) => this.mastered.has(o.id)).length;
  }

  totalCount(level: CefrLevel): number {
    return (this.objectivesByLevel.get(level) ?? []).length;
  }

  /**
   * Fraction (0..1) of a level's objectives the player has mastered.
   * Used by the HUD level bars and to compute the effective level.
   */
  levelMastery(level: CefrLevel): number {
    const total = this.totalCount(level);
    if (total === 0) return 1;
    return this.masteredCount(level) / total;
  }

  /**
   * The highest CEFR level for which the player has mastered EVERY objective.
   * Null until at least one full level is complete.
   */
  effectiveLevel(): CefrLevel | null {
    let highest: CefrLevel | null = null;
    for (const level of CEFR_LEVELS) {
      const total = this.totalCount(level);
      if (total === 0) continue;
      if (this.masteredCount(level) === total) {
        if (highest === null || levelRank(level) > levelRank(highest)) {
          highest = level;
        }
      } else {
        // Levels are sequential; stop at first incomplete level.
        break;
      }
    }
    return highest;
  }

  snapshot(): ProficiencySnapshot {
    return {
      masteredObjectiveIds: [...this.mastered],
      effectiveLevel: this.effectiveLevel(),
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }
}
