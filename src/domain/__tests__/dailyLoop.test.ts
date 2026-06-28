import { describe, it, expect } from "vitest";
import {
  INITIAL_DAILY_STATE,
  isNewDay,
  startNewDay,
  roleEarnsReward,
  claimRole,
  objectiveEarnsReward,
  claimObjective,
  recordPlay,
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

  it("tracks money rewards per objective, independent of roles", () => {
    let s = startNewDay(NOW);
    expect(objectiveEarnsReward(s, "story-telling")).toBe(true);
    s = claimObjective(s, "story-telling", NOW);
    expect(objectiveEarnsReward(s, "story-telling")).toBe(false); // replay
    // A second objective sharing the same role still earns.
    expect(objectiveEarnsReward(s, "story-retell")).toBe(true);
  });

  it("claiming an objective is idempotent and stamps the day", () => {
    let s = claimObjective(INITIAL_DAILY_STATE, "story-telling", NOW);
    expect(s.dayStartedAt).toBe(NOW.toISOString());
    s = claimObjective(s, "story-telling", NOW);
    expect(s.rewardedObjectives).toEqual(["story-telling"]);
  });

  it("reports hours until next day", () => {
    const s = startNewDay(NOW);
    expect(hoursUntilNextDay(s, NOW)).toBe(12);
    const later = new Date(NOW.getTime() + 10 * 60 * 60 * 1000);
    expect(hoursUntilNextDay(s, later)).toBe(2);
  });
});

describe("streak (recordPlay)", () => {
  const day = (d: string) => new Date(`${d}T12:00:00Z`);

  it("starts a streak at 1 on the first play", () => {
    const s = recordPlay(INITIAL_DAILY_STATE, day("2025-06-01"));
    expect(s.streak).toBe(1);
    expect(s.lastPlayedDay).toBe("2025-06-01");
  });

  it("does not double-count the same day", () => {
    let s = recordPlay(INITIAL_DAILY_STATE, day("2025-06-01"));
    s = recordPlay(s, new Date("2025-06-01T20:00:00Z"));
    expect(s.streak).toBe(1);
  });

  it("increments on consecutive days", () => {
    let s = recordPlay(INITIAL_DAILY_STATE, day("2025-06-01"));
    s = recordPlay(s, day("2025-06-02"));
    s = recordPlay(s, day("2025-06-03"));
    expect(s.streak).toBe(3);
  });

  it("resets to 1 after missing a day", () => {
    let s = recordPlay(INITIAL_DAILY_STATE, day("2025-06-01"));
    s = recordPlay(s, day("2025-06-02"));
    s = recordPlay(s, day("2025-06-05")); // gap
    expect(s.streak).toBe(1);
  });

  it("startNewDay carries the streak forward", () => {
    let s = recordPlay(INITIAL_DAILY_STATE, day("2025-06-01"));
    s = recordPlay(s, day("2025-06-02"));
    const fresh = startNewDay(day("2025-06-03"), s);
    expect(fresh.streak).toBe(2);
    expect(fresh.rewardedRoles).toEqual([]);
  });
});
