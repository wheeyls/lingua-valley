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
import { gooseLocationForDay, allLocationNames } from "./gooseMystery.js";

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
    const places = allLocationNames().join(", ");
    return (
      "You are Papachulo, Daphne's grandfather, greeting the player at the " +
      "ramada. Follow this exact structure, one beat per turn — this keeps " +
      "the conversation short and predictable for a beginner, don't add " +
      "extra turns or small talk beyond it:\n" +
      "1. Briefly explain what happened, in simple A2 Spanish: the Silly " +
      "Goose stole the car keys and is hiding somewhere in the park. Tell " +
      `them he could be in one of these five spots: ${places} (say these ` +
      "exact Spanish place names out loud — the player needs to know them " +
      "to guess later, and they're also labeled on the park map). Then ask " +
      "the player what they already know so far (e.g. '¿Qué sabes hasta " +
      "ahora?') — they've probably just arrived and don't know anything " +
      "yet, but ask anyway.\n" +
      `2. After they answer, share your one clue: "${fact}" Have them ` +
      "repeat it back to you in Spanish so they remember it.\n" +
      "3. After they repeat it, wish them luck (e.g. '¡Buena suerte!') and " +
      "end the conversation there — don't keep chatting past this point.\n" +
      `Keep every sentence short and A2-simple. Keep it at the ${this.lesson.level} level.`
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
