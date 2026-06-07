import { describe, it, expect } from "vitest";
import {
  INITIAL_DAILY_STATE,
  isNewDay,
  startNewDay,
  currentStep,
  completeStep,
  isDayDone,
  setTodayStory,
  stepEarnsReward,
  hoursUntilNextDay,
  DAY_COOLDOWN_MS,
} from "../dailyLoop";

const NOW = new Date("2025-06-01T12:00:00Z");

describe("daily loop", () => {
  it("starts as a new day with rosa as the first step", () => {
    expect(isNewDay(INITIAL_DAILY_STATE, NOW)).toBe(true);
    const day = startNewDay(NOW);
    expect(currentStep(day)).toBe("rosa");
    expect(isDayDone(day)).toBe(false);
  });

  it("progresses through rosa → marisol → pablo, then day is done", () => {
    let s = startNewDay(NOW);
    expect(currentStep(s)).toBe("rosa");

    s = completeStep(s, "rosa");
    expect(currentStep(s)).toBe("marisol");

    s = completeStep(s, "marisol");
    expect(currentStep(s)).toBe("pablo");

    s = completeStep(s, "pablo");
    expect(isDayDone(s)).toBe(true);
    expect(currentStep(s)).toBeNull();
  });

  it("is not a new day until 12 hours have passed", () => {
    const s = startNewDay(NOW);
    const sixHoursLater = new Date(NOW.getTime() + 6 * 60 * 60 * 1000);
    expect(isNewDay(s, sixHoursLater)).toBe(false);

    const twelveHoursLater = new Date(NOW.getTime() + DAY_COOLDOWN_MS);
    expect(isNewDay(s, twelveHoursLater)).toBe(true);
  });

  it("duplicate step completion is idempotent", () => {
    let s = startNewDay(NOW);
    s = completeStep(s, "rosa");
    const again = completeStep(s, "rosa");
    expect(again.completedSteps).toEqual(["rosa"]);
  });

  it("tracks rewards: first completion earns, replay doesn't", () => {
    let s = startNewDay(NOW);
    expect(stepEarnsReward(s, "rosa")).toBe(true);
    s = completeStep(s, "rosa");
    expect(stepEarnsReward(s, "rosa")).toBe(false); // replay
  });

  it("stores and retrieves today's story", () => {
    let s = startNewDay(NOW);
    s = setTodayStory(s, "Ayer fui al mercado.");
    expect(s.todayStory).toBe("Ayer fui al mercado.");
  });

  it("reports hours until next day", () => {
    const s = startNewDay(NOW);
    expect(hoursUntilNextDay(s, NOW)).toBe(12);
    const later = new Date(NOW.getTime() + 10 * 60 * 60 * 1000);
    expect(hoursUntilNextDay(s, later)).toBe(2);
  });
});
