/**
 * The economy: how a graded conversation becomes money.
 *
 * Pure domain. This is the SINGLE source of truth for turning a grade into a
 * reward. The server runs it authoritatively; guests run the very same function
 * client-side. No client-supplied numbers are trusted downstream — callers
 * re-derive from the raw grade.
 *
 * The farming loop's stamina model is the DAILY GATE, not a focus pool: each
 * reward-bearing conversation can only be earned once per day (see dailyLoop).
 * You can practice as much as you like; you just can't farm rewards.
 */

import type { CefrLevel } from "./cefr.js";
import { levelRank } from "./cefr.js";

export const BASE_MONEY = 10;
export const REWARD_THRESHOLD = 0.5; // below this quality, no money (but still practice)

export interface ActivityReward {
  quality: number; // 0..1
  /** Money awarded for this conversation (0 below the quality threshold). */
  money: number;
}

/** Combine the grade components into a single 0..1 quality score. */
export function quality(communication: number, accuracy: number): number {
  return clamp01(0.6 * clamp01(communication) + 0.4 * clamp01(accuracy));
}

/** Higher levels pay more: A1 x1.0, A2 x1.25, B1 x1.5, ... */
export function levelMultiplier(level: CefrLevel): number {
  return 1 + 0.25 * levelRank(level);
}

/** Compute the reward for a conversation from its raw grade. Pure & deterministic. */
export function computeReward(
  communication: number,
  accuracy: number,
  level: CefrLevel,
): ActivityReward {
  const q = quality(communication, accuracy);
  const money =
    q >= REWARD_THRESHOLD ? Math.round(BASE_MONEY * q * levelMultiplier(level)) : 0;
  return { quality: q, money };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
