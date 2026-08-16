/**
 * Game map model — the pin-based hub screen.
 *
 * The world is a single HUB, resolved as a PAIR of fully-independent
 * orientations (landscape/portrait — see HubMaps) so a campaign can supply
 * different art for wide vs narrow viewports. Each orientation is a small
 * SVG scene with tappable NPC pins positioned over it. No movement, no
 * sub-rooms — pin positions are resolved from named anchor points in the
 * background art (see content/maps.ts).
 *
 * PURE DOMAIN: no framework. Fully testable.
 */

/** A tappable NPC pin on the hub. */
export interface MapNpc {
  id: string;
  npcId: string; // links to NPC data in world.ts
  name: string;
  color: number;
  /** The hosting Location's display name (e.g. "El Anfiteatro") — shown on
   *  the pin so the place itself is clearly labeled, not just who's there.
   *  Some content (e.g. Daphne's mystery) depends on the player actually
   *  knowing this name to answer with. */
  locationName: string;
  /** Optional emoji badge (from the NPC's Location.icon), shown on the pin. */
  icon?: string;
  /** Optional path to a PNG/SVG asset. Falls back to the SVG thumbnail avatar. */
  art?: string;
  /** Marker position in percent (0-100) of this map's viewBox. */
  x: number;
  y: number;
}

/** One fully-resolved orientation of a campaign's hub. */
export interface GameMap {
  id: string;
  name: string;
  /** All NPC pins on this map. */
  npcs: MapNpc[];
  /** Inline SVG string for the hub background. */
  backgroundSvg: string;
  /** viewBox the backgroundSvg and npc x/y percentages are resolved against. */
  viewBoxWidth: number;
  viewBoxHeight: number;
}

/** Both orientations of one campaign's hub, fully resolved. The UI picks
 *  which to show via CSS breakpoint — see HtmlWorldView. */
export interface HubMaps {
  landscape: GameMap;
  portrait: GameMap;
}
