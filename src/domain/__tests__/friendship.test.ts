import { describe, it, expect } from "vitest";
import {
  tierFor,
  rapportGain,
  progressToNextTier,
  nextTier,
  TIER_THRESHOLDS,
} from "../friendship";
import { tradeMultiplier, unlockedGoods, tradeValue, type Good } from "../trade";

describe("friendship tiers", () => {
  it("maps rapport to the right tier", () => {
    expect(tierFor(0)).toBe("stranger");
    expect(tierFor(29)).toBe("stranger");
    expect(tierFor(30)).toBe("acquaintance");
    expect(tierFor(90)).toBe("friend");
    expect(tierFor(250)).toBe("compadre");
  });

  it("rapport gain scales with quality but is always positive", () => {
    expect(rapportGain(1)).toBeGreaterThan(rapportGain(0.5));
    expect(rapportGain(0)).toBeGreaterThanOrEqual(1);
  });

  it("reports progress toward the next tier and caps at compadre", () => {
    expect(progressToNextTier(0)).toBeCloseTo(0);
    expect(progressToNextTier(TIER_THRESHOLDS.acquaintance)).toBeCloseTo(0);
    expect(progressToNextTier(300)).toBe(1); // max tier
    expect(nextTier("compadre")).toBeNull();
    expect(nextTier("stranger")).toBe("acquaintance");
  });
});

describe("trade", () => {
  const goods: Good[] = [
    { id: "salsa", name: "Salsa", baseValue: 10, requiresTier: "acquaintance" },
    { id: "artesania", name: "Craft", baseValue: 50, requiresTier: "friend" },
    { id: "tesoro", name: "Treasure", baseValue: 200, requiresTier: "compadre" },
  ];

  it("better tier = better multiplier", () => {
    expect(tradeMultiplier("stranger")).toBeLessThan(tradeMultiplier("acquaintance"));
    expect(tradeMultiplier("friend")).toBeLessThan(tradeMultiplier("compadre"));
  });

  it("unlocks more goods at higher tiers", () => {
    expect(unlockedGoods(goods, "stranger")).toHaveLength(0);
    expect(unlockedGoods(goods, "acquaintance").map((g) => g.id)).toEqual(["salsa"]);
    expect(unlockedGoods(goods, "friend").map((g) => g.id)).toEqual(["salsa", "artesania"]);
    expect(unlockedGoods(goods, "compadre")).toHaveLength(3);
  });

  it("trade value reflects tier rate", () => {
    expect(tradeValue(goods[0], "acquaintance")).toBe(10); // 10 * 1.0
    expect(tradeValue(goods[0], "compadre")).toBe(18); // 10 * 1.8
  });
});
