/**
 * Build the daily objective graph for a lesson — the three farming-loop
 * conversations (seeds → water → store). Pure factory, no framework.
 */

import { ObjectiveGraph } from "../objective.js";
import type { Lesson } from "./lesson.js";
import { SeedsIntro } from "./SeedsIntro.js";
import { WaterPractice } from "./WaterPractice.js";
import { StoreReview } from "./StoreReview.js";

export function buildDailyGraph(lesson: Lesson): ObjectiveGraph {
  return new ObjectiveGraph()
    .register(new SeedsIntro(lesson))
    .register(new WaterPractice(lesson))
    .register(new StoreReview(lesson));
}
