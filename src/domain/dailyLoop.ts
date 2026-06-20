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
 * Each role can be REWARDED once per day; replaying earns nothing but is always
 * allowed (free practice). A new day begins 12 hours after the day started.
 *
 * Pure domain: state + rules only, no framework.
 */

import type { ObjectiveState } from "./objective.js";

export type DailyRole = "seeds" | "water" | "store";

export const DAILY_ROLES: DailyRole[] = ["seeds", "water", "store"];

export const DAY_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface DailyState {
  /** ISO timestamp when the current day's loop started (first reward earned). */
  dayStartedAt: string;
  /** Roles whose reward has been claimed today (e.g. the water gate). */
  rewardedRoles: DailyRole[];
  /** Per-objective completion state for this cycle (keyed by objective id). */
  objectiveState: ObjectiveState;
}

export const INITIAL_DAILY_STATE: DailyState = {
  dayStartedAt: "",
  rewardedRoles: [],
  objectiveState: {},
};

/** Whether a new day has started (12h since the last dayStartedAt). */
export function isNewDay(state: DailyState, now: Date): boolean {
  if (!state.dayStartedAt) return true;
  return now.getTime() - new Date(state.dayStartedAt).getTime() >= DAY_COOLDOWN_MS;
}

/** Reset the daily state for a new day. Pure. */
export function startNewDay(now: Date): DailyState {
  return {
    dayStartedAt: now.toISOString(),
    rewardedRoles: [],
    objectiveState: {},
  };
}

/** Whether this role's reward is still available today (not yet claimed). */
export function roleEarnsReward(state: DailyState, role: DailyRole): boolean {
  return !state.rewardedRoles.includes(role);
}

/** Mark a role's reward as claimed for today. Pure — returns new state. */
export function claimRole(state: DailyState, role: DailyRole, now: Date): DailyState {
  if (state.rewardedRoles.includes(role)) return state;
  return {
    ...state,
    dayStartedAt: state.dayStartedAt || now.toISOString(),
    rewardedRoles: [...state.rewardedRoles, role],
  };
}

/** Hours remaining until the next day (0 if already a new day). */
export function hoursUntilNextDay(state: DailyState, now: Date): number {
  if (isNewDay(state, now)) return 0;
  const elapsed = now.getTime() - new Date(state.dayStartedAt).getTime();
  return Math.max(0, Math.ceil((DAY_COOLDOWN_MS - elapsed) / (60 * 60 * 1000)));
}
