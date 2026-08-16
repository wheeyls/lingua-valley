/**
 * Goose-clue objective — a family member sharing one fact about today's
 * hiding spot in Daphne's birthday mystery. Reusable across several family
 * members (same shape as PartyPlans.ts's reuse across Pueblo's tías): each
 * instance is fixed to one property (does the LLM ever mention Play Area,
 * Food, or Animals) and one NPC, but the true/false VALUE for that property
 * varies day to day with the hidden location (see gooseMystery.ts).
 *
 * Two instances are required (playArea, food) — together with Papachulo's
 * "wet" clue (GooseStakes) they always uniquely identify today's location,
 * see gooseMystery.test.ts. A third (animals) is a bonus 4th confirming
 * clue.
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { DailyRole } from "../dailyLoop.js";
import { gooseLocationForDay, type GooseLocation } from "./gooseMystery.js";

type ClueProperty = "playArea" | "food" | "animals";

const FACTS: Record<ClueProperty, { yes: string; no: string }> = {
  playArea: {
    yes: "Sí sé algo: es un lugar para jugar.",
    no: "Sí sé algo: no es un lugar para jugar.",
  },
  food: {
    yes: "Sí sé algo: hay comida ahí.",
    no: "Sí sé algo: no hay comida ahí.",
  },
  animals: {
    yes: "Sí sé algo: hay animales cerca.",
    no: "Sí sé algo: no hay animales cerca.",
  },
};

export class GooseClue implements Objective {
  readonly id: string;
  readonly dependsOn: string[] = [];

  constructor(
    readonly npcId: string,
    readonly role: DailyRole,
    private readonly property: ClueProperty,
    readonly bonus?: boolean,
  ) {
    this.id = `goose-clue-${npcId}`;
  }

  buildTheme(ctx: ObjectiveContext): string {
    const loc: GooseLocation = gooseLocationForDay(ctx.today);
    const fact = loc[this.property] ? FACTS[this.property].yes : FACTS[this.property].no;
    return (
      "You are a member of Daphne's family at her birthday party, keeping " +
      "it simple and friendly — you're not a big personality, just someone " +
      "helping the player find the Silly Goose, who ran off with the car " +
      `keys. You know one clue about where he's hiding: "${fact}" Share ` +
      "it in simple A2 Spanish, then have the player repeat it back to you " +
      "so they remember it. Keep every sentence short and A2-simple."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
