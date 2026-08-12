/**
 * Map definitions — the hub screen for a campaign.
 *
 * The HUB shows one NPC card per visible location, plus the live Field and
 * Station cards (injected by the controller). Tap an NPC to talk directly —
 * no intermediate rooms or doors.
 *
 * Built from the current area's `locations` so content drives the hub:
 * adding a location adds an NPC card automatically.
 */

import type { GameMap, MapNpc } from "../domain/gameMap.js";
import { STREET_BG } from "./art.js";
import { visibleLocations, findNpc, type Area } from "./world.js";

export const HUB_MAP_ID = "hub";

/** Build the hub map for a given campaign area — one NPC card per visible location. */
export function buildHubMap(area: Area): GameMap {
  const npcs: MapNpc[] = visibleLocations(area).flatMap((loc) =>
    loc.npcIds.map((npcId) => {
      const npc = findNpc(npcId)!;
      return {
        id: `${npcId}-npc`,
        npcId,
        name: npc.name,
        color: npc.color,
        icon: loc.icon,
      };
    }),
  );

  return {
    id: HUB_MAP_ID,
    name: area.name,
    backgroundSvg: STREET_BG,
    npcs,
  };
}
