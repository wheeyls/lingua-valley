/**
 * Map definitions — the hub screen for a campaign.
 *
 * The HUB shows one NPC pin per visible location, positioned over the
 * background art, plus the live Field and Station cards (injected by the
 * controller). Tap an NPC to talk directly — no intermediate rooms or doors.
 *
 * Built from the current area's `locations` so content drives the hub:
 * adding a location adds an NPC pin automatically. Each location's `anchor`
 * names an invisible `<circle id="...">` marker present in BOTH of the
 * Area's backgrounds (landscape and portrait — see content/art.ts) — that's
 * where its pin(s) get positioned in each, so the art is the single source
 * of truth for layout, not hand-typed coordinates. The UI picks which
 * orientation to show via a CSS breakpoint (see HtmlWorldView), not this
 * module — buildHubMap always resolves both.
 *
 * An Area may also supply `dynamicNpc(today)` — one extra NPC placed at a
 * day-computed location (e.g. Fiesta de Daphne's Silly Goose, hiding at a
 * different park location each day) on top of each location's static
 * npcIds. `today` is threaded through so this stays a pure function of its
 * inputs, no hidden clock/Date.now() dependency.
 */

import type { GameMap, HubMaps, MapNpc } from "../domain/gameMap.js";
import { visibleLocations, findNpc, type Area, type MapBackground } from "./world.js";

export const HUB_MAP_ID = "hub";

/** Build both orientations of the hub map for a given campaign area, for a
 *  given calendar day (YYYY-MM-DD) — see the `dynamicNpc` note above. */
export function buildHubMap(area: Area, today: string): HubMaps {
  return {
    landscape: buildVariant(area, area.backgroundLandscape, today),
    portrait: buildVariant(area, area.backgroundPortrait, today),
  };
}

/** Resolve one orientation's background into a fully-positioned GameMap —
 *  one NPC pin per visible location (plus the dynamic NPC, if any, at
 *  whichever location it targets today). */
function buildVariant(area: Area, bg: MapBackground, today: string): GameMap {
  const dynamic = area.dynamicNpc?.(today) ?? null;

  const npcs: MapNpc[] = visibleLocations(area).flatMap((loc) => {
    const npcIds = dynamic?.locationId === loc.id ? [...loc.npcIds, dynamic.npcId] : loc.npcIds;
    const anchor = resolveAnchor(bg.svg, loc.anchor, bg.viewBoxWidth, bg.viewBoxHeight);
    return npcIds.map((npcId, i) => {
      const npc = findNpc(npcId)!;
      const { x, y } = offsetPosition(
        anchor.x,
        anchor.y,
        i,
        npcIds.length,
        bg.viewBoxWidth,
        bg.viewBoxHeight,
      );
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
    backgroundSvg: bg.svg,
    viewBoxWidth: bg.viewBoxWidth,
    viewBoxHeight: bg.viewBoxHeight,
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
 *  Scaling the y component by (viewBoxWidth / viewBoxHeight) corrects for
 *  that, so siblings end up evenly spaced in actual rendered pixels.
 *  `viewBoxWidth`/`viewBoxHeight` are THIS variant's own dimensions — the
 *  landscape and portrait backgrounds have different aspect ratios, so the
 *  correction factor differs per call. */
function offsetPosition(
  anchorX: number,
  anchorY: number,
  index: number,
  count: number,
  viewBoxWidth: number,
  viewBoxHeight: number,
): { x: number; y: number } {
  if (count <= 1) return { x: anchorX, y: anchorY };
  const RADIUS = 8; // percent of viewBox width
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  return {
    x: clamp(anchorX + RADIUS * Math.cos(angle), 2, 98),
    y: clamp(anchorY + RADIUS * Math.sin(angle) * (viewBoxWidth / viewBoxHeight), 2, 98),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
