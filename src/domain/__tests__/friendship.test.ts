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

import { buy, sell, buyPrice, sellPrice, tierWith } from "../trade";
import { initialPlayerState } from "../player";

describe("buying and selling", () => {
  const apple: Good = { id: "manzanas", name: "Manzanas", baseValue: 10, requiresTier: "stranger" };
  const craft: Good = { id: "craft", name: "Craft", baseValue: 50, requiresTier: "friend" };

  function stateWithRapport(npc: string, rapport: number, pesos = 100) {
    const s = initialPlayerState("T", 1, "2025-06-01");
    return {
      ...s,
      pesos,
      rapport: { [npc]: { points: rapport, lastDay: "", countToday: 0 } },
    };
  }

  it("friends buy cheaper and sell dearer", () => {
    expect(buyPrice(apple, "compadre")).toBeLessThan(buyPrice(apple, "stranger"));
    expect(sellPrice(apple, "compadre")).toBeGreaterThan(sellPrice(apple, "stranger"));
  });

  it("buy spends pesos and adds the good", () => {
    const s = stateWithRapport("rosa", 0, 100);
    const r = buy(s, "rosa", apple);
    expect(r.ok).toBe(true);
    expect(r.state.pesos).toBe(100 + r.pesosDelta);
    expect(r.state.goods["manzanas"]).toBe(1);
  });

  it("buy is blocked when the good is locked at the tier", () => {
    const s = stateWithRapport("rosa", 0, 100); // stranger
    const r = buy(s, "rosa", craft); // requires friend
    expect(r.ok).toBe(false);
    expect(r.error).toBe("locked");
  });

  it("buy is blocked when broke", () => {
    const s = stateWithRapport("rosa", 0, 0);
    const r = buy(s, "rosa", apple);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("cannot-afford");
  });

  it("sell requires owning the good and pays out", () => {
    let s = stateWithRapport("rosa", 200, 0); // compadre
    s = buy({ ...s, pesos: 100 }, "rosa", apple).state;
    const before = s.pesos;
    const r = sell(s, "rosa", apple);
    expect(r.ok).toBe(true);
    expect(r.state.pesos).toBeGreaterThan(before);
    expect(r.state.goods["manzanas"]).toBe(0);
    expect(sell(r.state, "rosa", apple).error).toBe("none-to-sell");
  });

  it("tierWith reads rapport", () => {
    expect(tierWith(stateWithRapport("rosa", 90), "rosa")).toBe("friend");
  });
});
