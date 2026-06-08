/**
 * Map definitions — the side-scroller world.
 *
 * Street: your house (left) → practice house (right)
 * Practice house interior: entryway (Rosa + Marisol) → door → Pablo's room → door → item room
 */

import type { GameMap } from "../domain/gameMap.js";

export const STREET: GameMap = {
  id: "street",
  name: "La Calle",
  width: 800,
  groundColor: 0x6b705c,
  spawnX: 100,
  entities: [
    {
      id: "home-door",
      kind: "door",
      x: 100,
      targetMapId: "home",
      targetX: 200,
      unlockedBy: [], // always open
      label: "Your house",
    },
    {
      id: "practice-door",
      kind: "door",
      x: 500,
      targetMapId: "practice-house",
      targetX: 80,
      unlockedBy: [], // always open
      label: "Rosa & Marisol's house",
    },
  ],
};

export const HOME: GameMap = {
  id: "home",
  name: "Tu Casa",
  width: 400,
  groundColor: 0x3d405b,
  spawnX: 200,
  entities: [
    {
      id: "home-exit",
      kind: "door",
      x: 350,
      targetMapId: "street",
      targetX: 100,
      unlockedBy: [],
      label: "Go outside",
    },
    {
      id: "flower",
      kind: "item",
      x: 100,
      itemId: "water-bottle",
      name: "🌱 Your flower",
      appearsAfter: ["pablo-retelling"], // appears after completing Pablo
    },
  ],
};

export const PRACTICE_HOUSE: GameMap = {
  id: "practice-house",
  name: "Casa de Rosa",
  width: 900,
  groundColor: 0x5f4b66,
  spawnX: 0,
  entities: [
    {
      id: "rosa-npc",
      kind: "npc",
      x: 0,
      npcId: "rosa",
      name: "Rosa",
      color: 0xe07a5f,
    },
    {
      id: "marisol-npc",
      kind: "npc",
      x: 0,
      npcId: "marisol",
      name: "Marisol",
      color: 0x2a9d8f,
    },
    {
      id: "pablo-npc",
      kind: "npc",
      x: 0,
      npcId: "pablo",
      name: "Pablo",
      color: 0x3d5a80,
      // Pablo is only tappable after Rosa + Marisol objectives are done.
      availableAfter: ["rosa-greeting", "marisol-story"],
    },
  ],
};

/** All maps, keyed by id for lookup. */
export const ALL_MAPS: Record<string, GameMap> = {
  street: STREET,
  home: HOME,
  "practice-house": PRACTICE_HOUSE,
};

export function getMap(id: string): GameMap | undefined {
  return ALL_MAPS[id];
}
