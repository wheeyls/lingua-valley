/**
 * Build the daily objective graph for Daphne's birthday party campaign —
 * the Silly Goose mystery. Papachulo greets the player and delivers the
 * first clue (role "seeds"); Jorgito and Tía Jackie each deliver another
 * required clue (roles "water"/"foliage" — together with Papachulo's,
 * always enough to uniquely identify today's hiding spot, see
 * gooseMystery.test.ts); Tía Anet offers a bonus 4th confirming clue
 * (role "ribbons"); Marichuy lets the player guess (role "store", gated on
 * the three required clues). The Silly Goose himself (dynamically placed
 * at today's real hiding spot — see FIESTA_DE_DAPHNE.dynamicNpc) offers an
 * optional bonus encounter, sharing the "ribbons" role with Tía Anet.
 * Pure factory.
 */

import { ObjectiveGraph } from "../objective.js";
import type { Lesson } from "./lesson.js";
import { GooseStakes } from "./GooseStakes.js";
import { GooseClue } from "./GooseClue.js";
import { FindTheGoose } from "./FindTheGoose.js";
import { GooseEncounter } from "./GooseEncounter.js";

export function buildGooseMysteryGraph(lesson: Lesson): ObjectiveGraph {
  return new ObjectiveGraph()
    .register(new GooseStakes(lesson))
    .register(new GooseClue("jorgito-tio", "water", "playArea"))
    .register(new GooseClue("jackie-tia", "foliage", "food"))
    .register(new GooseClue("anette-tia", "ribbons", "animals", true))
    .register(new FindTheGoose(lesson))
    .register(new GooseEncounter());
}
