/**
 * Map definitions — a hub of clickable sub-area rooms.
 *
 * The HUB (the village) shows a door card for each location plus the live Field
 * and Station cards (injected by the controller). Tapping a location door enters
 * that location's ROOM, which hosts its one or two NPCs. A Back button returns
 * to the hub.
 *
 * Maps are generated from the current area's `locations` so content drives
 * navigation — adding a location adds a room and a hub door automatically.
 */

import type { GameMap, MapNpc, MapDoor } from "../domain/gameMap.js";
import { STREET_BG, HOME_BG, PRACTICE_BG } from "./art.js";
import { CURRENT_AREA, visibleLocations, findNpc, type Location } from "./world.js";

export const HUB_MAP_ID = "hub";

/** Pick a background per role so rooms feel distinct. */
function roleBackground(role: Location["role"]): string {
  if (role === "seeds") return HOME_BG;
  if (role === "water") return PRACTICE_BG;
  return STREET_BG;
}

/** The room for a single location: its NPCs, plus a Back door to the hub. */
function locationRoom(loc: Location): GameMap {
  const npcs: MapNpc[] = loc.npcIds.map((npcId, i) => {
    const npc = findNpc(npcId)!;
    return {
      id: `${npcId}-npc`,
      kind: "npc" as const,
      x: 100 + i * 200,
      npcId,
      name: npc.name,
      color: npc.color,
      // Sequential NPCs: the 2nd unlocks only after the 1st's objective is done.
      availableAfter: i > 0 ? [npcObjectiveId(loc.npcIds[i - 1])] : undefined,
    };
  });

  const back: MapDoor = {
    id: `${loc.id}-back`,
    kind: "door",
    x: 0,
    targetMapId: HUB_MAP_ID,
    targetX: 0,
    unlockedBy: [],
    label: "← Back to village",
  };

  return {
    id: loc.id,
    name: loc.name,
    width: 800,
    groundColor: 0x4a7c59,
    spawnX: 100,
    backgroundSvg: roleBackground(loc.role),
    entities: [...npcs, back],
  };
}

/**
 * The objective id an NPC fulfills. By convention each NPC has exactly one
 * objective whose `npcId` matches; the ObjectiveGraph is the source of truth at
 * runtime, but for the map's static `availableAfter` we mirror the known ids.
 */
function npcObjectiveId(npcId: string): string {
  switch (npcId) {
    case "marisol":
      return "story-telling";
    case "pablo":
      return "story-retell";
    default:
      return `${npcId}-objective`;
  }
}

/** The hub: a door card per location (the Field + Station are extra cards). */
export const HUB: GameMap = {
  id: HUB_MAP_ID,
  name: CURRENT_AREA.name,
  width: 800,
  groundColor: 0x4a7c59,
  spawnX: 100,
  backgroundSvg: STREET_BG,
  entities: visibleLocations().map((loc, i) => ({
    id: `${loc.id}-door`,
    kind: "door" as const,
    x: 100 + i * 160,
    targetMapId: loc.id,
    targetX: 100,
    unlockedBy: [],
    label: `${loc.icon} ${loc.name}`,
  })),
};

export const ALL_MAPS: Record<string, GameMap> = {
  [HUB.id]: HUB,
  ...Object.fromEntries(visibleLocations().map((loc) => [loc.id, locationRoom(loc)])),
};

export function getMap(id: string): GameMap | undefined {
  return ALL_MAPS[id];
}
