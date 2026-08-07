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
  // Two-person practice: Jackie tells a story, Jorgito asks the player to retell.
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
    "You are Jorgito. Jackie just told the player a little story about her day. " +
    "Ask '¿Qué hizo Jackie hoy?' and have the player RETELL it in past tense, " +
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

export const A2_FIESTA_DAPHNE: Lesson = {
  id: "fiesta-daphne",
  level: "A2",
  title: "El cumpleaños de Daphne — telling a story about the past",
  canDo:
    "understand and tell a simple past-tense story about Daphne's first " +
    "birthday party — grounding events in time, linking them with " +
    "connectors, and closing it off",
  vocab: [
    { es: "la fiesta", en: "the party" },
    { es: "el parque", en: "the park" },
    { es: "el cumpleaños", en: "the birthday" },
    { es: "cumplió un año", en: "she turned one year old" },
    { es: "llegamos", en: "we arrived" },
    { es: "decoramos", en: "we decorated" },
    { es: "colgué los globos", en: "I hung the balloons" },
    { es: "trajimos", en: "we brought" },
    { es: "preparé", en: "I prepared" },
    { es: "cantamos", en: "we sang" },
    { es: "partimos el pastel", en: "we cut the cake" },
    { es: "jugamos", en: "we played" },
    { es: "se rió", en: "she laughed" },
    { es: "hacía sol", en: "it was sunny (weather, past)" },
    { es: "primero", en: "first" },
    { es: "luego", en: "then / next" },
    { es: "después", en: "after that" },
    { es: "y", en: "and" },
    { es: "pero", en: "but" },
    { es: "porque", en: "because" },
    { es: "entonces", en: "so / then" },
    { es: "de repente", en: "suddenly" },
    { es: "para mi sorpresa", en: "to my surprise" },
    { es: "al final", en: "in the end" },
    { es: "finalmente", en: "finally" },
  ],
  // Two-person practice: Jorge tells the story of the party morning, Jorgito
  // asks the player to retell it.
  storyTheme:
    "You are Jorge, the abuelo, telling the player about the morning the " +
    "family got the park ready for Daphne's first birthday party in " +
    "Phoenix — a sunny December day. Shape it like a mini-narrative: OPEN by " +
    "grounding it in time ('Esa mañana…', 'Muy temprano…'); tell 2–3 " +
    "DISTINCTIVE, easy-to-picture actions (e.g. 'Llegamos al parque.', " +
    "'Colgamos los globos.', 'Decoramos la mesa.') linked with connectors " +
    "(y, luego, entonces, pero); add ONE warm or funny beat with 'de " +
    "repente' or 'para mi sorpresa' (e.g. 'De repente, empezó a hacer " +
    "viento y se cayeron los globos.'); and CLOSE with 'al final' or " +
    "'finalmente' (e.g. 'Al final, todo quedó perfecto para Daphne.'). Keep " +
    "every sentence short and A2-simple; the first time you use a less " +
    "common connector, gloss it in English (e.g. 'sin embargo (however)'). " +
    "After your story ask '¿Entendiste?' — the player only needs to " +
    "confirm. Vary the story each time.",
  retellTheme:
    "You are Jorgito, Daphne's tío. Jorge (el abuelo) just told the player " +
    "about getting the park ready for Daphne's party. Ask '¿Qué hizo el " +
    "abuelo Jorge esa mañana?' and have the player RETELL it in past " +
    "tense, IN ORDER. Nudge them to use time markers and connectors as " +
    "they go — prompt with '¿Y luego?', '¿Y entonces?', '¿Qué pasó de " +
    "repente?'. If they're stuck, give the first word or a small hint. " +
    "Praise correct past-tense verbs and any connector they use (primero, " +
    "luego, después, entonces, al final). Wrap up once they've retold the " +
    "main events.",

  reviewTheme:
    "You are the paletero (ice cream/paleta cart vendor) at the park. As a " +
    "friendly review while the player buys a treat, ask them to tell YOU a " +
    "little story about the party day: '¿Qué pasó hoy en la fiesta? " +
    "¡Cuéntame!'. Encourage a beginning, middle and end — a time marker to " +
    "open (esa mañana, muy temprano), 2–3 past-tense actions linked with " +
    "connectors (y, luego, entonces, pero), a fun beat if they like (de " +
    "repente), and a closing (al final, finalmente). Make sure they can " +
    "string the events together before naming a price for the paleta.",
};

/** All lessons, keyed by id. */
export const ALL_LESSONS: Record<string, Lesson> = {
  [A2_PAST_TENSE.id]: A2_PAST_TENSE,
  [A2_FIESTA_DAPHNE.id]: A2_FIESTA_DAPHNE,
};

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS[id];
}
