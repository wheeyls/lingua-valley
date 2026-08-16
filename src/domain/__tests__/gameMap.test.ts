import { describe, it, expect } from "vitest";
import { buildHubMap, resolveAnchor } from "../../content/maps";
import { visibleLocations, AREAS } from "../../content/world";
import { PUEBLO_DEL_AYER, FIESTA_DE_DAPHNE } from "../../content/world";

// Exercises the generic map-building mechanism (buildHubMap) — pinned to
// Pueblo del Ayer specifically, independent of whichever campaign is
// DEFAULT_CAMPAIGN today.
const HUB = buildHubMap(PUEBLO_DEL_AYER);

describe("gameMap — flat hub", () => {
  it("every Area's anchors resolve in BOTH orientations (no typos, no missing markers)", () => {
    for (const area of AREAS) {
      expect(() => buildHubMap(area)).not.toThrow();
    }
  });

  it("landscape and portrait host the exact same set of NPCs, just at different coordinates", () => {
    const landscapeIds = HUB.landscape.npcs.map((n) => n.npcId).sort();
    const portraitIds = HUB.portrait.npcs.map((n) => n.npcId).sort();
    expect(portraitIds).toEqual(landscapeIds);
  });

  // Run the same assertion suite against both orientations — a location's
  // anchor circle could exist in one variant's art and be missing/typo'd in
  // the other without either resolution throwing in isolation.
  for (const orientation of ["landscape", "portrait"] as const) {
    describe(`${orientation}`, () => {
      const map = HUB[orientation];
      const bg = PUEBLO_DEL_AYER[
        orientation === "landscape" ? "backgroundLandscape" : "backgroundPortrait"
      ];

      it("has one NPC pin per visible location (store hidden)", () => {
        expect(map.npcs).toHaveLength(visibleLocations(PUEBLO_DEL_AYER).length);
        const npcIds = map.npcs.map((n) => n.npcId);
        expect(npcIds).toContain("jorgito");
        expect(npcIds).not.toContain("shopkeeper");
      });

      it("each NPC pin matches its location's npc and icon", () => {
        const plaza = visibleLocations(PUEBLO_DEL_AYER).find((l) => l.id === "plaza")!;
        const pin = map.npcs.find((n) => n.npcId === "jorgito")!;
        expect(pin).toBeDefined();
        expect(pin.icon).toBe(plaza.icon);
        expect(pin.name).toBe("Jorgito");
      });

      it("every pin has an x/y within the viewBox (0-100)", () => {
        for (const npc of map.npcs) {
          expect(npc.x).toBeGreaterThanOrEqual(0);
          expect(npc.x).toBeLessThanOrEqual(100);
          expect(npc.y).toBeGreaterThanOrEqual(0);
          expect(npc.y).toBeLessThanOrEqual(100);
        }
      });

      it("a single-NPC location's pin sits exactly on its resolved anchor", () => {
        const plaza = PUEBLO_DEL_AYER.locations.find((l) => l.id === "plaza")!;
        const anchor = resolveAnchor(bg.svg, plaza.anchor, bg.viewBoxWidth, bg.viewBoxHeight);
        const pin = map.npcs.find((n) => n.npcId === "jorgito")!;
        expect(pin.x).toBeCloseTo(anchor.x);
        expect(pin.y).toBeCloseTo(anchor.y);
      });

      it("resolveAnchor throws for an id with no matching marker in the SVG", () => {
        expect(() =>
          resolveAnchor(bg.svg, "nonexistent-anchor", bg.viewBoxWidth, bg.viewBoxHeight),
        ).toThrow(/nonexistent-anchor/);
      });
    });
  }

  it("multi-NPC locations spread siblings apart around the shared anchor, in both orientations", () => {
    const hub = buildHubMap(FIESTA_DE_DAPHNE);
    const pond = FIESTA_DE_DAPHNE.locations.find((l) => l.id === "el-estanque-de-los-patos")!;

    for (const [map, bg] of [
      [hub.landscape, FIESTA_DE_DAPHNE.backgroundLandscape],
      [hub.portrait, FIESTA_DE_DAPHNE.backgroundPortrait],
    ] as const) {
      const anchor = resolveAnchor(bg.svg, pond.anchor, bg.viewBoxWidth, bg.viewBoxHeight);
      const maria = map.npcs.find((n) => n.npcId === "maria-abuela")!;
      const goose = map.npcs.find((n) => n.npcId === "ganso-tonto")!;

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
    }
  });
});
