import { describe, it, expect } from "vitest";
import {
  quality,
  levelMultiplier,
  computeReward,
  BASE_MONEY,
  REWARD_THRESHOLD,
} from "../economy";

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
    expect(r.money).toBe(0);
  });
  it("pays scaled money above threshold, higher for higher levels", () => {
    const a1 = computeReward(1, 1, "A1");
    const a2 = computeReward(1, 1, "A2");
    expect(a1.money).toBe(BASE_MONEY); // 10 * 1 * 1
    expect(a2.money).toBe(Math.round(BASE_MONEY * 1.25));
    expect(a2.money).toBeGreaterThan(a1.money);
  });
});
