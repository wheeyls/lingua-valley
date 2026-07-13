import { describe, it, expect } from "vitest";
import {
  ROW_LENGTH,
  VISIBLE_ROWS,
  makeGarden,
  plantRow,
  waterActiveRow,
  activeRow,
  isRowComplete,
  needsSeed,
  rowCells,
  grid,
  totalBlooms,
  bloomsThisRow,
  type Garden,
} from "../garden";

const D = (n: number) => `2025-06-${String(n).padStart(2, "0")}`;
const addDays = (day: string, n: number): string => {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

describe("garden — seeding", () => {
  it("starts empty and needs seed", () => {
    const g = makeGarden();
    expect(g.rows).toHaveLength(0);
    expect(needsSeed(g, D(1))).toBe(true);
    expect(activeRow(g, D(1))).toBeNull();
  });

  it("planting a row opens a 7-day period", () => {
    const g = plantRow(makeGarden(), D(1));
    expect(g.rows).toHaveLength(1);
    expect(g.rows[0].seedDay).toBe(D(1));
    expect(needsSeed(g, D(1))).toBe(false);
    expect(activeRow(g, D(1))?.seedDay).toBe(D(1));
  });

  it("does not stack rows while one is still growing", () => {
    let g = plantRow(makeGarden(), D(1));
    g = plantRow(g, D(3)); // still within the first row's window
    expect(g.rows).toHaveLength(1);
  });
});

describe("garden — watering blooms today's plant", () => {
  it("blooms the current day's plant, once per day", () => {
    let g = plantRow(makeGarden(), D(1));
    const first = waterActiveRow(g, D(1));
    expect(first.bloomed).toBe(true);
    g = first.garden;
    // Same day again: nothing new blooms.
    const second = waterActiveRow(g, D(1));
    expect(second.bloomed).toBe(false);
    expect(bloomsThisRow(g, D(1))).toBe(1);
  });

  it("does not bloom when there is no active row (needs seed)", () => {
    const g = makeGarden();
    const res = waterActiveRow(g, D(1));
    expect(res.bloomed).toBe(false);
    expect(res.garden).toBe(g);
  });

  it("accumulates blooms across days within a row", () => {
    let g = plantRow(makeGarden(), D(1));
    g = waterActiveRow(g, D(1)).garden;
    g = waterActiveRow(g, D(2)).garden;
    g = waterActiveRow(g, D(4)).garden; // skipped D(3)
    expect(bloomsThisRow(g, D(4))).toBe(3);
    expect(totalBlooms(g)).toBe(3);
  });
});

describe("garden — cell states show streaks organically", () => {
  it("marks bloomed / withered / today / empty per day", () => {
    let g = plantRow(makeGarden(), D(1));
    g = waterActiveRow(g, D(1)).garden;
    g = waterActiveRow(g, D(3)).garden; // D(2) skipped
    const cells = rowCells(g.rows[0], D(4));
    expect(cells).toEqual([
      "bloomed", // D(1) watered
      "withered", // D(2) skipped (past)
      "bloomed", // D(3) watered
      "today", // D(4) current, not yet watered
      "empty", // D(5) future
      "empty", // D(6)
      "empty", // D(7)
    ]);
  });

  it("watering today flips today's cell from today -> bloomed", () => {
    let g = plantRow(makeGarden(), D(1));
    g = waterActiveRow(g, D(1)).garden;
    expect(rowCells(g.rows[0], D(1))[0]).toBe("bloomed");
    expect(rowCells(g.rows[0], D(1))[1]).toBe("empty"); // D(2) still future on D(1)
  });
});

describe("garden — row completion + next row", () => {
  it("a row completes after its 7-day period elapses", () => {
    const g = plantRow(makeGarden(), D(1));
    expect(isRowComplete(g.rows[0], D(7))).toBe(false); // last day of window
    expect(isRowComplete(g.rows[0], D(8))).toBe(true);
    expect(needsSeed(g, D(7))).toBe(false);
    expect(needsSeed(g, D(8))).toBe(true);
  });

  it("planting after completion starts a fresh row", () => {
    let g = plantRow(makeGarden(), D(1));
    g = waterActiveRow(g, D(1)).garden;
    g = plantRow(g, D(8)); // new period after the first ended
    expect(g.rows).toHaveLength(2);
    expect(g.rows[1].seedDay).toBe(D(8));
    expect(activeRow(g, D(8))?.seedDay).toBe(D(8));
  });
});

describe("garden — rolling grid", () => {
  it(`shows only the most recent ${VISIBLE_ROWS} rows`, () => {
    let g: Garden = makeGarden();
    let seed = "2025-07-01";
    for (let week = 0; week < 5; week++) {
      g = plantRow(g, seed);
      for (let d = 0; d < ROW_LENGTH; d++) {
        g = waterActiveRow(g, addDays(seed, d)).garden;
      }
      seed = addDays(seed, ROW_LENGTH);
    }
    expect(g.rows).toHaveLength(5);
    const view = grid(g, "2025-10-01");
    expect(view).toHaveLength(VISIBLE_ROWS);
    expect(view.every((row) => row.length === ROW_LENGTH)).toBe(true);
    expect(view.every((row) => row.every((c) => c === "bloomed"))).toBe(true);
  });
});
