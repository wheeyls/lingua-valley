import { describe, it, expect } from "vitest";
import { buildDailyGraph } from "../objectives/daily";
import type { Lesson } from "../objectives/lesson";
import type { ObjectiveState } from "../objective";

const NOW = new Date("2025-06-01T12:00:00Z");

const LESSON: Lesson = {
  id: "past-tense",
  level: "A2",
  title: "Talking about the past",
  canDo: "understand and retell a simple past-tense story",
  vocab: [{ es: "fui", en: "I went" }],
  storyTheme: "Tell the player two things you did today.",
  retellTheme: "Ask the player to retell Jackie's story.",
  reviewTheme: "Ask the player about their day.",
};

describe("ObjectiveGraph (farming loop, paired practice)", () => {
  it("registers the story/retell pair and store by id/npc/role", () => {
    const g = buildDailyGraph(LESSON);
    expect(g.forNpc("jackie")?.id).toBe("story-telling");
    expect(g.forNpc("jackie")?.role).toBe("seeds");
    expect(g.forNpc("jorgito")?.id).toBe("story-retell");
    expect(g.forNpc("jorgito")?.role).toBe("water");
    expect(g.forNpc("shopkeeper")?.id).toBe("store-review");
    expect(g.all()).toHaveLength(5);
  });

  it("registers Arlene's foliage objective as independent and bonus", () => {
    const g = buildDailyGraph(LESSON);
    const arlene = g.forNpc("arlene");
    expect(arlene?.id).toBe("foliage-gathering");
    expect(arlene?.role).toBe("foliage");
    expect(arlene?.dependsOn).toEqual([]);
    expect(arlene?.bonus).toBe(true);
    // Available from the start, with no dependency on the story/retell chain.
    expect(g.isAvailable("foliage-gathering", {})).toBe(true);
    // Has its own can-do/vocab, distinct from the lesson's past-tense content.
    expect(arlene?.canDo).toMatch(/ir a|plans/i);
    expect(arlene?.vocab?.length ?? 0).toBeGreaterThan(0);
  });

  it("registers Maria's where-are-things objective as independent and bonus", () => {
    const g = buildDailyGraph(LESSON);
    const maria = g.forNpc("maria");
    expect(maria?.id).toBe("where-are-things");
    expect(maria?.role).toBe("ribbons");
    expect(maria?.dependsOn).toEqual([]);
    expect(maria?.bonus).toBe(true);
    // Available from the start, with no dependency on the story/retell chain.
    expect(g.isAvailable("where-are-things", {})).toBe(true);
    // Has its own can-do/vocab, distinct from the lesson's past-tense content.
    expect(maria?.canDo).toMatch(/prepositions|encima|debajo/i);
    expect(maria?.vocab?.length ?? 0).toBeGreaterThan(0);
    // buildTheme embeds today's concrete scene as ground truth for the LLM.
    const theme = maria!.buildTheme({ inputs: {}, state: {}, today: "2026-07-30" });
    expect(theme).toContain("está delante de la puerta");
    // referenceScene exposes the same day's raw layout, tagged by kind so the
    // UI knows which renderer draws it as a picture (no Spanish leaks
    // through the domain layer).
    const ref = maria!.referenceScene?.({ inputs: {}, state: {}, today: "2026-07-30" });
    expect(ref?.kind).toBe("room");
    expect(ref?.scene).toEqual([
      { slot: "door", item: "hat", position: 0 },
      { slot: "table", item: "key", position: 0 },
      { slot: "vase", item: "ball", position: 1 },
    ]);
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
    const theme = g.get("story-retell")!.buildTheme({ inputs, state: s, today: "2025-06-01" });
    expect(theme).toContain("Compré pan");
  });

  it("buildTheme weaves the lesson title into the store review", () => {
    const g = buildDailyGraph(LESSON);
    expect(
      g.get("store-review")!.buildTheme({ inputs: {}, state: {}, today: "2025-06-01" }),
    ).toContain(
      "Talking about the past",
    );
  });
});
