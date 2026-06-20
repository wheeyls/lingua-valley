/**
 * The field — the heart of the farming loop.
 *
 * The player's house has a field with a fixed number of SLOTS. Each slot can
 * hold one CROP. The loop is:
 *
 *   1. Get seeds (the intro conversation) → plant a crop in an empty slot.
 *   2. Water the field daily (the practice conversation) → every crop grows
 *      +1 unit, but only ONCE per day (the daily gate).
 *   3. At MAX_GROWTH (5) a crop is harvest-ready → sell it at the store (the
 *      review conversation) for money.
 *   4. Money buys a train ticket to the next area.
 *
 * Growth is therefore driven by REGULAR PLAY: you can practice (water) as much
 * as you like, but a crop only advances once per real day. Five days of daily
 * watering grows a crop from seed to harvest.
 *
 * PURE DOMAIN: no framework imports, fully testable. The caller supplies the
 * current day (a YYYY-MM-DD string) so growth is deterministic in tests.
 */

/** Units of growth required before a crop can be harvested. */
export const MAX_GROWTH = 5;

/** One planted crop occupying a field slot. */
export interface Crop {
  /** The curriculum/lesson theme this crop represents (set when planted). */
  theme: string;
  /** Growth units accumulated so far (0..MAX_GROWTH). */
  growth: number;
  /** YYYY-MM-DD the crop was planted. */
  plantedDay: string;
  /** YYYY-MM-DD the crop was last watered (""=never). Gates daily growth. */
  lastWateredDay: string;
}

/** A single planting slot; null when empty. */
export type Slot = Crop | null;

/** The player's field: a fixed-length array of slots. */
export interface Field {
  slots: Slot[];
}

/** Make a field with `count` empty slots. A1 ships with 1. */
export function makeField(count = 1): Field {
  return { slots: Array.from({ length: count }, () => null) };
}

/** Index of the first empty slot, or -1 if the field is full. */
export function firstEmptySlot(field: Field): number {
  return field.slots.findIndex((s) => s === null);
}

/** Whether there is room to plant another crop. */
export function hasEmptySlot(field: Field): boolean {
  return firstEmptySlot(field) !== -1;
}

/**
 * Plant a crop in the first empty slot. Pure — returns a new field. If the
 * field is full, returns the field unchanged.
 */
export function plantSeed(field: Field, theme: string, day: string): Field {
  const idx = firstEmptySlot(field);
  if (idx === -1) return field;
  const crop: Crop = {
    theme,
    growth: 0,
    plantedDay: day,
    lastWateredDay: "",
  };
  const slots = field.slots.slice();
  slots[idx] = crop;
  return { slots };
}

/** Whether watering today would grow anything (a crop exists & isn't watered today). */
export function canWaterToday(field: Field, day: string): boolean {
  return field.slots.some(
    (c) => c !== null && c.lastWateredDay !== day && c.growth < MAX_GROWTH,
  );
}

/** Result of a watering: the new field plus how many crops actually grew. */
export interface WaterResult {
  field: Field;
  /** Crops that gained a growth unit this watering. */
  grown: number;
}

/**
 * Water the whole field for `day`. Each crop that hasn't been watered today and
 * isn't already mature grows +1 unit. Pure & idempotent within a day: watering
 * again the same day grows nothing.
 */
export function waterField(field: Field, day: string): WaterResult {
  let grown = 0;
  const slots = field.slots.map((c) => {
    if (c === null) return c;
    if (c.lastWateredDay === day) return c; // already watered today
    if (c.growth >= MAX_GROWTH) return c; // fully grown — nothing to do
    grown += 1;
    return { ...c, growth: c.growth + 1, lastWateredDay: day };
  });
  return { field: { slots }, grown };
}

/** Whether a specific crop is ready to harvest. */
export function isCropReady(crop: Crop): boolean {
  return crop.growth >= MAX_GROWTH;
}

/** Indices of slots holding a harvest-ready crop. */
export function readySlots(field: Field): number[] {
  const out: number[] = [];
  field.slots.forEach((c, i) => {
    if (c !== null && isCropReady(c)) out.push(i);
  });
  return out;
}

/** Whether any crop is ready to harvest (and therefore sellable at the store). */
export function hasHarvest(field: Field): boolean {
  return readySlots(field).length > 0;
}

/** Result of a harvest: the new field plus the crops removed. */
export interface HarvestResult {
  field: Field;
  /** The harvested crops (cleared from their slots). */
  harvested: Crop[];
}

/**
 * Harvest every ready crop, clearing their slots. Pure — returns the new field
 * and the list of harvested crops (so the caller can value & sell them).
 */
export function harvest(field: Field): HarvestResult {
  const harvested: Crop[] = [];
  const slots = field.slots.map((c) => {
    if (c !== null && isCropReady(c)) {
      harvested.push(c);
      return null;
    }
    return c;
  });
  return { field: { slots }, harvested };
}
