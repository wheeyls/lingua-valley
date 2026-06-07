/**
 * Daily loop — the core gameplay cadence.
 *
 * Each "day" (12-hour cycle) has exactly 3 steps in order:
 *   1. Greet Rosa (casual greeting conversation)
 *   2. Listen to Marisol's story (past-tense narration)
 *   3. Retell the story to Pablo (graded retelling)
 *
 * After all 3, the day is "done" — you can replay for fun but earn no rewards.
 * The next day starts 12 hours after you completed (or first attempted) today's
 * loop.
 *
 * Pure domain: state + rules only, no framework.
 */

export type DailyStepId = "rosa" | "marisol" | "pablo";

export const DAILY_STEPS: DailyStepId[] = ["rosa", "marisol", "pablo"];

export const DAY_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface DailyState {
  /** Which steps have been completed today (in order). */
  completedSteps: DailyStepId[];
  /** ISO timestamp when the current day's loop started (first step attempted). */
  dayStartedAt: string;
  /** The LLM-generated story Marisol told today (set after the Marisol step). */
  todayStory: string;
}

export const INITIAL_DAILY_STATE: DailyState = {
  completedSteps: [],
  dayStartedAt: "",
  todayStory: "",
};

/** Whether a new day has started (12h since the last dayStartedAt). */
export function isNewDay(state: DailyState, now: Date): boolean {
  if (!state.dayStartedAt) return true;
  return now.getTime() - new Date(state.dayStartedAt).getTime() >= DAY_COOLDOWN_MS;
}

/** Reset the daily state for a new day. Pure. */
export function startNewDay(now: Date): DailyState {
  return {
    completedSteps: [],
    dayStartedAt: now.toISOString(),
    todayStory: "",
  };
}

/** The next step the player should do (or null if the day is done). */
export function currentStep(state: DailyState): DailyStepId | null {
  for (const step of DAILY_STEPS) {
    if (!state.completedSteps.includes(step)) return step;
  }
  return null; // all done
}

/** Mark a step complete. Pure — returns new state. */
export function completeStep(
  state: DailyState,
  step: DailyStepId,
): DailyState {
  if (state.completedSteps.includes(step)) return state;
  return { ...state, completedSteps: [...state.completedSteps, step] };
}

/** Whether all 3 steps are done (day is over). */
export function isDayDone(state: DailyState): boolean {
  return currentStep(state) === null;
}

/** Store the story Marisol told (for Pablo's retelling comparison). */
export function setTodayStory(state: DailyState, story: string): DailyState {
  return { ...state, todayStory: story };
}

/** Whether this step earns rewards (first completion of the day, not a replay). */
export function stepEarnsReward(
  state: DailyState,
  step: DailyStepId,
): boolean {
  return !state.completedSteps.includes(step);
}

/** Hours remaining until the next day (0 if already a new day). */
export function hoursUntilNextDay(state: DailyState, now: Date): number {
  if (isNewDay(state, now)) return 0;
  const elapsed = now.getTime() - new Date(state.dayStartedAt).getTime();
  return Math.max(0, Math.ceil((DAY_COOLDOWN_MS - elapsed) / (60 * 60 * 1000)));
}
