import { describe, it, expect } from "vitest";
import {
  emptyRelationship,
  decay,
  applyGain,
  dayDiff,
  DECAY_GRACE_DAYS,
  DECAY_PER_DAY,
  SOFT_CAP_FREE,
  type Relationship,
} from "../relationship";

const D = (n: number) => {
  // n days after 2025-06-01
  const base = Date.parse("2025-06-01T00:00:00Z");
  return new Date(base + n * 86_400_000).toISOString().slice(0, 10);
};

function rel(points: number, lastDay: string, countToday = 0): Relationship {
  return { points, lastDay, countToday };
}

describe("dayDiff", () => {
  it("counts whole days between UTC day strings", () => {
    expect(dayDiff(D(0), D(3))).toBe(3);
    expect(dayDiff(D(5), D(5))).toBe(0);
    expect(dayDiff("", D(1))).toBe(0);
  });
});

describe("decay", () => {
  it("does nothing within the grace period", () => {
    const r = rel(100, D(0));
    expect(decay(r, D(DECAY_GRACE_DAYS)).points).toBe(100);
  });

  it("loses points per day skipped beyond the grace period", () => {
    const r = rel(100, D(0));
    // skip 4 days total -> (4 - grace) days of decay
    const skippedDecayDays = 4 - DECAY_GRACE_DAYS;
    expect(decay(r, D(4)).points).toBe(100 - skippedDecayDays * DECAY_PER_DAY);
  });

  it("never goes below zero", () => {
    expect(decay(rel(3, D(0)), D(30)).points).toBe(0);
  });

  it("ignores relationships never interacted with", () => {
    const r = emptyRelationship();
    expect(decay(r, D(10))).toEqual(r);
  });
});

describe("applyGain — daily caps & diminishing returns", () => {
  it("first chat of the day gives full value", () => {
    const { relationship, gained } = applyGain(emptyRelationship(), 10, {
      today: D(1),
      activitiesToday: 0,
    });
    expect(gained).toBe(10);
    expect(relationship.points).toBe(10);
    expect(relationship.countToday).toBe(1);
    expect(relationship.lastDay).toBe(D(1));
  });

  it("repeat chats SAME day with the SAME npc diminish sharply", () => {
    let r = applyGain(emptyRelationship(), 10, { today: D(1), activitiesToday: 0 }).relationship;
    const second = applyGain(r, 10, { today: D(1), activitiesToday: 1 });
    expect(second.gained).toBeLessThan(10); // 0.4x => 4
    r = second.relationship;
    const third = applyGain(r, 10, { today: D(1), activitiesToday: 2 });
    expect(third.gained).toBeLessThan(second.gained);
  });

  it("resets the per-npc daily counter on a new day (full value again)", () => {
    const day1 = applyGain(emptyRelationship(), 10, { today: D(1), activitiesToday: 0 });
    const day2 = applyGain(day1.relationship, 10, { today: D(2), activitiesToday: 0 });
    expect(day2.gained).toBe(10);
    expect(day2.relationship.countToday).toBe(1);
  });

  it("settles decay before applying a new gain (skipped days hurt)", () => {
    const r = rel(100, D(0));
    const res = applyGain(r, 10, { today: D(5), activitiesToday: 0 });
    // decayed first (5 - grace days), then +10
    const decayed = 100 - (5 - DECAY_GRACE_DAYS) * DECAY_PER_DAY;
    expect(res.relationship.points).toBe(decayed + 10);
  });

  it("applies the global soft-cap once past the free daily activities", () => {
    const full = applyGain(emptyRelationship(), 10, {
      today: D(1),
      activitiesToday: 0,
    }).gained;
    const capped = applyGain(emptyRelationship(), 10, {
      today: D(1),
      activitiesToday: SOFT_CAP_FREE + 4,
    }).gained;
    expect(capped).toBeLessThan(full);
  });
});
