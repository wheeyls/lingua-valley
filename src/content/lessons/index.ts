/**
 * Lesson registry: loads the .lesson files (raw, via Vite) and parses them into
 * the Lesson model. Also maps lesson levels onto CEFR levels used by the game.
 *
 * Vite inlines `?raw` imports at build time, so this works in the browser with
 * no fetch. In Node/test, the parser is exercised directly (see __tests__).
 */

import { parseLesson } from "./parser";
import type { Lesson, LessonLevel } from "./types";
import type { CefrLevel } from "../../domain/cefr";

// Eagerly import every .lesson file as raw text. Vite resolves the glob.
const rawLessons = import.meta.glob("./data/*.lesson", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function filenameOf(path: string): string {
  return path.split("/").pop() ?? path;
}

/** All successfully-parsed lessons, keyed by slug. */
export const LESSONS: Record<string, Lesson> = (() => {
  const out: Record<string, Lesson> = {};
  for (const [path, content] of Object.entries(rawLessons)) {
    const result = parseLesson(content, filenameOf(path));
    if (result.success && result.data) {
      out[result.data.slug] = result.data;
    } else if (typeof console !== "undefined") {
      console.warn(`Failed to parse lesson ${path}`, result.errors);
    }
  }
  return out;
})();

export function lessonBySlug(slug: string): Lesson | undefined {
  return LESSONS[slug];
}

/** Map the lesson authoring levels onto the game's CEFR levels. */
export function lessonLevelToCefr(level: LessonLevel): CefrLevel {
  switch (level) {
    case "starter":
      return "A1";
    case "elementary":
      return "A2";
    case "beginner":
      return "B1";
    case "conversational":
      return "B2";
    case "confident":
      return "C1";
  }
}
