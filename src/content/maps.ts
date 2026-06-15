/**
 * Map definitions — room-based point-and-click.
 *
 * Street: Rosa (outside) + your house + Marisol's house
 * Your house: flower (after all objectives)
 * Marisol's house: Marisol + Pablo (locked until Rosa + Marisol done)
 */

import type { GameMap } from "../domain/gameMap.js";
import { STREET_BG, HOME_BG, PRACTICE_BG } from "./art.js";

export const STREET: GameMap = {
  id: "street",
  name: "La Calle",
  width: 800,
  groundColor: 0x6b705c,
  spawnX: 100,
  backgroundSvg: STREET_BG,
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
      id: "home-door",
      kind: "door",
      x: 100,
      targetMapId: "home",
      targetX: 200,
      unlockedBy: [],
      label: "Your house",
    },
    {
      id: "practice-door",
      kind: "door",
      x: 500,
      targetMapId: "practice-house",
      targetX: 80,
      unlockedBy: [],
      label: "Marisol's house",
    },
  ],
};

export const HOME: GameMap = {
  id: "home",
  name: "Tu Casa",
  width: 400,
  groundColor: 0x3d405b,
  spawnX: 200,
  backgroundSvg: HOME_BG,
  entities: [
    {
      id: "home-exit",
      kind: "door",
      x: 350,
      targetMapId: "street",
      targetX: 100,
      unlockedBy: [],
      label: "← Leave",
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
  name: "Casa de Marisol",
  width: 900,
  groundColor: 0x5f4b66,
  spawnX: 0,
  backgroundSvg: PRACTICE_BG,
  entities: [
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
      availableAfter: ["rosa-greeting", "marisol-story"],
    },
    {
      id: "practice-exit",
      kind: "door",
      x: 0,
      targetMapId: "street",
      targetX: 500,
      unlockedBy: [],
      label: "← Leave",
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
