/**
 * CEFR (Common European Framework of Reference) levels.
 * Each game Area is tied to a level. The player must master the learning
 * objectives of their current level before the next Area's dialogue becomes
 * comprehensible.
 *
 * This module is pure domain logic — no Phaser, fully testable.
 */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Numeric rank so we can compare levels (A1 < A2 < B1 ...). */
export function levelRank(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function isAtLeast(have: CefrLevel, required: CefrLevel): boolean {
  return levelRank(have) >= levelRank(required);
}

/**
 * A single, granular thing a learner can master — e.g. "greet someone",
 * "count to ten", "use the verb SER in present tense".
 *
 * Objectives are the atomic unit of progression. The player levels up by
 * mastering objectives, never by grinding XP.
 */
export interface LearningObjective {
  id: string;
  level: CefrLevel;
  /** Short human label shown in the proficiency HUD. */
  label: string;
  /** What the learner can do once mastered (a "can-do" statement). */
  canDo: string;
  /** Vocabulary / phrases that exercise this objective. */
  vocab: VocabEntry[];
}

export interface VocabEntry {
  es: string;
  en: string;
  /** Optional usage example sentence in Spanish. */
  example?: string;
}
