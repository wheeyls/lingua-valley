import { describe, it, expect } from "vitest";
import {
  isCheckpointSunday,
  checkpointWeek,
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
  it("covers the previous Sunday through the Saturday before the checkpoint", () => {
    const week = checkpointWeek("2026-07-12");
    expect(week.start).toBe("2026-07-05");
    expect(week.end).toBe("2026-07-11");
    expect(week.days).toEqual([
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
    ]);
  });

  it("excludes the checkpoint Sunday itself", () => {
    expect(checkpointWeek("2026-07-12").days).not.toContain("2026-07-12");
  });
});

describe("bloomsInWeek", () => {
  const week = checkpointWeek("2026-07-12"); // 2026-07-05 .. 2026-07-11

  it("counts watered days inside the window across rows", () => {
    const garden: Garden = {
      rows: [
        { seedDay: "2026-07-05", wateredDays: ["2026-07-05", "2026-07-06", "2026-07-11"] },
      ],
    };
    expect(bloomsInWeek(garden, week.days)).toBe(3);
  });

  it("ignores blooms outside the window (prior week + the checkpoint day)", () => {
    const garden: Garden = {
      rows: [
        { seedDay: "2026-06-28", wateredDays: ["2026-06-28", "2026-07-04"] },
        { seedDay: "2026-07-05", wateredDays: ["2026-07-12"] },
      ],
    };
    expect(bloomsInWeek(garden, week.days)).toBe(0);
  });
});

describe("buildCheckpoint", () => {
  const week = checkpointWeek("2026-07-12");

  it("sums each member's blooms + the group total, ordered by contribution", () => {
    const members = [
      {
        displayName: "Bea",
        avatarColor: 1,
        garden: { rows: [{ seedDay: "2026-07-05", wateredDays: ["2026-07-05"] }] },
      },
      {
        displayName: "Ana",
        avatarColor: 2,
        garden: {
          rows: [
            { seedDay: "2026-07-05", wateredDays: ["2026-07-05", "2026-07-06", "2026-07-07"] },
          ],
        },
      },
    ];
    const cp = buildCheckpoint(members, week);
    expect(cp.totalBlooms).toBe(4);
    expect(cp.rows.map((r) => r.displayName)).toEqual(["Ana", "Bea"]);
    expect(cp.rows[0].blooms).toBe(3);
  });

  it("handles a group with no blooms this week", () => {
    const cp = buildCheckpoint(
      [{ displayName: "Ana", avatarColor: 1, garden: { rows: [] } }],
      week,
    );
    expect(cp.totalBlooms).toBe(0);
    expect(cp.rows[0].blooms).toBe(0);
  });
});
