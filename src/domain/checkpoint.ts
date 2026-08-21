/**
 * Checkpoints — a group's weekly bloom review.
 *
 * A checkpoint is identified by the Sunday that ENDS its week. Its page sums
 * each group member's blooms over that Monday–Sunday week (inclusive of the
 * Sunday itself), giving a TEAM snapshot rather than an individual ranking —
 * the headline numbers are still group totals, not a leaderboard. Each row
 * also carries a couple of per-person details (which days they actually
 * played this week, and their current streak) so members are visually
 * distinguishable, not just a name and three counts.
 *
 * The "latest" checkpoint is the week containing today — which may still be
 * in progress. That's fine: `bloomsInWeek` only counts days that actually
 * happened, so a week isn't "wrong" until it's over, it's just partial.
 *
 * Blooms are recorded per Pacific calendar day by the garden (the app timezone;
 * see time.ts), so the checkpoint week is a set of 7 Pacific date strings and
 * counting is pure date-set membership — the week aligns to Pacific midnight.
 *
 * PURE DOMAIN: no framework imports, fully testable.
 */

import type { Garden } from "./garden.js";

/** Days reviewed by one checkpoint (Monday through its own Sunday, inclusive). */
export const CHECKPOINT_WINDOW_DAYS = 7;

/** The YYYY-MM-DD `n` days from `day` (UTC). */
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Day-of-week for a YYYY-MM-DD (UTC): 0 = Sunday. Invalid input → -1. */
function weekday(day: string): number {
  const t = new Date(`${day}T00:00:00.000Z`).getTime();
  return Number.isNaN(t) ? -1 : new Date(t).getUTCDay();
}

/** A checkpoint exists only on Sundays; every other (or malformed) date 404s. */
export function isCheckpointSunday(day: string): boolean {
  return weekday(day) === 0;
}

export interface CheckpointWeek {
  /** The checkpoint Sunday (the inclusive end of the window). */
  sunday: string;
  /** First day counted — the Monday of this week (S-6). */
  start: string;
  /** Last day counted — the checkpoint Sunday itself (S-0). */
  end: string;
  /** The 7 UTC date strings [start..end], Monday→Sunday. */
  days: string[];
}

/**
 * The window a checkpoint reviews: the Monday through the Sunday itself,
 * i.e. [S-6 .. S]. Assumes `sunday` is a Sunday — validate with
 * isCheckpointSunday first.
 */
export function checkpointWeek(sunday: string): CheckpointWeek {
  const days = Array.from({ length: CHECKPOINT_WINDOW_DAYS }, (_, i) =>
    addDays(sunday, i - (CHECKPOINT_WINDOW_DAYS - 1)),
  );
  return { sunday, start: days[0], end: days[days.length - 1], days };
}

/**
 * The Sunday ending the Monday–Sunday week that contains `today` — the
 * "latest" checkpoint. May be a few days in the future relative to `today`
 * (if today isn't a Sunday yet); that's fine, the week is just still in
 * progress.
 */
export function currentCheckpointSunday(today: string): string {
  const untilSunday = (7 - weekday(today)) % 7;
  return addDays(today, untilSunday);
}

/** Shift a checkpoint's anchor Sunday by whole weeks (+forward, -backward). */
export function shiftCheckpointWeek(sunday: string, weeks: number): string {
  return addDays(sunday, weeks * CHECKPOINT_WINDOW_DAYS);
}

/** How many blooms a garden recorded within the given set of days. */
export function bloomsInWeek(garden: Garden, days: readonly string[]): number {
  const set = new Set(days);
  let n = 0;
  for (const row of garden.rows) {
    for (const day of row.wateredDays) if (set.has(day)) n++;
  }
  return n;
}

/** One member's line on the checkpoint. */
export interface CheckpointRow {
  displayName: string;
  avatarColor: number;
  blooms: number;
  /** Foliage gathered this week — the greenery half of the shared bouquet. */
  foliage: number;
  /** Ribbons tied this week — the finishing touch on the shared bouquet. */
  ribbons: number;
  /** One entry per day in the checkpoint week (same Monday→Sunday order as
   *  CheckpointWeek.days) — true if this member watered ANY of their three
   *  gardens (main/foliage/ribbons) that day. */
  activeDays: boolean[];
  /** The member's current consecutive-day practice streak, as of now — not
   *  scoped to just this week (see DailyState.streak). */
  streak: number;
}

/** A group member's identity + gardens, as the checkpoint builder needs them. */
export interface CheckpointMember {
  displayName: string;
  avatarColor: number;
  garden: Garden;
  foliage: Garden;
  ribbons: Garden;
  /** Carried straight from DailyState.streak. */
  streak: number;
}

/** Which of `days` this member was active on — watered ANY of their three
 *  gardens that day. */
function activeDaysInWeek(member: CheckpointMember, days: readonly string[]): boolean[] {
  const watered = new Set<string>();
  for (const garden of [member.garden, member.foliage, member.ribbons]) {
    for (const row of garden.rows) {
      for (const day of row.wateredDays) watered.add(day);
    }
  }
  return days.map((day) => watered.has(day));
}

export interface Checkpoint {
  rows: CheckpointRow[];
  /** Blooms the whole group put up this week — the headline number. */
  totalBlooms: number;
  /** Foliage the whole group gathered this week — the bouquet's greenery. */
  totalFoliage: number;
  /** Ribbons the whole group tied this week — the bouquet's finishing touch. */
  totalRibbons: number;
}

/**
 * Build the group checkpoint: each member's blooms + foliage + ribbons for
 * the week plus the group totals — together, the shared bouquet. Ordered by
 * contribution then name — a team tally, not a glory board.
 */
export function buildCheckpoint(
  members: readonly CheckpointMember[],
  week: CheckpointWeek,
): Checkpoint {
  const rows: CheckpointRow[] = members
    .map((m) => ({
      displayName: m.displayName,
      avatarColor: m.avatarColor,
      blooms: bloomsInWeek(m.garden, week.days),
      foliage: bloomsInWeek(m.foliage, week.days),
      ribbons: bloomsInWeek(m.ribbons, week.days),
      activeDays: activeDaysInWeek(m, week.days),
      streak: m.streak,
    }))
    .sort((a, b) => b.blooms - a.blooms || a.displayName.localeCompare(b.displayName));
  const totalBlooms = rows.reduce((n, r) => n + r.blooms, 0);
  const totalFoliage = rows.reduce((n, r) => n + r.foliage, 0);
  const totalRibbons = rows.reduce((n, r) => n + r.ribbons, 0);
  return { rows, totalBlooms, totalFoliage, totalRibbons };
}
