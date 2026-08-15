/**
 * Map definitions — the hub screen for a campaign.
 *
 * The HUB shows one NPC pin per visible location, positioned over the
 * background art, plus the live Field and Station cards (injected by the
 * controller). Tap an NPC to talk directly — no intermediate rooms or doors.
 *
 * Built from the current area's `locations` so content drives the hub:
 * adding a location adds an NPC pin automatically. Each location's `anchor`
 * names an invisible `<circle id="...">` marker in the Area's background
 * SVG (see content/art.ts) — that's where its pin(s) get positioned, so the
 * art is the single source of truth for layout, not hand-typed coordinates.
 */

import type { GameMap, MapNpc } from "../domain/gameMap.js";
import { STREET_BG } from "./art.js";
import { visibleLocations, findNpc, type Area } from "./world.js";

export const HUB_MAP_ID = "hub";
const VIEW_BOX_WIDTH = 400;
const VIEW_BOX_HEIGHT = 220;

/** Build the hub map for a given campaign area — one NPC pin per visible location. */
export function buildHubMap(area: Area): GameMap {
  const backgroundSvg = area.backgroundSvg ?? STREET_BG;

  const npcs: MapNpc[] = visibleLocations(area).flatMap((loc) => {
    const anchor = resolveAnchor(backgroundSvg, loc.anchor, VIEW_BOX_WIDTH, VIEW_BOX_HEIGHT);
    return loc.npcIds.map((npcId, i) => {
      const npc = findNpc(npcId)!;
      const { x, y } = offsetPosition(anchor.x, anchor.y, i, loc.npcIds.length);
      return {
        id: `${npcId}-npc`,
        npcId,
        name: npc.name,
        color: npc.color,
        icon: loc.icon,
        x,
        y,
      };
    });
  });

  return {
    id: HUB_MAP_ID,
    name: area.name,
    backgroundSvg,
    viewBoxWidth: VIEW_BOX_WIDTH,
    viewBoxHeight: VIEW_BOX_HEIGHT,
    npcs,
  };
}

/** Find `<... id="anchorId" ... cx="N" cy="M" .../>` in a raw SVG string and
 *  return its position as a percent (0-100) of the given viewBox. Throws if
 *  the anchor isn't found — a missing anchor is a content bug, not a
 *  runtime fallback case. */
export function resolveAnchor(
  svg: string,
  anchorId: string,
  viewBoxWidth: number,
  viewBoxHeight: number,
): { x: number; y: number } {
  const tagMatch = svg.match(new RegExp(`<[^>]*\\bid="${anchorId}"[^>]*>`));
  if (!tagMatch) {
    throw new Error(`Anchor "${anchorId}" not found in background SVG`);
  }
  const tag = tagMatch[0];
  const cx = Number(tag.match(/\bcx="(-?[\d.]+)"/)?.[1]);
  const cy = Number(tag.match(/\bcy="(-?[\d.]+)"/)?.[1]);
  return { x: (cx / viewBoxWidth) * 100, y: (cy / viewBoxHeight) * 100 };
}

/** Spread sibling NPCs at one location around its anchor so pins don't
 *  fully overlap. Single-NPC locations are unaffected.
 *
 *  anchorX/anchorY (and the returned x/y) are each a percent of their OWN
 *  axis (0-100 of viewBox width, 0-100 of viewBox height) — not the same
 *  physical scale, since the viewBox itself is wider than it is tall. The
 *  rendered stage is aspect-locked to the viewBox, so 1 raw viewBox unit is
 *  the same pixel size on both axes; a naive equal-percent circular offset
 *  would end up visually elliptical (squashed vertically, since 1% of the
 *  shorter height axis is fewer pixels than 1% of the wider width axis).
 *  Scaling the y component by (VIEW_BOX_WIDTH / VIEW_BOX_HEIGHT) corrects
 *  for that, so siblings end up evenly spaced in actual rendered pixels. */
function offsetPosition(
  anchorX: number,
  anchorY: number,
  index: number,
  count: number,
): { x: number; y: number } {
  if (count <= 1) return { x: anchorX, y: anchorY };
  const RADIUS = 8; // percent of viewBox width
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  return {
    x: clamp(anchorX + RADIUS * Math.cos(angle), 2, 98),
    y: clamp(anchorY + RADIUS * Math.sin(angle) * (VIEW_BOX_WIDTH / VIEW_BOX_HEIGHT), 2, 98),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
