/**
 * Goose-stakes objective — Papachulo, the greeter for Daphne's birthday
 * mystery. Sets up the story (the Silly Goose ran off with the car keys)
 * and delivers the first clue: whether today's hiding spot is wet or dry.
 *
 * Role: "seeds" — the required opener of the daily loop, same slot the old
 * story-telling objective filled.
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { Lesson } from "./lesson.js";
import { gooseLocationForDay } from "./gooseMystery.js";

export class GooseStakes implements Objective {
  readonly id = "goose-stakes";
  readonly npcId = "jorge-abuelo";
  readonly role = "seeds" as const;
  readonly dependsOn: string[] = [];

  constructor(private readonly lesson: Lesson) {}

  buildTheme(ctx: ObjectiveContext): string {
    const loc = gooseLocationForDay(ctx.today);
    const fact = loc.wet
      ? "Sí sé una cosa: está mojado — cerca del agua."
      : "Sí sé una cosa: está seco — nada de agua por ahí.";
    return (
      "You are Papachulo, Daphne's grandfather, greeting the player at the " +
      "ramada. Explain what happened, in simple A2 Spanish: the Silly " +
      "Goose stole the car keys and is hiding somewhere in the park — the " +
      "cake and presents are stuck in the car until he's found. You only " +
      `know one clue: "${fact}" Share it, then have the player repeat it ` +
      "back to you in Spanish so they remember it. Keep every sentence " +
      `short and A2-simple. Keep it at the ${this.lesson.level} level.`
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
