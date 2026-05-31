/**
 * PlayerState — the core, framework-free representation of a player's progress.
 *
 * This is the DOMAIN shape. It is NOT a database row and NOT a Phaser object.
 * Adapters map between vendor/transport shapes and this type; the domain only
 * ever speaks in these terms.
 */

import type { CefrLevel } from "./cefr.js";
import type { VocabCard } from "./srs.js";
import { newCard, review } from "./srs.js";
import {
  computeReward,
  spendFocus,
  ACTIVITY_FOCUS_COST,
  type ActivityReward,
} from "./economy.js";
import { rapportGain } from "./friendship.js";

/** Skill tracks fed by activities (Stardew-style XP tracks). */
export interface Skills {
  speaking: number;
  listening: number;
  vocab: number;
}

export type SkillTrack = keyof Skills;

export interface PlayerState {
  /** Display identity (also used for the multiplayer avatar). */
  displayName: string;
  avatarColor: number;

  /** Currency. Server-authoritative when signed in. */
  pesos: number;

  /** Daily stamina. */
  focus: number;
  /** UTC date (YYYY-MM-DD) the current focus pool belongs to, for daily regen. */
  focusDay: string;

  skills: Skills;

  /** Objective ids the player has fully mastered. */
  masteredObjectiveIds: string[];

  /** Spaced-repetition cards, keyed by wordId. */
  cards: Record<string, VocabCard>;

  /** Rapport points per NPC id (drives friendship tier + trade quality). */
  rapport: Record<string, number>;

  /** Tradeable goods inventory: good id -> quantity. */
  goods: Record<string, number>;
}

export const FOCUS_MAX = 100;

export function initialPlayerState(
  displayName = "Aprendiz",
  avatarColor = 0xffc7d1,
  today = utcDay(new Date()),
): PlayerState {
  return {
    displayName,
    avatarColor,
    pesos: 0,
    focus: FOCUS_MAX,
    focusDay: today,
    skills: { speaking: 0, listening: 0, vocab: 0 },
    masteredObjectiveIds: [],
    cards: {},
    rapport: {},
    goods: {},
  };
}

/** UTC day string (YYYY-MM-DD). Pure — date is passed in, never read from a clock here. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The result of a single graded activity, as understood by the domain.
 * Adapters translate an LLM grade into this; the domain reduces it into state.
 */
export interface ActivityResult {
  objectiveId: string;
  level: CefrLevel;
  /** The skill track this activity exercised. */
  skill: SkillTrack;
  /** Word ids practised in this activity (become/advance SRS cards). */
  wordIds: string[];
  /** 0..1 grade components from the grader. */
  communication: number;
  accuracy: number;
  /**
   * Whether the activity demonstrated the objective well enough to master it.
   * (Decided upstream by the conversation gate's `gateShouldOpen`.)
   */
  objectiveMet: boolean;
  /** The NPC this conversation was with (for rapport). */
  npcId?: string;
  /**
   * True when a SCRIPTED role-play conversation reached its end — the moment
   * friendship grows. Repeating the same role-play repeatedly is the loop.
   */
  rolePlayComplete?: boolean;
}

/** What `applyActivity` returns: the new state plus what was awarded. */
export interface ApplyResult {
  state: PlayerState;
  /** Null when the activity was blocked (e.g. not enough focus). */
  reward: ActivityReward | null;
  blockedReason?: "insufficient-focus";
  /** Rapport gained with the NPC this turn (0 unless a role-play completed). */
  rapportGained?: number;
}

/**
 * THE core reducer: apply a graded activity to a player's state.
 *
 * Pure and deterministic — the caller supplies `now`. This single function is
 * the authoritative economy step; the server and the guest path both call it,
 * guaranteeing identical rules everywhere.
 */
