import { describe, it, expect } from "vitest";
import { buildDailyGraph, isPairedPractice } from "../objectives/daily";
import type { Lesson } from "../objectives/lesson";
import type { ObjectiveState } from "../objective";

const NOW = new Date("2025-06-01T12:00:00Z");

const LESSON: Lesson = {
  id: "past-tense",
  level: "A2",
  title: "Talking about the past",
  canDo: "understand and retell a simple past-tense story",
  vocab: [{ es: "fui", en: "I went" }],
  introTheme: "Introduce the past tense.",
  storyTheme: "Tell the player two things you did today.",
  retellTheme: "Ask the player to retell Marisol's story.",
  reviewTheme: "Ask the player about their day.",
};

describe("ObjectiveGraph (farming loop, paired practice)", () => {
  it("registers seeds, the story/retell pair, and store by id/npc/role", () => {
    const g = buildDailyGraph(LESSON);
    expect(g.get("seeds-intro")?.npcId).toBe("seedsman");
    expect(g.get("seeds-intro")?.role).toBe("seeds");
    expect(g.forNpc("marisol")?.id).toBe("story-telling");
    expect(g.forNpc("marisol")?.role).toBe("water");
    expect(g.forNpc("pablo")?.id).toBe("story-retell");
    expect(g.forNpc("pablo")?.role).toBe("water");
    expect(g.forNpc("shopkeeper")?.id).toBe("store-review");
    expect(g.all()).toHaveLength(4);
  });

  it("the retell objective depends on the story being told first", () => {
    const g = buildDailyGraph(LESSON);
    const s: ObjectiveState = {};
    expect(g.isAvailable("story-telling", s)).toBe(true);
    expect(g.isAvailable("story-retell", s)).toBe(false);

    const afterStory = g.complete("story-telling", s, ["Fui al mercado."], NOW);
    expect(g.isAvailable("story-retell", afterStory)).toBe(true);
  });

  it("routes the story text from teller to retell as an input", () => {
    const g = buildDailyGraph(LESSON);
    const s = g.complete("story-telling", {}, ["Fui al mercado. Compré pan."], NOW);
    expect(s["story-telling"].outputs.storyText).toContain("mercado");

    const inputs = g.gatherInputs("story-retell", s);
    expect(inputs.storyText).toContain("Compré pan");
    const theme = g.get("story-retell")!.buildTheme({ inputs, state: s });
    expect(theme).toContain("Compré pan");
  });

  it("seeds objective outputs the lesson theme", () => {
    const g = buildDailyGraph(LESSON);
    const s = g.complete("seeds-intro", {}, [], NOW);
    expect(s["seeds-intro"].outputs.theme).toBe("past-tense");
  });

  it("buildTheme weaves in the lesson title for seeds and store", () => {
    const g = buildDailyGraph(LESSON);
    expect(g.get("seeds-intro")!.buildTheme({ inputs: {}, state: {} })).toContain(
      "Talking about the past",
    );
    expect(g.get("store-review")!.buildTheme({ inputs: {}, state: {} })).toContain(
      "Talking about the past",
    );
  });

  it("recognises a paired-practice lesson", () => {
    expect(isPairedPractice(LESSON)).toBe(true);
    expect(
      isPairedPractice({ ...LESSON, storyTheme: undefined, retellTheme: undefined }),
    ).toBe(false);
  });
});
