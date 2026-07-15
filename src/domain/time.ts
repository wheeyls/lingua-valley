/**
 * App time — the app runs on US Pacific time (America/Los_Angeles), not UTC, so
 * a "day" rolls over at Pacific midnight for our West-Coast users. This is the
 * single place an instant becomes a calendar day; every other date helper works
 * on the resulting day strings, which are timezone-agnostic to add/compare.
 *
 * PURE DOMAIN: Intl is a JS built-in (Node + browser + tests alike), not a
 * framework, so it's allowed here.
 */

/** The timezone the whole app treats as "local". */
export const APP_TIME_ZONE = "America/Los_Angeles";

const DAY_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The YYYY-MM-DD calendar day an instant falls on in the app's timezone.
 * DST-correct: Intl resolves PST vs PDT for the given instant.
 */
export function appDay(date: Date): string {
  const parts = DAY_PARTS.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
