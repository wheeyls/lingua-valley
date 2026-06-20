import { describe, it, expect } from "vitest";
import { buildDailyGraph } from "../objectives/daily";
import type { Lesson } from "../objectives/lesson";
import type { ObjectiveState } from "../objective";

const NOW = new Date("2025-06-01T12:00:00Z");

const LESSON: Lesson = {
  id: "greetings",
  level: "A1",
  title: "Greetings & introductions",
  canDo: "greet someone and say your name",
  vocab: [{ es: "hola", en: "hello" }],
  introTheme: "Introduce basic greetings.",
  practiceTheme: "Practice greeting back and forth.",
  reviewTheme: "Review greetings to close the sale.",
};

describe("ObjectiveGraph (farming loop)", () => {
  it("registers seeds/water/store objectives by id, npc and role", () => {
    const g = buildDailyGraph(LESSON);
    expect(g.get("seeds-intro")?.npcId).toBe("seedsman");
    expect(g.get("seeds-intro")?.role).toBe("seeds");
    expect(g.forNpc("waterkeeper")?.id).toBe("water-practice");
    expect(g.forNpc("waterkeeper")?.role).toBe("water");
    expect(g.forNpc("shopkeeper")?.id).toBe("store-review");
    expect(g.forNpc("shopkeeper")?.role).toBe("store");
    expect(g.all()).toHaveLength(3);
  });

  it("all three are standalone (no cross-dependencies)", () => {
    const g = buildDailyGraph(LESSON);
    const s: ObjectiveState = {};
    expect(g.isAvailable("seeds-intro", s)).toBe(true);
    expect(g.isAvailable("water-practice", s)).toBe(true);
    expect(g.isAvailable("store-review", s)).toBe(true);
  });

  it("seeds objective outputs the lesson theme", () => {
    const g = buildDailyGraph(LESSON);
    const s = g.complete("seeds-intro", {}, [], NOW);
    expect(s["seeds-intro"].outputs.theme).toBe("greetings");
  });

  it("earnsReward is true on first completion, false on replay", () => {
    const g = buildDailyGraph(LESSON);
    let s: ObjectiveState = {};
    expect(g.earnsReward("water-practice", s)).toBe(true);
    s = g.complete("water-practice", s, [], NOW);
    expect(g.earnsReward("water-practice", s)).toBe(false);
  });

  it("buildTheme weaves in the lesson title and goal", () => {
    const g = buildDailyGraph(LESSON);
    expect(g.get("seeds-intro")!.buildTheme({ inputs: {}, state: {} })).toContain(
      "Greetings & introductions",
    );
    expect(g.get("water-practice")!.buildTheme({ inputs: {}, state: {} })).toContain(
      "greet someone and say your name",
    );
    expect(g.get("store-review")!.buildTheme({ inputs: {}, state: {} })).toContain(
      "Greetings & introductions",
    );
  });
});
