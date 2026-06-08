/**
 * Build the daily objective graph — the complete set of objectives for one day.
 * Pure factory, no framework.
 */

import { ObjectiveGraph } from "../objective.js";
import { RosaGreeting } from "./RosaGreeting.js";
import { MarisolStory } from "./MarisolStory.js";
import { PabloRetelling } from "./PabloRetelling.js";

export function buildDailyGraph(): ObjectiveGraph {
  return new ObjectiveGraph()
    .register(new RosaGreeting())
    .register(new MarisolStory())
    .register(new PabloRetelling());
}
