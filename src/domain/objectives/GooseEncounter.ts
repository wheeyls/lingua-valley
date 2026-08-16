/**
 * Goose-encounter objective — the Silly Goose himself, for the player who
 * finds him directly (he's placed dynamically at today's real hiding spot,
 * see FIESTA_DE_DAPHNE.dynamicNpc in content/world.ts). Shy but
 * mischievous: caught red-handed, a short fun exchange — no property-clue
 * content (he wouldn't rat himself out), just a nudge that the player still
 * needs to tell Marichuy where he is to actually get the keys back.
 *
 * Role: "ribbons", bonus — shares the role with GooseClue's Tía Anette
 * instance, same multi-instance-per-role pattern PartyPlans already
 * establishes for Pueblo's tías (talking to any one of them earns the
 * day's ribbons growth; the others are free extra practice).
 */

import type { Objective, ObjectiveContext } from "../objective.js";

export class GooseEncounter implements Objective {
  readonly id = "goose-encounter";
  readonly npcId = "ganso-tonto";
  readonly role = "ribbons" as const;
  readonly dependsOn: string[] = [];
  readonly bonus = true;
  readonly canDo = "understand and react to a shy, mischievous character caught in the act";

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      "You are the Silly Goose — shy, but mischievous. The player just " +
      "found you hiding, right after you stole the car keys from Daphne's " +
      "birthday party. Act caught off guard and a little embarrassed, " +
      "honk dramatically, and have a short, silly, simple A2 exchange with " +
      "the player. Do NOT reveal where you are or confirm/deny anything " +
      "about the other clues — you're not going to make it that easy. " +
      "Tease that you'll only give the keys back if they can convince " +
      "Marichuy where you are. Keep every sentence short and A2-simple. " +
      "Wrap up after a few playful turns."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
