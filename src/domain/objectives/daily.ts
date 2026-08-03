/**
 * Build the daily objective graph for a lesson.
 *
 * Jackie tells a story + hands over the seed (role "seeds", plants the row);
 * Jorgito retells it (role "water", waters the field) and DEPENDS on Jackie's
 * story. Store review stays registered but is hidden in the UI. Pure factory.
 */

import { ObjectiveGraph } from "../objective.js";
import type { Lesson } from "./lesson.js";
import { StoryTelling } from "./StoryTelling.js";
import { StoryRetell } from "./StoryRetell.js";
import { StoreReview } from "./StoreReview.js";
import { FoliageGathering } from "./FoliageGathering.js";
import { WhereAreThings } from "./WhereAreThings.js";

export function buildDailyGraph(lesson: Lesson): ObjectiveGraph {
  return new ObjectiveGraph()
    .register(new StoryTelling(lesson))
    .register(new StoryRetell(lesson))
    // Foliage: Arlene's independent, bonus daily practice (near-future plans).
    .register(new FoliageGathering())
    // Ribbons: Maria's independent, bonus daily practice (prepositions of place).
    .register(new WhereAreThings())
    .register(new StoreReview(lesson));
}
