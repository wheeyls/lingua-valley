/**
 * PlayerState — the core, framework-free representation of a player's progress.
 *
 * This is the DOMAIN shape. It is NOT a database row and NOT a persistence row.
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
import type { QuestProgress } from "./quest.js";
import { INITIAL_DAILY_STATE, type DailyState } from "./dailyLoop.js";
import {
  type Relationship,
  emptyRelationship,
  decay,
  applyGain,
} from "./relationship.js";

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

  /**
   * Per-NPC relationship record (rapport points + daily interaction tracking).
   * Drives friendship tier, trade quality, decay, and per-NPC daily caps.
   */
  rapport: Record<string, Relationship>;

  /** Tradeable goods inventory: good id -> quantity. */
  goods: Record<string, number>;

  /** Town ids whose gatekeeper the player has beaten (producers unlocked). */
  townsUnlocked: string[];

  /** Per-quest progress, keyed by quest id. */
  quests: Record<string, QuestProgress>;

  /** Count of reward-bearing activities done today (for the global daily soft-cap). */
  activitiesToday: number;
  /** UTC day the `activitiesToday` counter belongs to. */
  activityDay: string;

  /** Daily loop progress (3-step cadence: rosa → marisol → pablo). */
  daily: DailyState;
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
    townsUnlocked: [],
    quests: {},
    activitiesToday: 0,
    activityDay: today,
    daily: INITIAL_DAILY_STATE,
  };
}

/**
 * Normalize a loaded (possibly OLD or partial) value into a complete, valid
 * PlayerState by filling any missing fields with defaults. This is the forward-
 * compatible migration boundary: saves written by earlier versions (before
 * rapport/goods/townsUnlocked existed) load cleanly instead of crashing scenes.
 *
 * Pure — every repository runs loaded data through this before returning it.
 */
export function normalizePlayerState(value: unknown): PlayerState {
  const base = initialPlayerState();
  if (!value || typeof value !== "object") return base;
  const v = value as Partial<PlayerState>;
  return {
    displayName: typeof v.displayName === "string" ? v.displayName : base.displayName,
    avatarColor: typeof v.avatarColor === "number" ? v.avatarColor : base.avatarColor,
    pesos: typeof v.pesos === "number" ? v.pesos : 0,
    focus: typeof v.focus === "number" ? v.focus : FOCUS_MAX,
    focusDay: typeof v.focusDay === "string" ? v.focusDay : base.focusDay,
    skills: {
      speaking: numOr(v.skills?.speaking, 0),
      listening: numOr(v.skills?.listening, 0),
      vocab: numOr(v.skills?.vocab, 0),
    },
    masteredObjectiveIds: Array.isArray(v.masteredObjectiveIds)
      ? v.masteredObjectiveIds.filter((x) => typeof x === "string")
      : [],
    cards: isObject(v.cards) ? (v.cards as PlayerState["cards"]) : {},
    rapport: normalizeRapport(v.rapport),
    goods: isObject(v.goods) ? (v.goods as Record<string, number>) : {},
    townsUnlocked: Array.isArray(v.townsUnlocked)
      ? v.townsUnlocked.filter((x) => typeof x === "string")
      : [],
    quests: isObject(v.quests) ? (v.quests as PlayerState["quests"]) : {},
    activitiesToday: numOr((v as PlayerState).activitiesToday, 0),
    activityDay:
      typeof (v as PlayerState).activityDay === "string"
        ? (v as PlayerState).activityDay
        : base.activityDay,
    daily: isObject((v as PlayerState).daily)
      ? ((v as PlayerState).daily as DailyState)
      : INITIAL_DAILY_STATE,
  };
}

/**
 * Migrate rapport from the OLD flat `Record<string, number>` to the new
 * `Record<string, Relationship>`. Old saves stored just the points.
 */
