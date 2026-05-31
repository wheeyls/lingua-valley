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
  rapport: Record<string, number> | null;
  goods: Record<string, number> | null;
  towns_unlocked: string[] | null;
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
    rapport: state.rapport ?? {},
    goods: state.goods ?? {},
    townsUnlocked: state.towns_unlocked ?? [],
  };
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
