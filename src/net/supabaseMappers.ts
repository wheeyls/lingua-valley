/**
 * Row ⇄ domain mappers. Persistence shape is NOT the domain shape: these
 * functions translate Supabase rows into the domain PlayerState and back.
 * The domain never imports these row types.
 */

import type { PlayerState, Skills } from "../domain/player.js";
import { initialPlayerState, utcDay } from "../domain/player.js";
import type { VocabCard, CardState } from "../domain/srs.js";

export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_color: number;
}

export interface PlayerStateRow {
  user_id: string;
  pesos: number;
  focus: number;
  focus_day: string; // date
  skills: Partial<Skills> | null;
  mastered_ids: string[] | null;
  /** jsonb: may be the new Relationship shape OR the legacy flat number per NPC. */
  rapport: Record<string, unknown> | null;
  goods: Record<string, number> | null;
  towns_unlocked: string[] | null;
  quests: PlayerState["quests"] | null;
  activities_today: number | null;
  activity_day: string | null;
}

export interface VocabCardRow {
  user_id: string;
  word_id: string;
  ease: number;
  interval_days: number;
  reps: number;
  due_at: string;
  state: string;
}

export function rowsToPlayerState(
  profile: ProfileRow | null,
  state: PlayerStateRow | null,
  cards: VocabCardRow[],
): PlayerState {
  const base = initialPlayerState(
    profile?.display_name ?? "Aprendiz",
    profile?.avatar_color ?? 0xffc7d1,
    state?.focus_day ?? utcDay(new Date()),
  );
  if (!state) return base;

  const cardMap: Record<string, VocabCard> = {};
  for (const c of cards) {
    cardMap[c.word_id] = {
      wordId: c.word_id,
      ease: c.ease,
      intervalDays: c.interval_days,
      reps: c.reps,
      dueAt: c.due_at,
      state: c.state as CardState,
    };
  }

  return {
    ...base,
    pesos: state.pesos,
    focus: state.focus,
    focusDay: state.focus_day,
    skills: {
      speaking: state.skills?.speaking ?? 0,
      listening: state.skills?.listening ?? 0,
      vocab: state.skills?.vocab ?? 0,
    },
    masteredObjectiveIds: state.mastered_ids ?? [],
    cards: cardMap,
    rapport: migrateRapport(state.rapport),
    goods: state.goods ?? {},
    townsUnlocked: state.towns_unlocked ?? [],
    quests: state.quests ?? {},
    activitiesToday: state.activities_today ?? 0,
    activityDay: state.activity_day ?? base.activityDay,
  };
}

/**
 * DB rapport jsonb may hold the OLD flat number per NPC; migrate to the
 * Relationship shape so cloud rows from before this change load cleanly.
 */
function migrateRapport(raw: PlayerStateRow["rapport"]): PlayerState["rapport"] {
  const out: PlayerState["rapport"] = {};
  if (!raw) return out;
  for (const [npc, val] of Object.entries(raw)) {
    if (typeof val === "number") {
      out[npc] = { points: val, lastDay: "", countToday: 0 };
    } else if (val && typeof val === "object") {
      const r = val as { points?: number; lastDay?: string; countToday?: number };
      out[npc] = {
        points: typeof r.points === "number" ? r.points : 0,
        lastDay: typeof r.lastDay === "string" ? r.lastDay : "",
        countToday: typeof r.countToday === "number" ? r.countToday : 0,
      };
    }
  }
  return out;
}

export function playerStateToRow(userId: string, s: PlayerState): PlayerStateRow {
  return {
    user_id: userId,
    pesos: s.pesos,
    focus: s.focus,
    focus_day: s.focusDay,
    skills: s.skills,
    mastered_ids: s.masteredObjectiveIds,
    rapport: s.rapport,
    goods: s.goods,
    towns_unlocked: s.townsUnlocked,
    quests: s.quests,
    activities_today: s.activitiesToday,
    activity_day: s.activityDay,
  };
}

export function cardsToRows(userId: string, s: PlayerState): VocabCardRow[] {
  return Object.values(s.cards).map((c) => ({
    user_id: userId,
    word_id: c.wordId,
    ease: c.ease,
    interval_days: c.intervalDays,
    reps: c.reps,
    due_at: c.dueAt,
    state: c.state,
  }));
}
