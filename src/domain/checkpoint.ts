/**
 * Checkpoints — a group's weekly bloom review.
 *
 * A checkpoint "exists" on every Sunday. Its page sums each group member's
 * blooms over the 7 days ending the night before that Sunday, giving a TEAM
 * snapshot rather than an individual ranking. There are no streaks here: the
 * reward is helping the group put up a good week, not personal glory.
 *
 * Blooms are recorded per Pacific calendar day by the garden (the app timezone;
 * see time.ts), so the checkpoint week is a set of 7 Pacific date strings and
 * counting is pure date-set membership — the week aligns to Pacific midnight.
 *
 * PURE DOMAIN: no framework imports, fully testable.
 */

import type { Garden } from "./garden.js";

/** Days reviewed by one checkpoint (its own Sunday excluded). */
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
  /** The checkpoint Sunday (the exclusive end of the window). */
  sunday: string;
  /** First day counted — the previous Sunday (S-7). */
  start: string;
  /** Last day counted — the Saturday before the checkpoint (S-1). */
  end: string;
  /** The 7 UTC date strings [start..end], Sunday→Saturday. */
  days: string[];
}

/**
 * The window a checkpoint reviews: the previous Sunday through the Saturday
 * before the checkpoint Sunday, i.e. [S-7 .. S-1]. The checkpoint's own Sunday
 * is excluded (it belongs to the next week). Assumes `sunday` is a Sunday —
 * validate with isCheckpointSunday first.
 */
export function checkpointWeek(sunday: string): CheckpointWeek {
  const days = Array.from({ length: CHECKPOINT_WINDOW_DAYS }, (_, i) =>
    addDays(sunday, i - CHECKPOINT_WINDOW_DAYS),
  );
  return { sunday, start: days[0], end: days[days.length - 1], days };
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
}

/** A group member's identity + garden, as the checkpoint builder needs them. */
export interface CheckpointMember {
  displayName: string;
  avatarColor: number;
  garden: Garden;
}

export interface Checkpoint {
  rows: CheckpointRow[];
  /** Blooms the whole group put up this week — the headline number. */
  totalBlooms: number;
}

/**
 * Build the group checkpoint: each member's blooms for the week plus the group
 * total. Ordered by contribution then name — a team tally, not a glory board.
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
    }))
    .sort((a, b) => b.blooms - a.blooms || a.displayName.localeCompare(b.displayName));
  const totalBlooms = rows.reduce((n, r) => n + r.blooms, 0);
  return { rows, totalBlooms };
}
