/**
 * Day completion — triggered when the player waters their flower after
 * completing all daily objectives. Pure domain.
 */

import type { ObjectiveState } from "./objective.js";
import type { ObjectiveGraph } from "./objective.js";

/** Whether all objectives in the graph are complete (day is finishable). */
export function allObjectivesComplete(
  graph: ObjectiveGraph,
  state: ObjectiveState,
): boolean {
  return graph.all().every((obj) => state[obj.id] != null);
}

/** Result of completing the day. */
export interface DayCompleteResult {
  /** Total pesos earned today (sum of objective rewards). */
  totalReward: number;
  /** When the house resets (ISO timestamp). */
  nextResetAt: string;
  /** How many hours until reset. */
  hoursUntilReset: number;
}

export const DAY_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function completeDayResult(now: Date, totalReward: number): DayCompleteResult {
  const nextReset = new Date(now.getTime() + DAY_COOLDOWN_MS);
  return {
    totalReward,
    nextResetAt: nextReset.toISOString(),
    hoursUntilReset: 12,
  };
}
