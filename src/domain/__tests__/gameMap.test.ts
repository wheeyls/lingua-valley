import { describe, it, expect } from "vitest";
import {
  isDoorUnlocked,
  isItemVisible,
  movementBound,
  nearestEntity,
  npcsOn,
  doorsOn,
} from "../gameMap";
import { PRACTICE_HOUSE, HOME } from "../../content/maps";
import type { ObjectiveState } from "../objective";
import { allObjectivesComplete } from "../dayComplete";
import { buildDailyGraph } from "../objectives/daily";

describe("gameMap", () => {
  it("lists NPCs and doors on a map", () => {
    expect(npcsOn(PRACTICE_HOUSE).map((n) => n.npcId)).toEqual([
      "rosa",
      "marisol",
      "pablo",
    ]);
    expect(doorsOn(PRACTICE_HOUSE)).toHaveLength(2);
  });

  it("doors are locked until their required objectives complete", () => {
    const door = doorsOn(PRACTICE_HOUSE).find((d) => d.id === "door-to-pablo")!;
    expect(isDoorUnlocked(door, {})).toBe(false);

    const partial: ObjectiveState = {
      "rosa-greeting": { completedAt: "", outputs: {} },
    };
    expect(isDoorUnlocked(door, partial)).toBe(false); // needs both

    const full: ObjectiveState = {
      "rosa-greeting": { completedAt: "", outputs: {} },
      "marisol-story": { completedAt: "", outputs: { storyText: "..." } },
    };
    expect(isDoorUnlocked(door, full)).toBe(true);
  });

  it("locked doors block movement (act as walls in a side-scroller)", () => {
    const state: ObjectiveState = {};
    // Door to Pablo is at x=530, locked. Player at x=200 can't walk past it.
    const bound = movementBound(PRACTICE_HOUSE, 200, "right", state);
    expect(bound).toBe(530);

    // No locked doors to the left of the player (exit door is always unlocked).
    expect(movementBound(PRACTICE_HOUSE, 200, "left", state)).toBeNull();
  });

  it("unlocking a door removes the movement bound", () => {
    const state: ObjectiveState = {
      "rosa-greeting": { completedAt: "", outputs: {} },
      "marisol-story": { completedAt: "", outputs: {} },
    };
    // Door to Pablo is now unlocked — no more locked doors to the right.
    const bound = movementBound(PRACTICE_HOUSE, 200, "right", state);
    expect(bound).toBeNull();
  });

  it("items appear only after their required objectives", () => {
    const flower = HOME.entities.find((e) => e.id === "flower")!;
    expect(isItemVisible(flower as never, {})).toBe(false);

    const done: ObjectiveState = {
      "pablo-retelling": { completedAt: "", outputs: {} },
    };
    expect(isItemVisible(flower as never, done)).toBe(true);
  });

  it("nearestEntity finds the closest entity within radius", () => {
    const near = nearestEntity(PRACTICE_HOUSE, 160, 50);
    expect(near?.id).toBe("rosa-npc");
    expect(nearestEntity(PRACTICE_HOUSE, 1000, 50)).toBeUndefined();
  });
});

describe("dayComplete", () => {
  it("reports all objectives complete when every one is done", () => {
    const graph = buildDailyGraph();
    expect(allObjectivesComplete(graph, {})).toBe(false);

    const done: ObjectiveState = {
      "rosa-greeting": { completedAt: "", outputs: {} },
      "marisol-story": { completedAt: "", outputs: {} },
      "pablo-retelling": { completedAt: "", outputs: {} },
    };
    expect(allObjectivesComplete(graph, done)).toBe(true);
  });
});
