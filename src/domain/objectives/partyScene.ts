/**
 * Party scene — the daily "where are things" layout for the picnic table at
 * Daphne's first birthday party. Same shape as scene.ts (Maria's room): 5
 * possible items rotate through 3 fixed slots, each slot has 2 positions, a
 * pure deterministic shuffle (seeded by the day string) picks 3 of the 5
 * items and a position for each slot — the same scene for everyone that day,
 * no persisted state needed. Just re-themed: door/table/vase → the cooler,
 * the picnic table, and the shade tree.
 *
 * PURE DOMAIN: no framework, no Date.now()/Math.random(). Fully testable.
 */

import { seedFromDay, mulberry32 } from "../prng.js";

export type SlotId = "cooler" | "table" | "tree";
export type ItemId = "pinata" | "pastel" | "regalo" | "globo" | "vela";

export interface SlotAssignment {
  slot: SlotId;
  item: ItemId;
  position: 0 | 1;
}

export type DailyScene = SlotAssignment[];

const SLOTS: SlotId[] = ["cooler", "table", "tree"];
const ITEMS: ItemId[] = ["pinata", "pastel", "regalo", "globo", "vela"];

const ITEM_ES: Record<ItemId, string> = {
  pinata: "la piñata",
  pastel: "el pastel",
  regalo: "el regalo",
  globo: "el globo",
  vela: "la vela",
};

/** [position 0 phrase, position 1 phrase] for each slot. */
const POSITION_ES: Record<SlotId, [string, string]> = {
  cooler: ["delante de la hielera", "detrás de la hielera"],
  table: ["encima de la mesa", "debajo de la mesa"],
  tree: ["a la izquierda del árbol", "a la derecha del árbol"],
};

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

/** Spanish sentences stating where each item is, e.g. "El pastel está encima de la mesa." */
export function describeScene(scene: DailyScene): string {
  return scene
    .map((a) => {
      const item = ITEM_ES[a.item];
      const Item = item.charAt(0).toUpperCase() + item.slice(1);
      return `${Item} está ${POSITION_ES[a.slot][a.position]}.`;
    })
    .join(" ");
}
