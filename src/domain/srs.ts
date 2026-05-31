/**
 * Spaced repetition (SM-2-lite) for vocab "cards".
 *
 * Pure domain: takes a card + a quality score + the current time, returns the
 * next card. No clock, no storage, no framework — the caller supplies `now`.
 */

export type CardState = "seedling" | "growing" | "mature";

export interface VocabCard {
  wordId: string;
  ease: number; // 1.3 .. 2.8
  intervalDays: number;
  reps: number;
  /** ISO timestamp when the card is next due. */
  dueAt: string;
  state: CardState;
}

const EASE_MIN = 1.3;
const EASE_MAX = 2.8;
const PASS_QUALITY = 0.6;
const MATURE_REPS = 4;

export function newCard(wordId: string, now: Date): VocabCard {
  return {
    wordId,
    ease: 2.3,
    intervalDays: 0,
    reps: 0,
    dueAt: now.toISOString(),
    state: "seedling",
  };
}

/** Whether a card is due for review at `now`. */
export function isDue(card: VocabCard, now: Date): boolean {
  return new Date(card.dueAt).getTime() <= now.getTime();
}

/**
 * Advance a card given a recall `quality` in 0..1.
 *  - pass (quality >= 0.6): reps++, ease adjusts, interval grows, may mature.
 *  - fail: reset to seedling; the word must be re-watered.
 */
export function review(card: VocabCard, quality: number, now: Date): VocabCard {
  const q = clamp01(quality);
  const pass = q >= PASS_QUALITY;

  if (!pass) {
    return {
      ...card,
      reps: 0,
      intervalDays: 0,
      state: "seedling",
      dueAt: addDays(now, 0).toISOString(),
    };
  }

  const reps = card.reps + 1;
  const ease = clamp(card.ease + (0.1 - (1 - q) * 0.4), EASE_MIN, EASE_MAX);
  const intervalDays =
    reps === 1 ? 1 : reps === 2 ? 3 : Math.round(card.intervalDays * ease);
  const state: CardState = reps >= MATURE_REPS ? "mature" : "growing";

  return {
    ...card,
    reps,
    ease,
    intervalDays,
    state,
    dueAt: addDays(now, intervalDays).toISOString(),
  };
}

export function isMature(card: VocabCard): boolean {
  return card.state === "mature";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export { PASS_QUALITY, MATURE_REPS };
