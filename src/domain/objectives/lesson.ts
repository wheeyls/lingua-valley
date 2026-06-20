/**
 * A Lesson is the learning content for one crop cycle (one "week" / one area).
 *
 * The three farming-loop conversations all draw on the same lesson:
 *   - SEEDS introduces it ("this week we'll learn …").
 *   - WATER is daily practice against its theme.
 *   - STORE is the review / unit-test of the same theme.
 *
 * Lessons are plain data so a new area is just a new Lesson object — no new
 * objective classes required.
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
  /** Human label, e.g. "Greetings & introductions". */
  title: string;
  /** The "can-do" statement the player is working toward. */
  canDo: string;
  /** Vocab/phrases in scope, anchoring the LLM grading. */
  vocab: LessonVocab[];
  /** What the seeds NPC says they'll teach (sets expectations for the week). */
  introTheme: string;
  /** The daily practice scenario (water NPC). */
  practiceTheme: string;
  /** The review / unit-test scenario (store NPC). */
  reviewTheme: string;
}
