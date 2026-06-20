/**
 * A Lesson is the learning content for one crop cycle (one "week" / one area /
 * one campaign).
 *
 * The farming-loop conversations all draw on the same lesson:
 *   - SEEDS introduces it ("this week we'll learn …").
 *   - WATER is daily practice against its theme. A practice location may have
 *     TWO people you talk to in sequence (e.g. someone tells you a story, then
 *     someone quizzes you on it) — see `storyTheme` / `retellTheme`.
 *   - STORE is the review / unit-test of the same theme.
 *
 * Lessons are plain data so a new campaign is mostly a new Lesson object.
 */

import type { CefrLevel } from "../cefr.js";

export interface LessonVocab {
  es: string;
  en: string;
}

export interface Lesson {
  /** Stable id (also used as the crop's theme + objective id prefix). */
  id: string;
  level: CefrLevel;
  /** Human label, e.g. "Talking about the past". */
  title: string;
  /** The "can-do" statement the player is working toward. */
  canDo: string;
  /** Vocab/phrases in scope, anchoring the LLM grading. */
  vocab: LessonVocab[];
  /** What the seeds NPC says they'll teach (sets expectations for the week). */
  introTheme: string;

  /**
   * The daily practice at the water location. A practice can be a single
   * conversation (`practiceTheme`) OR a two-person flow where one NPC tells a
   * story (`storyTheme`) and another asks the player to retell it
   * (`retellTheme`). When the pair is present, completing BOTH counts as the
   * day's watering.
   */
  practiceTheme?: string;
  storyTheme?: string;
  retellTheme?: string;

  /** The review / unit-test scenario (store NPC). */
  reviewTheme: string;
}
