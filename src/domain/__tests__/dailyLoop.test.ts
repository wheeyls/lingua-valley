import { describe, it, expect } from "vitest";
import {
  INITIAL_DAILY_STATE,
  isNewDay,
  startNewDay,
  roleEarnsReward,
  claimRole,
  hoursUntilNextDay,
  DAY_COOLDOWN_MS,
} from "../dailyLoop";

const NOW = new Date("2025-06-01T12:00:00Z");

describe("daily loop", () => {
  it("starts as a new day with no roles claimed", () => {
    expect(isNewDay(INITIAL_DAILY_STATE, NOW)).toBe(true);
    const day = startNewDay(NOW);
    expect(day.rewardedRoles).toEqual([]);
    expect(roleEarnsReward(day, "water")).toBe(true);
  });

  it("is not a new day until 12 hours have passed", () => {
    const s = startNewDay(NOW);
    const sixHoursLater = new Date(NOW.getTime() + 6 * 60 * 60 * 1000);
    expect(isNewDay(s, sixHoursLater)).toBe(false);

    const twelveHoursLater = new Date(NOW.getTime() + DAY_COOLDOWN_MS);
    expect(isNewDay(s, twelveHoursLater)).toBe(true);
  });

  it("tracks rewards per role: first claim earns, replay doesn't", () => {
    let s = startNewDay(NOW);
    expect(roleEarnsReward(s, "water")).toBe(true);
    s = claimRole(s, "water", NOW);
    expect(roleEarnsReward(s, "water")).toBe(false); // replay
    // other roles still available
    expect(roleEarnsReward(s, "seeds")).toBe(true);
    expect(roleEarnsReward(s, "store")).toBe(true);
  });

  it("claiming a role is idempotent", () => {
    let s = startNewDay(NOW);
    s = claimRole(s, "water", NOW);
    const again = claimRole(s, "water", NOW);
    expect(again.rewardedRoles).toEqual(["water"]);
  });

  it("first claim from a blank day stamps dayStartedAt", () => {
    const s = claimRole(INITIAL_DAILY_STATE, "seeds", NOW);
    expect(s.dayStartedAt).toBe(NOW.toISOString());
  });

  it("reports hours until next day", () => {
    const s = startNewDay(NOW);
    expect(hoursUntilNextDay(s, NOW)).toBe(12);
    const later = new Date(NOW.getTime() + 10 * 60 * 60 * 1000);
    expect(hoursUntilNextDay(s, later)).toBe(2);
  });
});
