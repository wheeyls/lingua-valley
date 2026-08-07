import { describe, it, expect } from "vitest";
import { sceneForDay, describeScene, type DailyScene } from "./partyScene.js";

describe("sceneForDay", () => {
  it("is deterministic — the same day always produces the same scene", () => {
    const a = sceneForDay("2026-07-30");
    const b = sceneForDay("2026-07-30");
    expect(a).toEqual(b);
  });

  it("assigns exactly 3 distinct items (of the 5) one-to-one to the 3 slots", () => {
    const scene = sceneForDay("2026-08-01");
    expect(scene).toHaveLength(3);
    expect(scene.map((a) => a.slot).sort()).toEqual(["cooler", "table", "tree"]);
    const items = scene.map((a) => a.item);
    expect(new Set(items).size).toBe(3);
    for (const item of items) {
      expect(["pinata", "pastel", "regalo", "globo", "vela"]).toContain(item);
    }
  });

  it("only ever picks position 0 or 1", () => {
    for (const day of ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"]) {
      for (const a of sceneForDay(day)) {
        expect([0, 1]).toContain(a.position);
      }
    }
  });

  it("matches a pinned example for a concrete date (regression anchor)", () => {
    expect(sceneForDay("2026-07-30")).toEqual([
      { slot: "cooler", item: "globo", position: 0 },
      { slot: "table", item: "regalo", position: 0 },
      { slot: "tree", item: "pastel", position: 1 },
    ]);
  });

  it("different days generally produce different scenes", () => {
    const days = ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"];
    const scenes = days.map((d) => JSON.stringify(sceneForDay(d)));
    expect(new Set(scenes).size).toBeGreaterThan(1);
  });
});

describe("describeScene", () => {
  it("matches the pinned example's Spanish sentences", () => {
    const scene: DailyScene = [
      { slot: "cooler", item: "globo", position: 0 },
      { slot: "table", item: "regalo", position: 0 },
      { slot: "tree", item: "pastel", position: 1 },
    ];
    expect(describeScene(scene)).toBe(
      "El globo está delante de la hielera. El regalo está encima de la mesa. " +
        "El pastel está a la derecha del árbol.",
    );
  });

  it("produces one sentence per assignment, each containing 'está'", () => {
    const scene = sceneForDay("2026-08-02");
    const sentences = describeScene(scene).split(". ").filter(Boolean);
    expect(sentences).toHaveLength(3);
    for (const s of sentences) expect(s).toContain("está");
  });
});
