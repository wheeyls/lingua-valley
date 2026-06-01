/**
 * Relationships — the daily-cadence social loop.
 *
 * Friendships are tended, not grinded. The loop rewards REGULAR, spread-out play:
 *  - Rapport DECAYS for each day you skip an NPC (after a short grace period).
 *  - A daily check-in MAINTAINS and grows it.
 *  - PER-NPC DAILY CAP: the first chat each day gives full value; repeats the
 *    same day give sharply diminishing returns (don't grind one NPC).
 *  - SOFT GLOBAL FALLOFF: the more activities you do in a single day, the less
 *    each additional one is worth (breadth + regularity beat marathon sessions).
 *
 * "Day" is the real UTC calendar day (same as Focus), so the loop naturally
 * enforces come-back-tomorrow spaced practice.
 *
 * Pure domain: formulas + a per-NPC record. No storage/framework.
 */

import { tierFor, type FriendTier } from "./friendship.js";

/** Per-NPC relationship record. Replaces the old flat rapport number. */
export interface Relationship {
  /** Accumulated rapport points (drives the friendship tier). */
  points: number;
  /** UTC day (YYYY-MM-DD) of the most recent interaction, or "" if never. */
  lastDay: string;
  /** How many times the player interacted with this NPC on `lastDay`. */
  countToday: number;
}

export function emptyRelationship(): Relationship {
  return { points: 0, lastDay: "", countToday: 0 };
}

// --- Tuning knobs -----------------------------------------------------------

/** Days you can skip an NPC before rapport starts decaying. */
export const DECAY_GRACE_DAYS = 1;
/** Rapport lost per day skipped (after the grace period). */
export const DECAY_PER_DAY = 4;
/**
 * Per-NPC same-day falloff: the Nth interaction today is worth FALLOFF^(N-1) of
 * full value. 1st = 1.0, 2nd = 0.4, 3rd = 0.16, ... So grinding one NPC tanks fast.
 */
export const PER_NPC_FALLOFF = 0.4;
/**
 * Global daily soft-cap: once you've done `SOFT_CAP_FREE` activities today, each
 * further one is multiplied by SOFT_CAP_FALLOFF^(over). Encourages breadth.
 */
export const SOFT_CAP_FREE = 6;
export const SOFT_CAP_FALLOFF = 0.75;

// --- Decay ------------------------------------------------------------------

/** Whole-day difference between two UTC day strings (b - a). 0 if equal/invalid. */
export function dayDiff(a: string, b: string): number {
  if (!a || !b) return 0;
  const ta = Date.parse(a + "T00:00:00Z");
  const tb = Date.parse(b + "T00:00:00Z");
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.round((tb - ta) / 86_400_000);
}

/**
 * Apply elapsed-day decay to a relationship as of `today`. Rapport never drops
 * below 0. Idempotent within the same day. Pure — returns a new record.
 */
export function decay(rel: Relationship, today: string): Relationship {
  if (!rel.lastDay) return rel; // never interacted; nothing to decay
  const skipped = dayDiff(rel.lastDay, today) - DECAY_GRACE_DAYS;
  if (skipped <= 0) return rel;
  const lost = skipped * DECAY_PER_DAY;
  return { ...rel, points: Math.max(0, rel.points - lost) };
}

// --- Daily-capped gain ------------------------------------------------------

export interface GainContext {
  /** UTC day of the interaction. */
  today: string;
  /** Total activities the player has already done today (for the global cap). */
  activitiesToday: number;
}

export interface GainResult {
  relationship: Relationship;
  /** Rapport actually added after per-NPC + global diminishing returns. */
  gained: number;
}

/**
 * Apply a rapport gain to an NPC's relationship, honoring decay (first), the
 * per-NPC same-day falloff, and the global daily soft-cap. Pure.
 *
 * `baseGain` is the pre-diminishing rapport (e.g. from friendship.rapportGain).
 */
export function applyGain(
  rel: Relationship,
  baseGain: number,
  ctx: GainContext,
): GainResult {
  // 1. Settle any pending decay up to today.
  const settled = decay(rel, ctx.today);

  // 2. Determine this NPC's interaction index for today.
  const sameDay = settled.lastDay === ctx.today;
  const indexToday = sameDay ? settled.countToday : 0; // 0-based

  // 3. Diminishing multipliers.
  const perNpc = Math.pow(PER_NPC_FALLOFF, indexToday);
  const over = Math.max(0, ctx.activitiesToday - SOFT_CAP_FREE);
  const global = Math.pow(SOFT_CAP_FALLOFF, over);

  const gained = Math.round(baseGain * perNpc * global);

  return {
    relationship: {
      points: settled.points + gained,
      lastDay: ctx.today,
      countToday: indexToday + 1,
    },
    gained,
  };
}

/** Convenience: tier from a relationship's points. */
export function relationshipTier(rel: Relationship): FriendTier {
  return tierFor(rel.points);
}

/** True if the player has already checked in with this NPC today (maintained). */
export function maintainedToday(rel: Relationship, today: string): boolean {
  return rel.lastDay === today;
}
