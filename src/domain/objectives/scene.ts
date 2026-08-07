/**
 * Scene — the daily "where are things" layout for Maria's room.
 *
 * 5 possible items rotate through 3 fixed slots (door, table, vase); each
 * slot has 2 possible positions (e.g. the door's item is either in front of
 * or behind it). Each day, a pure deterministic shuffle (seeded by the day
 * string) picks 3 of the 5 items and a position for each slot — the same
 * scene for everyone that day, no persisted state needed.
 *
 * PURE DOMAIN: no framework, no Date.now()/Math.random(). Fully testable.
 */

export type SlotId = "door" | "table" | "vase";
export type ItemId = "cat" | "ball" | "key" | "hat" | "book";

export interface SlotAssignment {
  slot: SlotId;
  item: ItemId;
  position: 0 | 1;
}

export type DailyScene = SlotAssignment[];

const SLOTS: SlotId[] = ["door", "table", "vase"];
const ITEMS: ItemId[] = ["cat", "ball", "key", "hat", "book"];

const ITEM_ES: Record<ItemId, string> = {
  cat: "el gato",
  ball: "la pelota",
  key: "la llave",
  hat: "el sombrero",
  book: "el libro",
};

/** [position 0 phrase, position 1 phrase] for each slot. */
const POSITION_ES: Record<SlotId, [string, string]> = {
  door: ["delante de la puerta", "detrás de la puerta"],
  table: ["encima de la mesa", "debajo de la mesa"],
  vase: ["a la izquierda del florero", "a la derecha del florero"],
};

const SLOT_ICON: Record<SlotId, string> = { door: "🚪", table: "🪑", vase: "🏺" };
const SLOT_NAME_ES: Record<SlotId, string> = { door: "Puerta", table: "Mesa", vase: "Florero" };

/** Short [position 0, position 1] phrase for each slot (no repeated slot noun). */
const POSITION_SHORT_ES: Record<SlotId, [string, string]> = {
  door: ["delante", "detrás"],
  table: ["encima", "debajo"],
  vase: ["a la izquierda", "a la derecha"],
};

/** Deterministic 32-bit hash of a YYYY-MM-DD string. */
function seedFromDay(day: string): number {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (Math.imul(h, 31) + day.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** mulberry32 PRNG — deterministic sequence of [0,1) floats given a seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The scene for a given Pacific calendar day (YYYY-MM-DD) — deterministic,
 * no stored state: the same day always yields the same scene.
 */
export function sceneForDay(day: string): DailyScene {
  const rand = mulberry32(seedFromDay(day));
  const shuffled = [...ITEMS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return SLOTS.map((slot, i) => ({
    slot,
    item: shuffled[i],
    position: (rand() < 0.5 ? 0 : 1) as 0 | 1,
  }));
}

/** Spanish sentences stating where each item is, e.g. "El gato está encima de la mesa." */
export function describeScene(scene: DailyScene): string {
  return scene
    .map((a) => {
      const item = ITEM_ES[a.item];
      const Item = item.charAt(0).toUpperCase() + item.slice(1);
      return `${Item} está ${POSITION_ES[a.slot][a.position]}.`;
    })
    .join(" ");
}

/** A slot's icon + short label, e.g. { icon: "🚪", label: "Puerta: el sombrero (detrás)" }. */
export interface ScenePanelItem {
  icon: string;
  label: string;
}

/** The scene as on-screen reference items — what the player looks at to answer. */
export function scenePanelItems(scene: DailyScene): ScenePanelItem[] {
  return scene.map((a) => ({
    icon: SLOT_ICON[a.slot],
    label: `${SLOT_NAME_ES[a.slot]}: ${ITEM_ES[a.item]} (${POSITION_SHORT_ES[a.slot][a.position]})`,
  }));
}
