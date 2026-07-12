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
  title: "El pasado — telling a story about the past",
  canDo:
    "understand and tell a simple past-tense story — grounding events in time, " +
    "linking them with connectors, and closing it off",
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
    { es: "esa mañana", en: "that morning" },
    { es: "poco después", en: "shortly after" },
    { es: "justo antes de…", en: "just before…" },
    { es: "y", en: "and" },
    { es: "además", en: "besides / also" },
    { es: "pero", en: "but" },
    { es: "sin embargo", en: "however" },
    { es: "entonces", en: "so / then" },
    { es: "porque", en: "because" },
    { es: "de repente", en: "suddenly" },
    { es: "de la nada", en: "out of nowhere" },
    { es: "para mi sorpresa", en: "to my surprise" },
    { es: "en realidad", en: "actually" },
    { es: "de hecho", en: "in fact" },
    { es: "básicamente", en: "basically" },
    { es: "al final", en: "in the end" },
    { es: "finalmente", en: "finally" },
    { es: "en conclusión", en: "in conclusion" },
    { es: "resulta que", en: "it turns out that" },
  ],
  introTheme:
    "Explain that this week is about TELLING STORIES in the past — not just " +
    "listing what happened, but shaping it: ground events in time (esa mañana, " +
    "poco después, justo antes de), link them with connectors (y, además, pero, " +
    "entonces, porque), add drama (de repente, de la nada, para mi sorpresa), " +
    "and close neatly (al final, finalmente, en conclusión). They'll build on " +
    "simple past-tense verbs (fui, comí, compré, vi) and sequence words " +
    "(primero, luego, después).",

  // Two-person practice: Marisol tells a story, Pablo asks the player to retell.
  storyTheme:
    "You are telling the player a little STORY about your day, in simple past " +
    "tense. Shape it like a mini-narrative: OPEN by grounding it in time " +
    "('Esa mañana…', 'Ayer por la tarde…', 'Poco después…'); tell 2–3 " +
    "DISTINCTIVE, easy-to-picture actions (e.g. 'Fui al mercado.', 'Compré " +
    "flores rojas.') linked with connectors (y, además, luego, entonces, pero); " +
    "add ONE dramatic beat with 'de repente', 'de la nada' or 'para mi sorpresa' " +
    "(e.g. 'De repente, empezó a llover.'); and CLOSE with 'al final' or " +
    "'finalmente' (e.g. 'Al final, volví a casa.'). Keep every sentence short " +
    "and A2-simple; the first time you use a less common connector, gloss it in " +
    "English (e.g. 'sin embargo (however)'). After your story ask '¿Entendiste?' " +
    "— the player only needs to confirm. Vary the story each time.",
  retellTheme:
    "You are Pablo. Marisol just told the player a little story about her day. " +
    "Ask '¿Qué hizo Marisol hoy?' and have the player RETELL it in past tense, " +
    "IN ORDER. Nudge them to use time markers and connectors as they go — prompt " +
    "with '¿Y luego?', '¿Y entonces?', '¿Qué pasó de repente?'. If they're " +
    "stuck, give the first word or a small hint. Praise correct past-tense verbs " +
    "and any connector they use (primero, luego, después, entonces, al final). " +
    "Wrap up once they've retold the main events.",

  reviewTheme:
    "You are the shopkeeper buying the player's harvest. As a friendly review, " +
    "ask the player to tell YOU a little story about their day: '¿Qué hiciste " +
    "hoy? ¡Cuéntame!'. Encourage a beginning, middle and end — a time marker to " +
    "open (esa mañana, ayer), 2–3 past-tense actions linked with connectors " +
    "(y, luego, entonces, pero), a dramatic beat if they like (de repente), and " +
    "a closing (al final, finalmente). Make sure they can string the events " +
    "together before you agree a price.",
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
