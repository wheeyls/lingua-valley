/**
 * Daily loop — the farming cadence.
 *
 * The day is structured around three roles, each fulfilled by a conversation:
 *
 *   1. SEEDS  — the intro/"new lesson" conversation. Earns a batch of seeds,
 *               which plants one crop and sets the week's lesson theme.
 *   2. WATER  — the daily practice conversation. Waters the whole field, which
 *               grows every crop +1 unit. This is the GROWTH DRIVER and is gated
 *               to once per day.
 *   3. STORE  — the review / "unit test" conversation. Sells harvest-ready crops
 *               for money, which buys a train ticket to the next area.
 *
 * MONEY comes only from selling crops at the store. GROWTH (watering) is gated
 * once per day per ROLE, so the field only advances one step a day no matter how
 * many water conversations you have. Replaying earns nothing but is always
 * allowed (free practice). A new day begins 12 hours after the day started.
 *
 * Pure domain: state + rules only, no framework.
 */

import type { ObjectiveState } from "./objective.js";
import { appDay } from "./time.js";

export type DailyRole = "seeds" | "water" | "store";

export const DAILY_ROLES: DailyRole[] = ["seeds", "water", "store"];

export const DAY_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface DailyState {
  /** ISO timestamp when the current day's loop started (first reward earned). */
  dayStartedAt: string;
  /** Roles whose GROWTH (watering) has fired today. */
  rewardedRoles: DailyRole[];
  /** Objective ids whose MONEY reward has been claimed today. */
  rewardedObjectives: string[];
  /** Per-objective completion state for this cycle (keyed by objective id). */
  objectiveState: ObjectiveState;
  /** Consecutive days the player has practiced (the streak). */
  streak: number;
  /** App-timezone (Pacific) day (YYYY-MM-DD) of the most recent activity, or "" if never. */
  lastPlayedDay: string;
}

export const INITIAL_DAILY_STATE: DailyState = {
  dayStartedAt: "",
  rewardedRoles: [],
  rewardedObjectives: [],
  objectiveState: {},
  streak: 0,
  lastPlayedDay: "",
};

/** Whether a new day has started (12h since the last dayStartedAt). */
export function isNewDay(state: DailyState, now: Date): boolean {
  if (!state.dayStartedAt) return true;
  return now.getTime() - new Date(state.dayStartedAt).getTime() >= DAY_COOLDOWN_MS;
}

/**
 * Reset the per-day gates for a new day. Pure. Carries the streak forward
 * (the streak is advanced separately by `recordPlay` when the player acts).
 */
export function startNewDay(now: Date, prev?: DailyState): DailyState {
  return {
    dayStartedAt: now.toISOString(),
    rewardedRoles: [],
    rewardedObjectives: [],
    objectiveState: {},
    streak: prev?.streak ?? 0,
    lastPlayedDay: prev?.lastPlayedDay ?? "",
  };
}

/** The day key immediately before `day` (YYYY-MM-DD). */
function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Record that the player did something today, advancing the streak. Pure.
 *  - first activity ever / after a gap → streak resets to 1
 *  - consecutive day (yesterday was the last) → streak + 1
 *  - same day again → unchanged
 */
export function recordPlay(state: DailyState, now: Date): DailyState {
  const today = appDay(now);
  if (state.lastPlayedDay === today) return state; // already counted today
  const streak =
    state.lastPlayedDay && state.lastPlayedDay === previousDay(today)
      ? state.streak + 1
      : 1;
  return { ...state, streak, lastPlayedDay: today };
}

/** Whether this role's GROWTH (watering) is still available today. */
export function roleEarnsReward(state: DailyState, role: DailyRole): boolean {
  return !state.rewardedRoles.includes(role);
}

/** Mark a role's growth as fired for today. Pure — returns new state. */
export function claimRole(state: DailyState, role: DailyRole, now: Date): DailyState {
  if (state.rewardedRoles.includes(role)) return state;
  return {
    ...state,
    dayStartedAt: state.dayStartedAt || now.toISOString(),
    rewardedRoles: [...state.rewardedRoles, role],
  };
}

/** Whether this objective's MONEY reward is still available today. */
export function objectiveEarnsReward(state: DailyState, objectiveId: string): boolean {
  return !state.rewardedObjectives.includes(objectiveId);
}

/** Mark an objective's money as claimed for today. Pure — returns new state. */
export function claimObjective(
  state: DailyState,
  objectiveId: string,
  now: Date,
): DailyState {
  if (state.rewardedObjectives.includes(objectiveId)) return state;
  return {
    ...state,
    dayStartedAt: state.dayStartedAt || now.toISOString(),
    rewardedObjectives: [...state.rewardedObjectives, objectiveId],
  };
}

/** Hours remaining until the next day (0 if already a new day). */
export function hoursUntilNextDay(state: DailyState, now: Date): number {
  if (isNewDay(state, now)) return 0;
  const elapsed = now.getTime() - new Date(state.dayStartedAt).getTime();
  return Math.max(0, Math.ceil((DAY_COOLDOWN_MS - elapsed) / (60 * 60 * 1000)));
}
