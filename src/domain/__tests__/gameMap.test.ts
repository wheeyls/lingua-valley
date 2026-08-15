import { describe, it, expect } from "vitest";
import { buildHubMap, resolveAnchor } from "../../content/maps";
import { visibleLocations, AREAS } from "../../content/world";
import { PUEBLO_DEL_AYER, FIESTA_DE_DAPHNE } from "../../content/world";
import { STREET_BG } from "../../content/art";

// Exercises the generic map-building mechanism (buildHubMap) — pinned to
// Pueblo del Ayer specifically, independent of whichever campaign is
// DEFAULT_CAMPAIGN today.
const HUB = buildHubMap(PUEBLO_DEL_AYER);

describe("gameMap — flat hub", () => {
  it("the hub has one NPC card per visible location (store hidden)", () => {
    expect(HUB.npcs).toHaveLength(visibleLocations(PUEBLO_DEL_AYER).length);
    const npcIds = HUB.npcs.map((n) => n.npcId);
    expect(npcIds).toContain("jorgito");
    expect(npcIds).not.toContain("shopkeeper");
  });

  it("each NPC card matches its location's npc and icon", () => {
    const plaza = visibleLocations(PUEBLO_DEL_AYER).find((l) => l.id === "plaza")!;
    const card = HUB.npcs.find((n) => n.npcId === "jorgito")!;
    expect(card).toBeDefined();
    expect(card.icon).toBe(plaza.icon);
    expect(card.name).toBe("Jorgito");
  });

  it("every location's anchor resolves for every Area (no typos, no missing markers)", () => {
    for (const area of AREAS) {
      expect(() => buildHubMap(area)).not.toThrow();
    }
  });

  it("every pin has an x/y within the viewBox (0-100)", () => {
    for (const npc of HUB.npcs) {
      expect(npc.x).toBeGreaterThanOrEqual(0);
      expect(npc.x).toBeLessThanOrEqual(100);
      expect(npc.y).toBeGreaterThanOrEqual(0);
      expect(npc.y).toBeLessThanOrEqual(100);
    }
  });

  it("a single-NPC location's pin sits exactly on its resolved anchor", () => {
    const plaza = PUEBLO_DEL_AYER.locations.find((l) => l.id === "plaza")!;
    const anchor = resolveAnchor(PUEBLO_DEL_AYER.backgroundSvg ?? STREET_BG, plaza.anchor, 400, 220);
    const card = HUB.npcs.find((n) => n.npcId === "jorgito")!;
    expect(card.x).toBeCloseTo(anchor.x);
    expect(card.y).toBeCloseTo(anchor.y);
  });

  it("multi-NPC locations spread siblings apart around the shared anchor", () => {
    const hub = buildHubMap(FIESTA_DE_DAPHNE);
    const pond = FIESTA_DE_DAPHNE.locations.find((l) => l.id === "el-estanque-de-los-patos")!;
    const anchor = resolveAnchor(FIESTA_DE_DAPHNE.backgroundSvg!, pond.anchor, 400, 220);
    const maria = hub.npcs.find((n) => n.npcId === "maria-abuela")!;
    const goose = hub.npcs.find((n) => n.npcId === "ganso-tonto")!;

    expect(maria).toBeDefined();
    expect(goose).toBeDefined();
    expect(maria.x !== goose.x || maria.y !== goose.y).toBe(true);

    // percent — both stay near the shared anchor, not scattered afield. The y
    // axis's offset is scaled up by (viewBoxWidth/viewBoxHeight) to keep the
    // *pixel* spread circular on the aspect-locked stage, so its delta is
    // larger in raw percent terms than x's — bound generously for both axes.
    const DELTA = 16;
    expect(Math.abs(maria.x - anchor.x)).toBeLessThanOrEqual(DELTA);
    expect(Math.abs(maria.y - anchor.y)).toBeLessThanOrEqual(DELTA);
    expect(Math.abs(goose.x - anchor.x)).toBeLessThanOrEqual(DELTA);
    expect(Math.abs(goose.y - anchor.y)).toBeLessThanOrEqual(DELTA);
  });

  it("resolveAnchor throws for an id with no matching marker in the SVG", () => {
    expect(() => resolveAnchor(STREET_BG, "nonexistent-anchor", 400, 220)).toThrow(
      /nonexistent-anchor/,
    );
  });
});
