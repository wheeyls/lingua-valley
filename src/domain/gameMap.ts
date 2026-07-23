/**
 * Game map model — side-scroller world with multiple maps.
 *
 * The world is a set of MAPS (street, house interiors). Each map is a horizontal
 * strip the player walks left/right through. Maps contain:
 *   - NPCs at specific x-positions
 *   - Doors that link to other maps (locked/unlocked by objective completion)
 *   - Items that can be picked up
 *
 * Navigation: walk to a door, tap to enter → loads the linked map. Exiting puts
 * you back where you entered on the previous map.
 *
 * PURE DOMAIN: no Phaser, no framework. Fully testable.
 */

import type { ObjectiveState } from "./objective.js";

/** A positioned entity on a map (NPC, door, item). */
export interface MapEntity {
  id: string;
  x: number; // horizontal position in the map (pixels from left)
  kind: "npc" | "door" | "item";
}

export interface MapNpc extends MapEntity {
  kind: "npc";
  npcId: string; // links to NPC data in world.ts
  name: string;
  color: number;
  /** Optional path to a PNG/SVG asset. Falls back to the SVG circle avatar. */
  art?: string;
}

export interface MapDoor extends MapEntity {
  kind: "door";
  /** The map this door leads to. */
  targetMapId: string;
  /** Where the player spawns in the target map (x position). */
  targetX: number;
  /** Objective ids that must ALL be complete for this door to be unlocked. */
  unlockedBy: string[];
  /** Label shown on the door (e.g. "Rosa & Marisol's House"). */
  label?: string;
}

export interface MapItem extends MapEntity {
  kind: "item";
  itemId: string;
  name: string;
  /** Objective ids that must ALL be complete for this item to appear. */
  appearsAfter: string[];
}

export type AnyMapEntity = MapNpc | MapDoor | MapItem;

export interface GameMap {
  id: string;
  name: string;
  /** Total width of this map in pixels. */
  width: number;
  /** Visual ground color. */
  groundColor: number;
  /** All entities (NPCs, doors, items) on this map. */
  entities: AnyMapEntity[];
  /** Where the player spawns when entering this map (default x). */
  spawnX: number;
  /** Optional inline SVG string for the room background. */
  backgroundSvg?: string;
}

// --- Query helpers (pure) ---------------------------------------------------

export function npcsOn(map: GameMap): MapNpc[] {
  return map.entities.filter((e): e is MapNpc => e.kind === "npc");
}

export function doorsOn(map: GameMap): MapDoor[] {
  return map.entities.filter((e): e is MapDoor => e.kind === "door");
}

export function itemsOn(map: GameMap): MapItem[] {
  return map.entities.filter((e): e is MapItem => e.kind === "item");
}

export function isDoorUnlocked(door: MapDoor, state: ObjectiveState): boolean {
  return door.unlockedBy.every((id) => state[id] != null);
}

export function isItemVisible(item: MapItem, state: ObjectiveState): boolean {
  return item.appearsAfter.every((id) => state[id] != null);
}

/**
 * In a side-scroller, locked doors act as WALLS — the player can't walk past
 * them. Returns the x-position of the nearest locked door that blocks movement
 * in the given direction, or null if no blocker.
 */
export function movementBound(
  map: GameMap,
  playerX: number,
  direction: "left" | "right",
  state: ObjectiveState,
): number | null {
  const doors = doorsOn(map);
  let bound: number | null = null;
  for (const door of doors) {
    if (!isDoorUnlocked(door, state)) {
      if (direction === "right" && door.x > playerX) {
        if (bound === null || door.x < bound) bound = door.x;
      }
      if (direction === "left" && door.x < playerX) {
        if (bound === null || door.x > bound) bound = door.x;
      }
    }
  }
  return bound;
}

/** Find the nearest entity within `radius` of position `x`. */
export function nearestEntity(
  map: GameMap,
  x: number,
  radius: number,
): AnyMapEntity | undefined {
  let best: AnyMapEntity | undefined;
  let bestDist = radius;
  for (const e of map.entities) {
    const d = Math.abs(e.x - x);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return best;
}
