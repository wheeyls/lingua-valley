/**
 * Lesson content — one Lesson per crop cycle / area.
 *
 * A Lesson is the learning material the three farming-loop conversations draw
 * on (seeds introduces it, water drills it daily, store reviews it). Adding a
 * new area is just adding a Lesson here.
 */

import type { Lesson } from "../domain/objectives/lesson.js";

export const A1_GREETINGS: Lesson = {
  id: "greetings",
  level: "A1",
  title: "Saludos — greetings & introductions",
  canDo: "greet someone, say your name, and say goodbye",
  vocab: [
    { es: "hola", en: "hello" },
    { es: "buenos días", en: "good morning" },
    { es: "¿cómo estás?", en: "how are you?" },
    { es: "me llamo…", en: "my name is…" },
    { es: "mucho gusto", en: "nice to meet you" },
    { es: "adiós", en: "goodbye" },
    { es: "hasta luego", en: "see you later" },
  ],
  introTheme:
    "Explain that this week is all about meeting neighbours: saying hello, " +
    "giving your name, asking how someone is, and saying goodbye politely.",
  practiceTheme:
    "Greet the player, ask how they are and what their name is, and respond " +
    "naturally so they get repeated practice with simple greetings.",
  reviewTheme:
    "Greet the player as a regular customer, ask their name and how they are, " +
    "and make sure they can hold a short, polite greeting exchange.",
};

/** All lessons, keyed by id. */
export const ALL_LESSONS: Record<string, Lesson> = {
  [A1_GREETINGS.id]: A1_GREETINGS,
};

/** The lesson for the current (only) area. */
export const CURRENT_LESSON: Lesson = A1_GREETINGS;

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS[id];
}
