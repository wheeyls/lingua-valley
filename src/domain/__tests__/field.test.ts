import { describe, it, expect } from "vitest";
import {
  MAX_GROWTH,
  makeField,
  firstEmptySlot,
  hasEmptySlot,
  plantSeed,
  canWaterToday,
  waterField,
  isCropReady,
  readySlots,
  hasHarvest,
  harvest,
  type Field,
} from "../field";

const D1 = "2026-01-01";
const D2 = "2026-01-02";

describe("field — slots & planting", () => {
  it("makes a field with N empty slots", () => {
    const f = makeField(1);
    expect(f.slots).toHaveLength(1);
    expect(f.slots[0]).toBeNull();
    expect(makeField(3).slots).toHaveLength(3);
  });

  it("defaults to a single slot", () => {
    expect(makeField().slots).toHaveLength(1);
  });

  it("reports the first empty slot and emptiness", () => {
    const f = makeField(2);
    expect(firstEmptySlot(f)).toBe(0);
    expect(hasEmptySlot(f)).toBe(true);
    const planted = plantSeed(f, "greetings", D1);
    expect(firstEmptySlot(planted)).toBe(1);
  });

  it("plants a crop in the first empty slot", () => {
    const f = plantSeed(makeField(1), "greetings", D1);
    const crop = f.slots[0];
    expect(crop).not.toBeNull();
    expect(crop!.theme).toBe("greetings");
    expect(crop!.growth).toBe(0);
    expect(crop!.plantedDay).toBe(D1);
    expect(crop!.lastWateredDay).toBe("");
  });

  it("does not mutate the original field when planting", () => {
    const f = makeField(1);
    plantSeed(f, "greetings", D1);
    expect(f.slots[0]).toBeNull();
  });

  it("refuses to plant when the field is full", () => {
    let f = plantSeed(makeField(1), "greetings", D1);
    expect(hasEmptySlot(f)).toBe(false);
    const before = f;
    f = plantSeed(f, "numbers", D1);
    expect(f).toBe(before); // unchanged
  });
});

describe("field — watering & growth", () => {
  it("grows each crop by one unit per watering", () => {
    let f = plantSeed(makeField(1), "greetings", D1);
    const res = waterField(f, D1);
    expect(res.grown).toBe(1);
    expect(res.field.slots[0]!.growth).toBe(1);
    expect(res.field.slots[0]!.lastWateredDay).toBe(D1);
  });

  it("gates growth to once per day", () => {
    let f = plantSeed(makeField(1), "greetings", D1);
    f = waterField(f, D1).field;
    expect(canWaterToday(f, D1)).toBe(false);
    const second = waterField(f, D1);
    expect(second.grown).toBe(0);
    expect(second.field.slots[0]!.growth).toBe(1); // unchanged
  });

  it("allows watering again on a new day", () => {
    let f = plantSeed(makeField(1), "greetings", D1);
    f = waterField(f, D1).field;
    expect(canWaterToday(f, D2)).toBe(true);
    const res = waterField(f, D2);
    expect(res.grown).toBe(1);
    expect(res.field.slots[0]!.growth).toBe(2);
  });

  it("waters all crops in the field at once", () => {
    let f = makeField(2);
    f = plantSeed(f, "a", D1);
    f = plantSeed(f, "b", D1);
    const res = waterField(f, D1);
    expect(res.grown).toBe(2);
    expect(res.field.slots[0]!.growth).toBe(1);
    expect(res.field.slots[1]!.growth).toBe(1);
  });

  it("does nothing on an empty field", () => {
    const res = waterField(makeField(1), D1);
    expect(res.grown).toBe(0);
  });

  it("never grows past MAX_GROWTH", () => {
    let f = plantSeed(makeField(1), "greetings", D1);
    let day = 0;
    for (let i = 0; i < MAX_GROWTH + 3; i++) {
      f = waterField(f, `2026-02-${String(++day).padStart(2, "0")}`).field;
    }
    expect(f.slots[0]!.growth).toBe(MAX_GROWTH);
  });
});

describe("field — harvest", () => {
  function grow(f: Field, days: number): Field {
    for (let i = 1; i <= days; i++) {
      f = waterField(f, `2026-03-${String(i).padStart(2, "0")}`).field;
    }
    return f;
  }

  it("is not ready until MAX_GROWTH", () => {
    let f = plantSeed(makeField(1), "greetings", D1);
    f = grow(f, MAX_GROWTH - 1);
    expect(isCropReady(f.slots[0] as any)).toBe(false);
    expect(hasHarvest(f)).toBe(false);
  });

  it("becomes ready after 5 days of watering", () => {
    let f = plantSeed(makeField(1), "greetings", D1);
    f = grow(f, MAX_GROWTH);
    expect(isCropReady(f.slots[0] as any)).toBe(true);
    expect(hasHarvest(f)).toBe(true);
    expect(readySlots(f)).toEqual([0]);
  });

  it("harvest clears the ready slot and returns the crop", () => {
    let f = plantSeed(makeField(1), "greetings", D1);
    f = grow(f, MAX_GROWTH);
    const res = harvest(f);
    expect(res.harvested).toHaveLength(1);
    expect(res.harvested[0].theme).toBe("greetings");
    expect(res.field.slots[0]).toBeNull();
    expect(hasEmptySlot(res.field)).toBe(true);
  });

  it("leaves unripe crops untouched", () => {
    let f = makeField(2);
    f = plantSeed(f, "ripe", D1);
    f = plantSeed(f, "young", D1);
    // grow only the first to full by watering all days, then the second lags:
    // simpler: water all 5 days so both are ripe; instead test partial:
    f = waterField(f, "2026-04-01").field; // both at 1
    const res = harvest(f);
    expect(res.harvested).toHaveLength(0);
    expect(res.field.slots[0]).not.toBeNull();
    expect(res.field.slots[1]).not.toBeNull();
  });
});