function normalizeRapport(v: unknown): Record<string, Relationship> {
  const out: Record<string, Relationship> = {};
  if (!isObject(v)) return out;
  for (const [npc, raw] of Object.entries(v)) {
    if (typeof raw === "number") {
      out[npc] = { ...emptyRelationship(), points: raw };
    } else if (isObject(raw)) {
      const r = raw as { points?: unknown; lastDay?: unknown; countToday?: unknown };
      out[npc] = {
        points: numOr(r.points, 0),
        lastDay: typeof r.lastDay === "string" ? r.lastDay : "",
        countToday: numOr(r.countToday, 0),
      };
    }
  }
  return out;
}

function numOr(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}
function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
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

  // 6. Daily activity counter (for the global soft-cap). Resets each new day.
  const sameActivityDay = prev.activityDay === today;
  const activitiesBefore = sameActivityDay ? prev.activitiesToday : 0;

  // 7. Friendship: completing a conversation with an NPC builds rapport — but
  //    through the daily-cadence rules: settle decay, then apply per-NPC and
  //    global diminishing returns so grinding one NPC (or marathoning) pays less.
  const rapport: Record<string, Relationship> = { ...prev.rapport };
  let rapportGained = 0;
  if (activity.rolePlayComplete && activity.npcId) {
    const base = rapportGain(reward.quality);
    const result = applyGain(
      rapport[activity.npcId] ?? emptyRelationship(),
      base,
      { today, activitiesToday: activitiesBefore },
    );
    rapport[activity.npcId] = result.relationship;
    rapportGained = result.gained;
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
      activitiesToday: activitiesBefore + 1,
      activityDay: today,
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
  // Rapport: keep the relationship with more points per NPC; most-recent day.
  const rapport: Record<string, Relationship> = { ...account.rapport };
  for (const [npc, gRel] of Object.entries(guest.rapport)) {
    const aRel = rapport[npc];
    if (!aRel) {
      rapport[npc] = gRel;
    } else {
      rapport[npc] = {
        points: Math.max(aRel.points, gRel.points),
        lastDay: aRel.lastDay >= gRel.lastDay ? aRel.lastDay : gRel.lastDay,
        countToday: aRel.lastDay >= gRel.lastDay ? aRel.countToday : gRel.countToday,
      };
    }
  }
  const goods: Record<string, number> = { ...account.goods };
  for (const [good, qty] of Object.entries(guest.goods)) {
    goods[good] = (goods[good] ?? 0) + qty;
  }
  const townsUnlocked = [
    ...new Set([...account.townsUnlocked, ...guest.townsUnlocked]),
  ];
  // Quests: keep the more-advanced progress per quest (by phase rank, then steps).
  const phaseRank: Record<string, number> = {
    offered: 0,
    planning: 1,
    active: 2,
    recap: 3,
    done: 4,
  };
  const quests: PlayerState["quests"] = { ...account.quests };
  for (const [id, gp] of Object.entries(guest.quests)) {
    const ap = quests[id];
    if (
      !ap ||
      phaseRank[gp.phase] > phaseRank[ap.phase] ||
      gp.completedStepIds.length > ap.completedStepIds.length
    ) {
      quests[id] = gp;
    }
  }
  return {
    ...account,
    pesos: account.pesos + guest.pesos,
    skills,
    masteredObjectiveIds,
    cards,
    rapport,
    goods,
    townsUnlocked,
    quests,
  };
}

/**
 * Settle time-based state as of `today`: decay every relationship for skipped
 * days and reset the daily activity counter on a new day. Pure & idempotent —
 * call once when state is loaded (and safe to call again same-day).
 */
export function settleDailyState(state: PlayerState, today: string): PlayerState {
  const rapport: Record<string, Relationship> = {};
  let changed = false;
  for (const [npc, rel] of Object.entries(state.rapport)) {
    const settled = decay(rel, today);
    rapport[npc] = settled;
    if (settled.points !== rel.points) changed = true;
  }
  const newDay = state.activityDay !== today;
  if (!changed && !newDay) return state;
  return {
    ...state,
    rapport,
    activitiesToday: newDay ? 0 : state.activitiesToday,
    activityDay: today,
  };
}
