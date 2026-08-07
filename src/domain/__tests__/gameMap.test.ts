import { describe, it, expect } from "vitest";
import { isDoorUnlocked, npcsOn, doorsOn } from "../gameMap";
import { buildMaps } from "../../content/maps";
import { visibleLocations } from "../../content/world";
import { PUEBLO_DEL_AYER } from "../../content/world";

// Exercises the generic map-building mechanism (buildMaps/npcsOn/doorsOn) —
// pinned to Pueblo del Ayer specifically, independent of whichever campaign
// is DEFAULT_CAMPAIGN today.
const { hub: HUB, getMap } = buildMaps(PUEBLO_DEL_AYER);

describe("gameMap — hub + location rooms", () => {
  it("the hub has a door for each visible location (store hidden) and no NPCs", () => {
    expect(npcsOn(HUB)).toHaveLength(0);
    const doorLabels = doorsOn(HUB).map((d) => d.label);
    expect(doorsOn(HUB)).toHaveLength(visibleLocations(PUEBLO_DEL_AYER).length);
    expect(doorLabels.some((l) => l?.includes("Plaza"))).toBe(true);
    expect(doorLabels.some((l) => l?.includes("Tienda"))).toBe(false);
  });

  it("Jackie hosts the seed farm; Jorgito hosts La Plaza", () => {
    expect(npcsOn(getMap("seed-farm")!).map((n) => n.npcId)).toEqual(["jackie"]);
    expect(npcsOn(getMap("plaza")!).map((n) => n.npcId)).toEqual(["jorgito"]);
  });

  it("each location room has a Back door to the hub", () => {
    const plaza = getMap("plaza")!;
    const back = doorsOn(plaza).find((d) => d.targetMapId === HUB.id);
    expect(back).toBeDefined();
    expect(isDoorUnlocked(back!, {})).toBe(true);
  });
});
