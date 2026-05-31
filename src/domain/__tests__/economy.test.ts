import { describe, it, expect } from "vitest";
import {
  quality,
  levelMultiplier,
  computeReward,
  regenFocus,
  canAfford,
  spendFocus,
  BASE_PESOS,
  REWARD_THRESHOLD,
  ACTIVITY_FOCUS_COST,
} from "../economy";
import { FOCUS_MAX } from "../player";

describe("quality", () => {
  it("weights communication 60/40 over accuracy", () => {
    expect(quality(1, 0)).toBeCloseTo(0.6);
    expect(quality(0, 1)).toBeCloseTo(0.4);
    expect(quality(1, 1)).toBe(1);
  });
  it("clamps inputs", () => {
    expect(quality(2, 2)).toBe(1);
    expect(quality(-1, -1)).toBe(0);
  });
});

describe("levelMultiplier", () => {
  it("scales with CEFR rank", () => {
    expect(levelMultiplier("A1")).toBe(1);
    expect(levelMultiplier("A2")).toBe(1.25);
    expect(levelMultiplier("B1")).toBe(1.5);
  });
});

describe("computeReward", () => {
  it("pays nothing below the reward threshold", () => {
    const r = computeReward(0.4, 0.4, "A1"); // quality 0.4 < 0.5
    expect(r.quality).toBeLessThan(REWARD_THRESHOLD);
    expect(r.pesos).toBe(0);
  });
  it("pays scaled pesos above threshold, higher for higher levels", () => {
    const a1 = computeReward(1, 1, "A1");
    const a2 = computeReward(1, 1, "A2");
    expect(a1.pesos).toBe(BASE_PESOS); // 10 * 1 * 1
    expect(a2.pesos).toBe(Math.round(BASE_PESOS * 1.25));
    expect(a2.pesos).toBeGreaterThan(a1.pesos);
  });
  it("awards skill points proportional to quality", () => {
    expect(computeReward(1, 1, "A1").skillGain).toBe(100);
    expect(computeReward(0.5, 0.5, "A1").skillGain).toBe(50);
  });
});

describe("focus", () => {
  it("regenerates to max on a new day", () => {
    const r = regenFocus({ focus: 0, focusDay: "2025-01-01" }, "2025-01-02");
    expect(r.focus).toBe(FOCUS_MAX);
    expect(r.focusDay).toBe("2025-01-02");
  });
  it("does not regen within the same day", () => {
    const r = regenFocus({ focus: 30, focusDay: "2025-01-01" }, "2025-01-01");
    expect(r.focus).toBe(30);
  });
  it("spends focus and blocks when insufficient", () => {
    const ok = spendFocus({ focus: 10, focusDay: "d" }, "d", ACTIVITY_FOCUS_COST);
    expect(ok.ok).toBe(true);
    expect(ok.state.focus).toBe(10 - ACTIVITY_FOCUS_COST);

    const blocked = spendFocus({ focus: 2, focusDay: "d" }, "d", ACTIVITY_FOCUS_COST);
    expect(blocked.ok).toBe(false);
    expect(blocked.state.focus).toBe(2); // unchanged
  });
  it("regens before spending across a day boundary", () => {
    const r = spendFocus({ focus: 0, focusDay: "d1" }, "d2");
    expect(r.ok).toBe(true);
    expect(r.state.focus).toBe(FOCUS_MAX - ACTIVITY_FOCUS_COST);
  });
  it("canAfford reflects the cost", () => {
    expect(canAfford({ focus: 5, focusDay: "d" })).toBe(true);
    expect(canAfford({ focus: 4, focusDay: "d" })).toBe(false);
  });
});