export function applyActivity(
  prev: PlayerState,
  activity: ActivityResult,
  now: Date,
  objectiveWordIds: (objectiveId: string) => string[] = () => [],
): ApplyResult {
  const today = utcDay(now);

  // 1. Focus: regen for the day, then spend. Block if we can't afford it.
  const spend = spendFocus(
    { focus: prev.focus, focusDay: prev.focusDay },
    today,
    ACTIVITY_FOCUS_COST,
  );
  if (!spend.ok) {
    return {
      state: { ...prev, focus: spend.state.focus, focusDay: spend.state.focusDay },
      reward: null,
      blockedReason: "insufficient-focus",
    };
  }

  // 2. Compute the reward from the RAW grade (never trust precomputed numbers).
  const reward = computeReward(activity.communication, activity.accuracy, activity.level);

  // 3. Advance SRS cards for each practised word.
  const cards: Record<string, VocabCard> = { ...prev.cards };
  for (const wordId of activity.wordIds) {
    const card = cards[wordId] ?? newCard(wordId, now);
    cards[wordId] = review(card, reward.cardQuality, now);
  }

  // 4. Skills.
  const skills: Skills = { ...prev.skills };
  skills[activity.skill] = skills[activity.skill] + reward.skillGain;

  // 5. Mastery: only when the gate said so AND every word for the objective is mature.
  let masteredObjectiveIds = prev.masteredObjectiveIds;
  if (
    activity.objectiveMet &&
    !masteredObjectiveIds.includes(activity.objectiveId)
  ) {
    const required = objectiveWordIds(activity.objectiveId);
    const allMature =
      required.length === 0 ||
      required.every((w) => cards[w]?.state === "mature");
    if (allMature) {
      masteredObjectiveIds = [...masteredObjectiveIds, activity.objectiveId];
    }
  }

  // 6. Friendship: completing a role-play with an NPC builds rapport, scaled by
  //    quality. Repetition is the loop — every completion counts.
  const rapport: Record<string, number> = { ...prev.rapport };
  let rapportGained = 0;
  if (activity.rolePlayComplete && activity.npcId) {
    rapportGained = rapportGain(reward.quality);
    rapport[activity.npcId] = (rapport[activity.npcId] ?? 0) + rapportGained;
  }

  return {
    state: {
      ...prev,
      focus: spend.state.focus,
      focusDay: spend.state.focusDay,
      pesos: prev.pesos + reward.pesos,
      skills,
      cards,
      masteredObjectiveIds,
      rapport,
    },
    reward,
    rapportGained,
  };
}

/**
 * Merge a guest's state into an account's state on claim. Most-progressed wins:
 * sum pesos, max skills, union mastery, keep the more-advanced card per word.
 * Pure — used by the auth adapter but contains the merge *rules*.
 */
export function mergeStates(account: PlayerState, guest: PlayerState): PlayerState {
  const skills: Skills = {
    speaking: Math.max(account.skills.speaking, guest.skills.speaking),
    listening: Math.max(account.skills.listening, guest.skills.listening),
    vocab: Math.max(account.skills.vocab, guest.skills.vocab),
  };
  const masteredObjectiveIds = [
    ...new Set([...account.masteredObjectiveIds, ...guest.masteredObjectiveIds]),
  ];
  const cards: Record<string, VocabCard> = { ...account.cards };
  for (const [wordId, gCard] of Object.entries(guest.cards)) {
    const aCard = cards[wordId];
    cards[wordId] = !aCard || gCard.reps > aCard.reps ? gCard : aCard;
  }
  // Rapport: max per NPC. Goods: sum quantities.
  const rapport: Record<string, number> = { ...account.rapport };
  for (const [npc, pts] of Object.entries(guest.rapport)) {
    rapport[npc] = Math.max(rapport[npc] ?? 0, pts);
  }
  const goods: Record<string, number> = { ...account.goods };
  for (const [good, qty] of Object.entries(guest.goods)) {
    goods[good] = (goods[good] ?? 0) + qty;
  }
  return {
    ...account,
    pesos: account.pesos + guest.pesos,
    skills,
    masteredObjectiveIds,
    cards,
    rapport,
    goods,
  };
}
