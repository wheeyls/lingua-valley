/**
 * Build the daily objective graph for a lesson — the farming-loop conversations
 * (seeds → water → store). Pure factory, no framework.
 *
 * The WATER practice is either a single conversation OR a two-person flow:
 *   - if the lesson defines a story/retell pair, register both (story → retell,
 *     where retell depends on story). Completing both waters the field.
 *   - otherwise register a single WaterPractice conversation.
 */

import { ObjectiveGraph } from "../objective.js";
import type { Lesson } from "./lesson.js";
import { SeedsIntro } from "./SeedsIntro.js";
import { StoryTelling } from "./StoryTelling.js";
import { StoryRetell } from "./StoryRetell.js";
import { StoreReview } from "./StoreReview.js";

/** Whether a lesson's water practice is the two-person story/retell flow. */
export function isPairedPractice(lesson: Lesson): boolean {
  return !!(lesson.storyTheme && lesson.retellTheme);
}

export function buildDailyGraph(lesson: Lesson): ObjectiveGraph {
  const graph = new ObjectiveGraph().register(new SeedsIntro(lesson));

  // Water practice: a two-person story/retell pair.
  graph.register(new StoryTelling(lesson)).register(new StoryRetell(lesson));

  return graph.register(new StoreReview(lesson));
}
