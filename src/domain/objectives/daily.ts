/**
 * Build the daily objective graph for a lesson.
 *
 * Marisol tells a story + hands over the seed (role "seeds", plants the row);
 * Pablo retells it (role "water", waters the field) and DEPENDS on Marisol's
 * story. Store review stays registered but is hidden in the UI. Pure factory.
 */

import { ObjectiveGraph } from "../objective.js";
import type { Lesson } from "./lesson.js";
import { StoryTelling } from "./StoryTelling.js";
import { StoryRetell } from "./StoryRetell.js";
import { StoreReview } from "./StoreReview.js";

/** Whether a lesson's water practice is the two-person story/retell flow. */
export function isPairedPractice(lesson: Lesson): boolean {
  return !!(lesson.storyTheme && lesson.retellTheme);
}

export function buildDailyGraph(lesson: Lesson): ObjectiveGraph {
  return new ObjectiveGraph()
    .register(new StoryTelling(lesson))
    .register(new StoryRetell(lesson))
    .register(new StoreReview(lesson));
}
