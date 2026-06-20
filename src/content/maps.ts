/**
 * Map definitions — a single point-and-click neighbourhood.
 *
 * The Barrio shows everything as tappable cards:
 *   - your House (the field, rendered live by the controller from player state)
 *   - the Seed Farm (Don Semilla)
 *   - the Water Tower (Aguamarina)
 *   - the Store (Doña Tienda)
 *   - the Train Station (buy a ticket — rendered live by the controller)
 *
 * NPC cards are the map entities; the field and station are injected by the
 * GameController because they depend on live player state, not objective gates.
 */

import type { GameMap } from "../domain/gameMap.js";
import { STREET_BG } from "./art.js";
import { CURRENT_AREA } from "./world.js";

export const BARRIO: GameMap = {
  id: "barrio",
  name: CURRENT_AREA.name,
  width: 800,
  groundColor: 0x4a7c59,
  spawnX: 100,
  backgroundSvg: STREET_BG,
  entities: CURRENT_AREA.npcs.map((npc, i) => ({
    id: `${npc.id}-npc`,
    kind: "npc" as const,
    x: 100 + i * 200,
    npcId: npc.id,
    name: npc.name,
    color: npc.color,
  })),
};

export const ALL_MAPS: Record<string, GameMap> = {
  barrio: BARRIO,
};

export function getMap(id: string): GameMap | undefined {
  return ALL_MAPS[id];
}
