/**
 * Game map model — the card-based hub screen.
 *
 * The world is a single HUB map: a screen of tappable NPC cards. No
 * positions, no movement, no sub-rooms — the UI lays the cards out itself.
 *
 * PURE DOMAIN: no framework. Fully testable.
 */

/** A tappable NPC card on the hub. */
export interface MapNpc {
  id: string;
  npcId: string; // links to NPC data in world.ts
  name: string;
  color: number;
  /** Optional emoji badge (from the NPC's Location.icon), shown on the card. */
  icon?: string;
  /** Optional path to a PNG/SVG asset. Falls back to the SVG circle avatar. */
  art?: string;
}

export interface GameMap {
  id: string;
  name: string;
  /** All NPC cards on this map. */
  npcs: MapNpc[];
  /** Optional inline SVG string for the hub background. */
  backgroundSvg?: string;
}
