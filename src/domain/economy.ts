/**
 * The economy: reward formulas and Focus (daily stamina) logic.
 *
 * Pure domain. These functions are the SINGLE source of truth for how a graded
 * activity becomes resources. The server runs them authoritatively; guests run
 * the very same functions client-side. No client-supplied numbers are trusted
 * downstream — callers re-derive from the raw grade.
 */

import type { CefrLevel } from "./cefr";
import { levelRank } from "./cefr";
import { FOCUS_MAX } from "./player";

export const BASE_PESOS = 10;
export const ACTIVITY_FOCUS_COST = 5;
export const REWARD_THRESHOLD = 0.5; // below this quality, no pesos (but still practice)

export interface ActivityReward {
  quality: number; // 0..1
  pesos: number;
  skillGain: number;
  /** Quality used for SRS card review (same as `quality`). */
  cardQuality: number;
}

/** Combine the grade components into a single 0..1 quality score. */
export function quality(communication: number, accuracy: number): number {
  return clamp01(0.6 * clamp01(communication) + 0.4 * clamp01(accuracy));
}

/** Higher levels pay more: A1 x1.0, A2 x1.25, B1 x1.5, ... */
export function levelMultiplier(level: CefrLevel): number {
  return 1 + 0.25 * levelRank(level);
}

/** Compute the reward for an activity from its raw grade. Pure & deterministic. */
export function computeReward(
  communication: number,
  accuracy: number,
  level: CefrLevel,
): ActivityReward {
  const q = quality(communication, accuracy);
  const pesos =
    q >= REWARD_THRESHOLD ? Math.round(BASE_PESOS * q * levelMultiplier(level)) : 0;
  const skillGain = Math.round(100 * q);
  return { quality: q, pesos, skillGain, cardQuality: q };
}

// --- Focus (daily stamina) -------------------------------------------------

export interface FocusState {
  focus: number;
  focusDay: string;
}

/**
 * Apply daily regen: if `today` differs from the pool's day, refill to max.
 * Returns a new FocusState (never mutates).
 */
export function regenFocus(state: FocusState, today: string): FocusState {
  if (state.focusDay !== today) {
    return { focus: FOCUS_MAX, focusDay: today };
  }
  return state;
}

export function canAfford(state: FocusState, cost = ACTIVITY_FOCUS_COST): boolean {
  return state.focus >= cost;
}

/**
 * Spend focus for an activity. Caller should regen first (pass `today`).
 * Returns the new state and whether it succeeded. Never goes negative.
 */
export function spendFocus(
  state: FocusState,
  today: string,
  cost = ACTIVITY_FOCUS_COST,
): { state: FocusState; ok: boolean } {
  const regenned = regenFocus(state, today);
  if (regenned.focus < cost) return { state: regenned, ok: false };
  return { state: { ...regenned, focus: regenned.focus - cost }, ok: true };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
