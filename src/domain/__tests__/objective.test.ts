import { describe, it, expect } from "vitest";
import { buildDailyGraph } from "../objectives/daily";
import type { ObjectiveState } from "../objective";

const NOW = new Date("2025-06-01T12:00:00Z");

describe("ObjectiveGraph", () => {
  it("registers and retrieves objectives by id and npcId", () => {
    const g = buildDailyGraph();
    expect(g.get("rosa-greeting")?.npcId).toBe("rosa");
    expect(g.forNpc("marisol")?.id).toBe("marisol-story");
    expect(g.forNpc("pablo")?.id).toBe("pablo-retelling");
    expect(g.all()).toHaveLength(3);
  });

  it("standalone objectives (rosa) are available immediately", () => {
    const g = buildDailyGraph();
    const s: ObjectiveState = {};
    expect(g.isAvailable("rosa-greeting", s)).toBe(true);
    expect(g.isAvailable("marisol-story", s)).toBe(true); // no deps
  });

  it("dependent objectives (pablo) are blocked until deps complete", () => {
    const g = buildDailyGraph();
    const s: ObjectiveState = {};
    expect(g.isAvailable("pablo-retelling", s)).toBe(false);

    // Complete marisol -> pablo becomes available.
    const s2 = g.complete("marisol-story", s, ["Me desperté. Fui al mercado."], NOW);
    expect(g.isAvailable("pablo-retelling", s2)).toBe(true);
  });

  it("complete() stores outputs; gatherInputs() routes them to dependents", () => {
    const g = buildDailyGraph();
    let s: ObjectiveState = {};
    s = g.complete("marisol-story", s, ["Me desperté.", "Fui al mercado."], NOW);

    // Marisol's output is the joined NPC lines.
    expect(s["marisol-story"].outputs.storyText).toBe("Me desperté. Fui al mercado.");

    // Pablo receives it as an input.
    const inputs = g.gatherInputs("pablo-retelling", s);
    expect(inputs.storyText).toContain("Fui al mercado");
  });

  it("earnsReward is true on first completion, false on replay", () => {
    const g = buildDailyGraph();
    let s: ObjectiveState = {};
    expect(g.earnsReward("rosa-greeting", s)).toBe(true);
    s = g.complete("rosa-greeting", s, [], NOW);
    expect(g.earnsReward("rosa-greeting", s)).toBe(false);
  });

  it("isComplete tracks completion", () => {
    const g = buildDailyGraph();
    let s: ObjectiveState = {};
    expect(g.isComplete("rosa-greeting", s)).toBe(false);
    s = g.complete("rosa-greeting", s, [], NOW);
    expect(g.isComplete("rosa-greeting", s)).toBe(true);
  });

  it("buildTheme produces role-specific instructions", () => {
    const g = buildDailyGraph();
    const rosa = g.get("rosa-greeting")!;
    const theme = rosa.buildTheme({ inputs: {}, state: {} });
    expect(theme).toContain("greeting");

    const marisol = g.get("marisol-story")!;
    expect(marisol.buildTheme({ inputs: {}, state: {} })).toContain("2 things");
  });

  it("pablo's theme includes Marisol's story when available", () => {
    const g = buildDailyGraph();
    let s: ObjectiveState = {};
    s = g.complete("marisol-story", s, ["Fui a la tienda. Compré pan."], NOW);
    const inputs = g.gatherInputs("pablo-retelling", s);
    const pablo = g.get("pablo-retelling")!;
    const theme = pablo.buildTheme({ inputs, state: s });
    expect(theme).toContain("Fui a la tienda");
    expect(theme).toContain("Compré pan");
  });
});
