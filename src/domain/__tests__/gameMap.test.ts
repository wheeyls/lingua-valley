import { describe, it, expect } from "vitest";
import {
  isDoorUnlocked,
  isNpcAvailable,
  npcsOn,
  doorsOn,
  type MapDoor,
} from "../gameMap";
import { BARRIO } from "../../content/maps";
import type { ObjectiveState } from "../objective";

describe("gameMap (room-based)", () => {
  it("lists the three farming NPCs on the barrio map", () => {
    expect(npcsOn(BARRIO).map((n) => n.npcId).sort()).toEqual([
      "seedsman",
      "shopkeeper",
      "waterkeeper",
    ]);
  });

  it("the barrio has no locked doors (single-room point-and-click)", () => {
    expect(doorsOn(BARRIO)).toHaveLength(0);
  });

  it("NPCs without availableAfter are always available", () => {
    for (const npc of npcsOn(BARRIO)) {
      expect(isNpcAvailable(npc, {})).toBe(true);
    }
  });

  it("isDoorUnlocked respects required objectives", () => {
    const door: MapDoor = {
      id: "d",
      kind: "door",
      x: 0,
      targetMapId: "x",
      targetX: 0,
      unlockedBy: ["seeds-intro"],
    };
    expect(isDoorUnlocked(door, {})).toBe(false);
    const done: ObjectiveState = {
      "seeds-intro": { completedAt: "", outputs: {} },
    };
    expect(isDoorUnlocked(door, done)).toBe(true);
  });
});
