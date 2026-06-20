/**
 * Lesson content — one Lesson per crop cycle / campaign.
 *
 * A Lesson is the learning material the farming-loop conversations draw on
 * (seeds introduces it, the water location drills it daily, store reviews it).
 * The current campaign teaches the SIMPLE PAST: understanding someone recount
 * their day, retelling it, and recounting your own.
 */

import type { Lesson } from "../domain/objectives/lesson.js";

export const A2_PAST_TENSE: Lesson = {
  id: "past-tense",
  level: "A2",
  title: "El pasado — talking about the past",
  canDo: "understand a simple past-tense story and retell what happened",
  vocab: [
    { es: "ayer", en: "yesterday" },
    { es: "fui a…", en: "I went to…" },
    { es: "comí", en: "I ate" },
    { es: "compré", en: "I bought" },
    { es: "vi", en: "I saw" },
    { es: "primero", en: "first" },
    { es: "luego", en: "then / next" },
    { es: "después", en: "after that" },
    { es: "ella fue a…", en: "she went to…" },
    { es: "ella compró…", en: "she bought…" },
  ],
  introTheme:
    "Explain that this week is all about the PAST: understanding when someone " +
    "tells you what they did, retelling their story, and recounting your own " +
    "day using simple past-tense verbs (fui, comí, compré, vi) and sequence " +
    "words (primero, luego, después).",

  // Two-person practice: Marisol tells a story, Pablo asks the player to retell.
  storyTheme:
    "You are telling the player about YOUR day. Tell them exactly 2 things you " +
    "did, in simple past tense. Make them DISTINCTIVE and easy to picture " +
    "(e.g. 'Fui al mercado.' 'Compré flores rojas.' 'Vi un perro grande.'). " +
    "Avoid vague actions. Each action is ONE short sentence. After your 2 " +
    "things, ask '¿Entendiste?' — the player only needs to confirm. Vary the " +
    "story each time.",
  retellTheme:
    "You are Pablo. Marisol just told the player what she did. Ask '¿Qué hizo " +
    "Marisol hoy?' and have the player RETELL her two actions in past tense. " +
    "Prompt one thing at a time; if they're stuck, hint with '¿Y luego?' or " +
    "give the first word. Praise correct past-tense verbs and wrap up when " +
    "they've covered both actions.",

  reviewTheme:
    "You are the shopkeeper buying the player's harvest. As a friendly review, " +
    "ask the player to tell YOU about their day: '¿Qué hiciste hoy?' Make sure " +
    "they can recount 2–3 things in simple past tense with sequence words " +
    "before you agree a price.",
};

/** All lessons, keyed by id. */
export const ALL_LESSONS: Record<string, Lesson> = {
  [A2_PAST_TENSE.id]: A2_PAST_TENSE,
};

/** The lesson for the current campaign. */
export const CURRENT_LESSON: Lesson = A2_PAST_TENSE;

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS[id];
}
