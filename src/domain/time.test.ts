import { describe, it, expect } from "vitest";
import { appDay, APP_TIME_ZONE } from "./time.js";

describe("appDay — the app's day is US Pacific, not UTC", () => {
  it("targets US Pacific time", () => {
    expect(APP_TIME_ZONE).toBe("America/Los_Angeles");
  });

  it("returns the Pacific calendar date for an instant", () => {
    // 2026-07-12 05:00 UTC = 2026-07-11 22:00 PDT.
    expect(appDay(new Date("2026-07-12T05:00:00Z"))).toBe("2026-07-11");
  });

  it("counts a late-evening Pacific session as that day, not tomorrow (the UTC bug)", () => {
    // 8pm Pacific on Jul 11 (PDT) is 03:00 UTC Jul 12. Under UTC it would wrongly
    // roll to Jul 12; on Pacific it correctly stays Jul 11.
    expect(appDay(new Date("2026-07-12T03:00:00Z"))).toBe("2026-07-11");
  });

  it("is DST-correct: PDT in summer (UTC-7)", () => {
    // 2026-07-15 06:00 UTC = 2026-07-14 23:00 PDT.
    expect(appDay(new Date("2026-07-15T06:00:00Z"))).toBe("2026-07-14");
  });

  it("is DST-correct: PST in winter (UTC-8)", () => {
    // 2026-01-15 05:00 UTC = 2026-01-14 21:00 PST.
    expect(appDay(new Date("2026-01-15T05:00:00Z"))).toBe("2026-01-14");
  });

  it("always formats as YYYY-MM-DD", () => {
    expect(appDay(new Date("2026-07-12T20:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
