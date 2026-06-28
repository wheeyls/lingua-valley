/**
 * Leaderboard — pure helpers to summarize a player's status for the board.
 *
 * The board shows every user's progress: money, crop growth, whether they've
 * earned the train ticket (campaign complete), today's daily progress, their
 * streak, and when they were last active. Ranking is by overall progress.
 *
 * PURE DOMAIN: no framework imports, fully testable. The endpoint maps DB rows
 * into PlayerState, then uses these helpers to build + sort rows.
 */

import type { PlayerState } from "./player.js";
import { MAX_GROWTH } from "./field.js";
import { hasTicketTo } from "./inventory.js";

/** One row of the leaderboard, ready to render. */
export interface LeaderboardRow {
  displayName: string;
  avatarColor: number;
  money: number;
  /** Total growth units across the field (0..slots*MAX_GROWTH). */
  growth: number;
  /** Growth as a fraction of a full crop (0..1), for a progress bar. */
  growthPct: number;
  /** True once the player owns a ticket to the next area (campaign done). */
  ticket: boolean;
  /** Conversations completed today / total available today. */
  doneToday: number;
  totalToday: number;
  /** Consecutive days played. */
  streak: number;
  /** ISO timestamp of last activity, or "" if never. */
  lastActive: string;
  /** A single 0..N progress score used for ranking. */
  score: number;
}

/** Total growth units across all crops in the field. */
export function totalGrowth(state: PlayerState): number {
  return state.field.slots.reduce((sum, c) => sum + (c?.growth ?? 0), 0);
}

/**
 * Build a leaderboard row from a player's state.
 *  - `totalToday` is the number of conversations a full day offers (so "2/4").
 *  - `nextAreaId` lets us check whether they've earned the train ticket.
 *  - `lastActive` comes from the activity log (passed in by the endpoint).
 */
export function toLeaderboardRow(
  state: PlayerState,
  opts: { totalToday: number; nextAreaId?: string; lastActive?: string },
): LeaderboardRow {
  const growth = totalGrowth(state);
  const slots = Math.max(1, state.field.slots.length);
  const growthPct = Math.min(1, growth / (slots * MAX_GROWTH));
  const ticket = opts.nextAreaId ? hasTicketTo(state.inventory, opts.nextAreaId) : false;
  const doneToday = Object.keys(state.daily.objectiveState).length;

  // Overall progress score: ticket is the biggest milestone, then money (which
  // only comes from selling), then growth, then a small streak bonus.
  const score =
    (ticket ? 1000 : 0) + state.money * 2 + growth * 10 + state.daily.streak;

  return {
    displayName: state.displayName,
    avatarColor: state.avatarColor,
    money: state.money,
    growth,
    growthPct,
    ticket,
    doneToday: Math.min(doneToday, opts.totalToday),
    totalToday: opts.totalToday,
    streak: state.daily.streak,
    lastActive: opts.lastActive ?? "",
    score,
  };
}

/** Rank rows by overall progress (score), highest first. Stable, pure. */
export function rankLeaderboard(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort(
    (a, b) => b.score - a.score || b.money - a.money || a.displayName.localeCompare(b.displayName),
  );
}
