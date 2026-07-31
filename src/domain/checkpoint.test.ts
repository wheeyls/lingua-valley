import { describe, it, expect } from "vitest";
import {
  isCheckpointSunday,
  checkpointWeek,
  currentCheckpointSunday,
  shiftCheckpointWeek,
  bloomsInWeek,
  buildCheckpoint,
} from "./checkpoint.js";
import type { Garden } from "./garden.js";

describe("isCheckpointSunday", () => {
  it("accepts Sundays", () => {
    expect(isCheckpointSunday("2026-07-05")).toBe(true);
    expect(isCheckpointSunday("2026-07-12")).toBe(true);
  });

  it("rejects non-Sundays (incl. the example date 2026-07-11, a Saturday)", () => {
    expect(isCheckpointSunday("2026-07-11")).toBe(false);
    expect(isCheckpointSunday("2026-07-06")).toBe(false);
  });

  it("rejects malformed dates", () => {
    expect(isCheckpointSunday("not-a-date")).toBe(false);
    expect(isCheckpointSunday("")).toBe(false);
  });
});

describe("checkpointWeek", () => {
  it("covers Monday through the checkpoint Sunday itself", () => {
    const week = checkpointWeek("2026-07-12");
    expect(week.start).toBe("2026-07-06");
    expect(week.end).toBe("2026-07-12");
    expect(week.days).toEqual([
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
    ]);
  });

  it("includes the checkpoint Sunday itself", () => {
    expect(checkpointWeek("2026-07-12").days).toContain("2026-07-12");
  });
});

describe("currentCheckpointSunday", () => {
  it("returns the same day when today is already a Sunday", () => {
    expect(currentCheckpointSunday("2026-07-12")).toBe("2026-07-12");
  });

  it("returns the upcoming Sunday for any other day in the week", () => {
    expect(currentCheckpointSunday("2026-07-06")).toBe("2026-07-12"); // Monday
    expect(currentCheckpointSunday("2026-07-09")).toBe("2026-07-12"); // Thursday
    expect(currentCheckpointSunday("2026-07-11")).toBe("2026-07-12"); // Saturday
  });
});

describe("shiftCheckpointWeek", () => {
  it("shifts backward and forward by whole weeks", () => {
    expect(shiftCheckpointWeek("2026-07-12", -1)).toBe("2026-07-05");
    expect(shiftCheckpointWeek("2026-07-12", 1)).toBe("2026-07-19");
    expect(shiftCheckpointWeek("2026-07-12", 0)).toBe("2026-07-12");
  });
});

describe("bloomsInWeek", () => {
  const week = checkpointWeek("2026-07-12"); // 2026-07-06 .. 2026-07-12

  it("counts watered days inside the window across rows", () => {
    const garden: Garden = {
      rows: [
        { seedDay: "2026-07-06", wateredDays: ["2026-07-06", "2026-07-07", "2026-07-12"] },
      ],
    };
    expect(bloomsInWeek(garden, week.days)).toBe(3);
  });

  it("ignores blooms outside the window (prior week + the following Monday)", () => {
    const garden: Garden = {
      rows: [
        { seedDay: "2026-06-28", wateredDays: ["2026-06-28", "2026-07-05"] },
        { seedDay: "2026-07-06", wateredDays: ["2026-07-13"] },
      ],
    };
    expect(bloomsInWeek(garden, week.days)).toBe(0);
  });
});

describe("buildCheckpoint", () => {
  const week = checkpointWeek("2026-07-12");
  const emptyGarden: Garden = { rows: [] };

  it("sums each member's blooms + the group total, ordered by contribution", () => {
    const members = [
      {
        displayName: "Bea",
        avatarColor: 1,
        garden: { rows: [{ seedDay: "2026-07-06", wateredDays: ["2026-07-06"] }] },
        foliage: emptyGarden,
      },
      {
        displayName: "Ana",
        avatarColor: 2,
        garden: {
          rows: [
            { seedDay: "2026-07-06", wateredDays: ["2026-07-06", "2026-07-07", "2026-07-08"] },
          ],
        },
        foliage: emptyGarden,
      },
    ];
    const cp = buildCheckpoint(members, week);
    expect(cp.totalBlooms).toBe(4);
    expect(cp.rows.map((r) => r.displayName)).toEqual(["Ana", "Bea"]);
    expect(cp.rows[0].blooms).toBe(3);
  });

  it("handles a group with no blooms this week", () => {
    const cp = buildCheckpoint(
      [{ displayName: "Ana", avatarColor: 1, garden: emptyGarden, foliage: emptyGarden }],
      week,
    );
    expect(cp.totalBlooms).toBe(0);
    expect(cp.rows[0].blooms).toBe(0);
  });

  it("sums foliage alongside blooms — the shared bouquet's greenery", () => {
    const members = [
      {
        displayName: "Ana",
        avatarColor: 1,
        garden: emptyGarden,
        foliage: { rows: [{ seedDay: "2026-07-06", wateredDays: ["2026-07-06", "2026-07-07"] }] },
      },
      {
        displayName: "Bea",
        avatarColor: 2,
        garden: emptyGarden,
        foliage: { rows: [{ seedDay: "2026-07-06", wateredDays: ["2026-07-08"] }] },
      },
    ];
    const cp = buildCheckpoint(members, week);
    expect(cp.totalFoliage).toBe(3);
    expect(cp.rows.find((r) => r.displayName === "Ana")?.foliage).toBe(2);
    expect(cp.rows.find((r) => r.displayName === "Bea")?.foliage).toBe(1);
  });
});
