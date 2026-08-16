import { describe, it, expect } from "vitest";
import { gooseLocationForDay } from "./gooseMystery.js";

describe("gooseLocationForDay", () => {
  it("is deterministic — the same day always picks the same location", () => {
    const a = gooseLocationForDay("2026-08-16");
    const b = gooseLocationForDay("2026-08-16");
    expect(a).toEqual(b);
  });

  it("different days generally pick different locations", () => {
    const days = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15"];
    const picks = new Set(days.map((d) => gooseLocationForDay(d).id));
    expect(picks.size).toBeGreaterThan(1);
  });

  it("only ever picks one of the 5 real park locations", () => {
    const validIds = [
      "el-chapoteadero",
      "el-parque-infantil",
      "la-ramada",
      "el-escenario",
      "el-estanque-de-los-patos",
    ];
    for (let i = 0; i < 30; i++) {
      const loc = gooseLocationForDay(`2026-09-${String(i + 1).padStart(2, "0")}`);
      expect(validIds).toContain(loc.id);
    }
  });

  // The load-bearing invariant the whole clue design depends on: visiting
  // Papachulo + the two required GooseClue NPCs (wet, playArea, food) must
  // ALWAYS be enough to uniquely identify today's location, regardless of
  // which one it is. If someone edits the location table later and breaks
  // this, the mystery silently becomes unsolvable on some days — this test
  // catches that immediately instead.
  it("{wet, playArea, food} alone uniquely identifies every location", () => {
    // Sample enough days to hit all 5 locations, group by the 3-property
    // key, and confirm no two DIFFERENT locations ever share a key.
    const byKey = new Map<string, Set<string>>();
    const allIds = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const loc = gooseLocationForDay(`2028-01-01:${i}`);
      allIds.add(loc.id);
      const key = `${loc.wet}:${loc.playArea}:${loc.food}`;
      if (!byKey.has(key)) byKey.set(key, new Set());
      byKey.get(key)!.add(loc.id);
    }
    expect(allIds.size).toBe(5); // sanity: sampling actually covered all 5
    for (const [key, ids] of byKey) {
      expect(ids.size, `key ${key} maps to more than one location: ${[...ids]}`).toBe(1);
    }
  });
});
