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
import { visibleLocations, findNpc, type Area, type Location } from "./world.js";

export const HUB_MAP_ID = "hub";

/** Pick a background per role so rooms feel distinct. */
function roleBackground(role: Location["role"]): string {
  if (role === "seeds") return HOME_BG;
  if (role === "water") return PRACTICE_BG;
  return STREET_BG;
}

/** The room for a single location: its NPCs, plus a Back door to the hub. */
function locationRoom(loc: Location): GameMap {
  const npcs: MapNpc[] = loc.npcIds.map((npcId) => {
    const npc = findNpc(npcId)!;
    return {
      id: `${npcId}-npc`,
      kind: "npc" as const,
      npcId,
      name: npc.name,
      color: npc.color,
    };
  });

  const back: MapDoor = {
    id: `${loc.id}-back`,
    kind: "door",
    targetMapId: HUB_MAP_ID,
    unlockedBy: [],
    label: "← Back to village",
  };

  return {
    id: loc.id,
    name: loc.name,
    backgroundSvg: roleBackground(loc.role),
    entities: [...npcs, back],
  };
}

/**
 * Build the hub + all location rooms for a given campaign area. Instantiable
 * per campaign so a new area (different place, different NPCs) needs no
 * changes here — just a new `Area` passed in.
 */
export function buildMaps(area: Area): {
  hub: GameMap;
  all: Record<string, GameMap>;
  getMap(id: string): GameMap | undefined;
} {
  const locations = visibleLocations(area);

  const hub: GameMap = {
    id: HUB_MAP_ID,
    name: area.name,
    backgroundSvg: STREET_BG,
    entities: locations.map((loc) => ({
      id: `${loc.id}-door`,
      kind: "door" as const,
      targetMapId: loc.id,
      unlockedBy: [],
      label: `${loc.icon} ${loc.name}`,
    })),
  };

  const all: Record<string, GameMap> = {
    [hub.id]: hub,
    ...Object.fromEntries(locations.map((loc) => [loc.id, locationRoom(loc)])),
  };

  return { hub, all, getMap: (id: string) => all[id] };
}
