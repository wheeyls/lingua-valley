/**
 * Build the daily objective graph for Daphne's birthday party campaign.
 *
 * Same shape as daily.ts's buildDailyGraph (Pueblo del Ayer), just wired to
 * this campaign's NPCs: Jorge tells the story + hands over the seed (role
 * "seeds"); Jorgito retells it (role "water", DEPENDS on Jorge's story).
 * Three tías (Jackie, Arlene, Annette) each offer the same independent bonus
 * practice (role "foliage"). Maria (la abuela) offers the picnic-table
 * picture-guessing bonus (role "ribbons"). The paletero's review stays
 * registered but is hidden in the UI, same as the shopkeeper in Pueblo del
 * Ayer. Pure factory.
 */

import { ObjectiveGraph } from "../objective.js";
import type { Lesson } from "./lesson.js";
import { StoryTelling } from "./StoryTelling.js";
import { StoryRetell } from "./StoryRetell.js";
import { StoreReview } from "./StoreReview.js";
import { PartyPlans } from "./PartyPlans.js";
import { WhereAreThingsParty } from "./WhereAreThingsParty.js";

export function buildDaphnePartyGraph(lesson: Lesson): ObjectiveGraph {
  return new ObjectiveGraph()
    .register(new StoryTelling(lesson, "jorge-abuelo"))
    .register(new StoryRetell(lesson, "jorgito-tio"))
    .register(new PartyPlans("jackie-tia"))
    .register(new PartyPlans("arlene-tia"))
    .register(new PartyPlans("annette-tia"))
    .register(new WhereAreThingsParty())
    .register(new StoreReview(lesson, "paletero"));
}
