import { describe, it, expect } from "vitest";
import {
  isDoorUnlocked,
  isNpcAvailable,
  npcsOn,
  doorsOn,
} from "../gameMap";
import { HUB, getMap } from "../../content/maps";
import type { ObjectiveState } from "../objective";

describe("gameMap — hub + location rooms", () => {
  it("the hub has a door for each location and no NPCs", () => {
    expect(npcsOn(HUB)).toHaveLength(0);
    const doorLabels = doorsOn(HUB).map((d) => d.label);
    expect(doorsOn(HUB).length).toBeGreaterThanOrEqual(3);
    expect(doorLabels.some((l) => l?.includes("Plaza"))).toBe(true);
  });

  it("the practice room (La Plaza) hosts Marisol then Pablo", () => {
    const plaza = getMap("plaza")!;
    expect(npcsOn(plaza).map((n) => n.npcId)).toEqual(["marisol", "pablo"]);
  });

  it("Pablo (the 2nd NPC) is locked until the story is told", () => {
    const plaza = getMap("plaza")!;
    const pablo = npcsOn(plaza).find((n) => n.npcId === "pablo")!;
    expect(isNpcAvailable(pablo, {})).toBe(false);

    const afterStory: ObjectiveState = {
      "story-telling": { completedAt: "", outputs: { storyText: "..." } },
    };
    expect(isNpcAvailable(pablo, afterStory)).toBe(true);
  });

  it("Marisol (the 1st NPC) is always available", () => {
    const plaza = getMap("plaza")!;
    const marisol = npcsOn(plaza).find((n) => n.npcId === "marisol")!;
    expect(isNpcAvailable(marisol, {})).toBe(true);
  });

  it("each location room has a Back door to the hub", () => {
    const plaza = getMap("plaza")!;
    const back = doorsOn(plaza).find((d) => d.targetMapId === HUB.id);
    expect(back).toBeDefined();
    expect(isDoorUnlocked(back!, {})).toBe(true);
  });
});
