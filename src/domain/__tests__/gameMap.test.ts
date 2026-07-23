import { describe, it, expect } from "vitest";
import { isDoorUnlocked, npcsOn, doorsOn } from "../gameMap";
import { HUB, getMap } from "../../content/maps";
import { visibleLocations } from "../../content/world";

describe("gameMap — hub + location rooms", () => {
  it("the hub has a door for each visible location (store hidden) and no NPCs", () => {
    expect(npcsOn(HUB)).toHaveLength(0);
    const doorLabels = doorsOn(HUB).map((d) => d.label);
    expect(doorsOn(HUB)).toHaveLength(visibleLocations().length);
    expect(doorLabels.some((l) => l?.includes("Plaza"))).toBe(true);
    expect(doorLabels.some((l) => l?.includes("Tienda"))).toBe(false);
  });

  it("Marisol hosts the seed farm; Pablo hosts La Plaza", () => {
    expect(npcsOn(getMap("seed-farm")!).map((n) => n.npcId)).toEqual(["marisol"]);
    expect(npcsOn(getMap("plaza")!).map((n) => n.npcId)).toEqual(["pablo"]);
  });

  it("each location room has a Back door to the hub", () => {
    const plaza = getMap("plaza")!;
    const back = doorsOn(plaza).find((d) => d.targetMapId === HUB.id);
    expect(back).toBeDefined();
    expect(isDoorUnlocked(back!, {})).toBe(true);
  });
});
