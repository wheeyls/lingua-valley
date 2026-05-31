/**
 * Towns & gatekeepers — the journey from metropolis to remote producer towns.
 *
 * You travel from English-friendly cities into resource-rich small towns. Each
 * town's community is guarded by a GATEKEEPER: a capstone role-play you must
 * pass at high quality to prove your worthiness. Until you do, you can only
 * trade with MIDDLEMEN at a steep markup. Beat the gatekeeper and the town's
 * direct PRODUCERS (farmers/makers) open up — far better prices and goods the
 * middlemen never carry.
 *
 * Pure domain: the town shape lives in content (world.ts), but the *rules*
 * (who's accessible, capstone pass, price tier) live here. Framework-free.
 */

import type { CefrLevel } from "./cefr.js";
import type { PlayerState } from "./player.js";

/** A town's gatekeeper capstone challenge metadata. */
export interface Gatekeeper {
  /** NPC id of the gatekeeper. */
  npcId: string;
  /** Lesson slug used as the capstone role-play. */
  lessonSlug: string;
  /** Minimum average quality (0..1) across the capstone to earn trust. */
  passQuality: number;
}

/**
 * How much English help a town gives. 1 = metropolis (lots of English shown),
 * 0 = remote (you're on your own). Drives hint visibility + grading leniency.
 */
export type EnglishAvailability = number; // 0..1

export interface TownInfo {
  id: string;
  name: string;
  /** Depth along the journey: 0 = metropolis, increasing = more remote. */
  depth: number;
  level: CefrLevel;
  englishAvailability: EnglishAvailability;
  gatekeeper?: Gatekeeper;
}

/** Whether the player has earned a town's community trust (beaten its gatekeeper). */
export function isTownUnlocked(state: PlayerState, townId: string): boolean {
  return state.townsUnlocked.includes(townId);
}

/**
 * Whether a producer NPC is currently accessible: only after the town is
 * unlocked. Middlemen are always accessible.
 */
export function producerAccessible(
  state: PlayerState,
  townId: string,
): boolean {
  return isTownUnlocked(state, townId);
}

/**
 * Did the player pass the gatekeeper's capstone? Requires meeting the town's
 * quality bar. Pure — caller supplies the achieved average quality (0..1).
 */
export function capstonePassed(
  gatekeeper: Gatekeeper,
  achievedQuality: number,
): boolean {
  return achievedQuality >= gatekeeper.passQuality;
}

/** Record that the player beat a town's gatekeeper. Pure; returns new state. */
export function unlockTown(state: PlayerState, townId: string): PlayerState {
  if (state.townsUnlocked.includes(townId)) return state;
  return { ...state, townsUnlocked: [...state.townsUnlocked, townId] };
}

/**
 * Grading leniency for a town: metropolis is forgiving, remote towns are strict.
 * Returns a multiplier applied to the pass thresholds (higher = stricter).
 */
export function gradingStrictness(town: TownInfo): number {
  // 1.0 at full English availability, up to ~1.35 in the most remote town.
  return 1 + 0.35 * (1 - clamp01(town.englishAvailability));
}

/** Whether to show English hints by default in this town. */
export function showsEnglishHelp(town: TownInfo): boolean {
  return town.englishAvailability >= 0.5;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
