/**
 * The garden — the streak-rewarding field.
 *
 * The field is a set of ROWS; each row is a 7-day PERIOD with one plant per day.
 * Growth is driven by regular play, and consistency is shown organically:
 *
 *   - Get seed from the seed farm → starts a new row (a fresh 7-day period).
 *   - Do the daily water practice → that day's plant BLOOMS.
 *   - Skip a day → that day's plant WITHERS (a scar that stays), so a run of
 *     blooms broken by a withered plant reads as a streak at a glance.
 *   - After the row's 7 days elapse, go back to the seed farm for the next row.
 *
 * Cells are pinned to calendar days: row `seedDay` is day 0, and cell `i`
 * represents `seedDay + i`. That makes the whole grid a pure function of the
 * seed day + which days were watered, so it renders identically on the server,
 * in the browser, and in tests. The caller always supplies "today".
 *
 * PURE DOMAIN: no framework imports, fully testable.
 */

/** Plants per row = days in one growing period. */
export const ROW_LENGTH = 7;

/** How many of the most recent rows the field shows (4 rows of 7). */
export const VISIBLE_ROWS = 4;

export type CellState = "bloomed" | "withered" | "today" | "empty";

export interface GardenRow {
  /** YYYY-MM-DD the seed was planted; this row's day 0. */
  seedDay: string;
  /** YYYY-MM-DD days the player watered within this row's 7-day window. */
  wateredDays: string[];
}

export interface Garden {
  rows: GardenRow[];
}

/** A fresh garden with no rows — the player must get their first seed. */
export function makeGarden(): Garden {
  return { rows: [] };
}

/** The YYYY-MM-DD `n` days after `day` (UTC). */
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The last day (inclusive) of a row's 7-day window. */
function rowEndDay(row: GardenRow): string {
  return addDays(row.seedDay, ROW_LENGTH - 1);
}

/**
 * The row currently accepting water: the most recent row whose 7-day window
 * contains `today`. Null when there are no rows or the latest row's period has
 * ended (the player needs a new seed).
 */
export function activeRow(garden: Garden, today: string): GardenRow | null {
  const last = garden.rows[garden.rows.length - 1];
  if (!last) return null;
  return today >= last.seedDay && today <= rowEndDay(last) ? last : null;
}

/** Whether a row's 7-day period has fully elapsed as of `today`. */
export function isRowComplete(row: GardenRow, today: string): boolean {
  return today > rowEndDay(row);
}

/** Whether the player should visit the seed farm to start the next row. */
export function needsSeed(garden: Garden, today: string): boolean {
  return activeRow(garden, today) === null;
}

/**
 * Plant the seed for a new row starting `today`. No-op unless the garden needs
 * seed (prevents stacking rows while one is still growing). Pure.
 */
export function plantRow(garden: Garden, today: string): Garden {
  if (!needsSeed(garden, today)) return garden;
  return { rows: [...garden.rows, { seedDay: today, wateredDays: [] }] };
}

/** Result of watering: the new garden and whether a plant bloomed. */
export interface WaterResult {
  garden: Garden;
  bloomed: boolean;
}

/**
 * Water the active row for `today`, blooming today's plant. Pure & idempotent
 * within a day: watering again the same day (or with no active row) blooms
 * nothing.
 */
export function waterActiveRow(garden: Garden, today: string): WaterResult {
  const row = activeRow(garden, today);
  if (!row || row.wateredDays.includes(today)) {
    return { garden, bloomed: false };
  }
  const idx = garden.rows.length - 1;
  const rows = garden.rows.slice();
  rows[idx] = { ...row, wateredDays: [...row.wateredDays, today] };
  return { garden: { rows }, bloomed: true };
}

/** The 7 cell states for a row as of `today`. */
export function rowCells(row: GardenRow, today: string): CellState[] {
  const cells: CellState[] = [];
  for (let i = 0; i < ROW_LENGTH; i++) {
    const day = addDays(row.seedDay, i);
    if (row.wateredDays.includes(day)) cells.push("bloomed");
    else if (day < today) cells.push("withered");
    else if (day === today) cells.push("today");
    else cells.push("empty");
  }
  return cells;
}

/** The most recent `VISIBLE_ROWS` rows as cell grids, oldest first. */
export function grid(
  garden: Garden,
  today: string,
  visibleRows = VISIBLE_ROWS,
): CellState[][] {
  return garden.rows.slice(-visibleRows).map((r) => rowCells(r, today));
}

/** Total plants ever bloomed across all rows — the progress/score metric. */
export function totalBlooms(garden: Garden): number {
  return garden.rows.reduce((n, r) => n + r.wateredDays.length, 0);
}

/** Blooms in the active row as of `today` (0 when a new seed is needed). */
export function bloomsThisRow(garden: Garden, today: string): number {
  const row = activeRow(garden, today);
  return row ? row.wateredDays.length : 0;
}
