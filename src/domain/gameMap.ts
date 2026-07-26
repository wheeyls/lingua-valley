/**
 * Game map model — the card-based room graph.
 *
 * The world is a set of MAPS (the hub + one room per location). Each map is a
 * screen of tappable NPC and door cards; a door links to another map and may be
 * locked until its objectives are complete. No positions or movement — the UI
 * lays the cards out itself.
 *
 * PURE DOMAIN: no framework. Fully testable.
 */

import type { ObjectiveState } from "./objective.js";

/** A tappable entity on a map (an NPC or a door). */
export interface MapEntity {
  id: string;
  kind: "npc" | "door";
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
  /** Objective ids that must ALL be complete for this door to be unlocked. */
  unlockedBy: string[];
  /** Label shown on the door. */
  label?: string;
}

export type AnyMapEntity = MapNpc | MapDoor;

export interface GameMap {
  id: string;
  name: string;
  /** All entities (NPCs, doors) on this map. */
  entities: AnyMapEntity[];
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

export function isDoorUnlocked(door: MapDoor, state: ObjectiveState): boolean {
  return door.unlockedBy.every((id) => state[id] != null);
}
