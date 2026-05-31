/**
 * The comprehension model — the core of the "soft gate" mechanic.
 *
 * You can physically walk into any area. But whether you can *understand* and
 * therefore *act* on what NPCs say depends on whether your mastered objectives
 * cover the level that dialogue is written at.
 *
 * If a line is above your level, we garble it proportionally — the higher the
 * gap, the more of the words become unintelligible "noise". This makes the
 * barrier felt, not just stated: an over-level area literally speaks over your
 * head until you learn.
 */

import type { CefrLevel } from "./cefr.js";
import { levelRank } from "./cefr.js";
import type { Proficiency } from "./proficiency.js";

export interface ComprehensionResult {
  /** 0..1 — how much of the line the player understands. */
  clarity: number;
  /** The line as the player perceives it (garbled where not understood). */
  rendered: string;
  /** True if the player understands enough to act on the line. */
  actionable: boolean;
}

/** Below this clarity, the player can't act on (respond to) the dialogue. */
const ACTIONABLE_THRESHOLD = 0.6;

/**
 * Compute how well the player comprehends a line written at `lineLevel`.
 *
 * Rules:
 *  - At or below the player's mastery of the line's level, clarity scales with
 *    how much of that level they've mastered.
 *  - One level above their comfortable range: heavily garbled.
 *  - Two+ levels above: near-total noise.
 */
export function comprehend(
  text: string,
  lineLevel: CefrLevel,
  prof: Proficiency,
  englishAvailability = 1,
): ComprehensionResult {
  const clarity = clarityFor(lineLevel, prof, englishAvailability);
  return {
    clarity,
    rendered: garble(text, clarity),
    actionable: clarity >= ACTIONABLE_THRESHOLD,
  };
}

/**
 * Compute clarity for a line. `englishAvailability` (0..1) is the town's help
 * level — the metropolis (1) is fully forgiving; remote towns (lower) apply a
 * comprehension penalty so over-level speech garbles harder. Lines AT or under
 * the player's established level stay fully clear regardless (you've earned it).
 */
export function clarityFor(
  lineLevel: CefrLevel,
  prof: Proficiency,
  englishAvailability = 1,
): number {
  const base = baseClarity(lineLevel, prof);
  if (base >= 1) return 1; // mastered content is always clear
  // Remote towns sap clarity of not-yet-comfortable speech.
  const penalty = 0.5 * (1 - clampUnit(englishAvailability));
  return clampUnit(base * (1 - penalty));
}

function baseClarity(lineLevel: CefrLevel, prof: Proficiency): number {
  const effective = prof.effectiveLevel();
  const lineRank = levelRank(lineLevel);

  // Mastery within the line's own level (0..1).
  const ownMastery = prof.levelMastery(lineLevel);

  if (effective === null) {
    if (lineRank === 0) return ownMastery;
    return Math.max(0, ownMastery * 0.2 - 0.05 * lineRank);
  }

  const effRank = levelRank(effective);
  const gap = lineRank - effRank;

  if (gap <= 0) return 1;
  if (gap === 1) {
    return clampUnit(0.25 + 0.55 * ownMastery);
  }
  return clampUnit(0.05 * ownMastery);
}

function clampUnit(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Garble a string so that roughly (1 - clarity) of its words become noise.
 * We keep punctuation and word boundaries so the *shape* of speech survives —
 * the player can tell someone is speaking, just not what they mean.
 */
export function garble(text: string, clarity: number): string {
  if (clarity >= 0.999) return text;
  if (clarity <= 0.001) return text.replace(/[^\s.,!?¿¡]/g, "·");

  // Deterministic per-word garbling based on word index so the same line looks
  // stable across re-renders (no flicker).
  const words = text.split(/(\s+)/); // keep whitespace tokens
  let wordIndex = 0;
  return words
    .map((tok) => {
      if (/^\s+$/.test(tok)) return tok;
      const understandThisWord = pseudoRandom(wordIndex++) < clarity;
      if (understandThisWord) return tok;
      return tok.replace(/[^.,!?¿¡]/g, "·");
    })
    .join("");
}

/** Cheap deterministic 0..1 hash for a word index. */
function pseudoRandom(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export { ACTIONABLE_THRESHOLD };
