import { describe, it, expect } from "vitest";
import {
  isDoorUnlocked,
  isItemVisible,
  isNpcAvailable,
  npcsOn,
  doorsOn,
} from "../gameMap";
import { PRACTICE_HOUSE, HOME, STREET } from "../../content/maps";
import type { ObjectiveState } from "../objective";
import { allObjectivesComplete } from "../dayComplete";
import { buildDailyGraph } from "../objectives/daily";

describe("gameMap (room-based)", () => {
  it("lists NPCs on the practice house (Marisol + Pablo only)", () => {
    expect(npcsOn(PRACTICE_HOUSE).map((n) => n.npcId)).toEqual([
      "marisol",
      "pablo",
    ]);
  });

  it("Rosa is on the street", () => {
    expect(npcsOn(STREET).map((n) => n.npcId)).toEqual(["rosa"]);
  });

  it("street has doors to home and practice house", () => {
    expect(doorsOn(STREET)).toHaveLength(2);
    expect(doorsOn(STREET).every((d) => isDoorUnlocked(d, {}))).toBe(true);
  });

  it("NPCs with availableAfter are locked until those objectives complete", () => {
    const pablo = npcsOn(PRACTICE_HOUSE).find((n) => n.npcId === "pablo")!;
    expect(isNpcAvailable(pablo, {})).toBe(false);

    const partial: ObjectiveState = {
      "rosa-greeting": { completedAt: "", outputs: {} },
    };
    expect(isNpcAvailable(pablo, partial)).toBe(false); // needs both

    const full: ObjectiveState = {
      "rosa-greeting": { completedAt: "", outputs: {} },
      "marisol-story": { completedAt: "", outputs: { storyText: "..." } },
    };
    expect(isNpcAvailable(pablo, full)).toBe(true);
  });

  it("NPCs without availableAfter are always available", () => {
    const rosa = npcsOn(STREET).find((n) => n.npcId === "rosa")!;
    expect(isNpcAvailable(rosa, {})).toBe(true);
  });

  it("items appear only after their required objectives", () => {
    const flower = HOME.entities.find((e) => e.id === "flower")!;
    expect(isItemVisible(flower as never, {})).toBe(false);

    const done: ObjectiveState = {
      "pablo-retelling": { completedAt: "", outputs: {} },
    };
    expect(isItemVisible(flower as never, done)).toBe(true);
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
