/**
 * Game map model — the pin-based hub screen.
 *
 * The world is a single HUB map: a small SVG scene with tappable NPC pins
 * positioned over it. No movement, no sub-rooms — pin positions are resolved
 * from named anchor points in the background art (see content/maps.ts).
 *
 * PURE DOMAIN: no framework. Fully testable.
 */

/** A tappable NPC pin on the hub. */
export interface MapNpc {
  id: string;
  npcId: string; // links to NPC data in world.ts
  name: string;
  color: number;
  /** Optional emoji badge (from the NPC's Location.icon), shown on the pin. */
  icon?: string;
  /** Optional path to a PNG/SVG asset. Falls back to the SVG thumbnail avatar. */
  art?: string;
  /** Marker position in percent (0-100) of the map's viewBox. */
  x: number;
  y: number;
}

export interface GameMap {
  id: string;
  name: string;
  /** All NPC pins on this map. */
  npcs: MapNpc[];
  /** Optional inline SVG string for the hub background. */
  backgroundSvg?: string;
  /** viewBox the backgroundSvg and npc x/y percentages are resolved
   *  against. Defaults to 400×220 (all current art) if unset. */
  viewBoxWidth?: number;
  viewBoxHeight?: number;
}
