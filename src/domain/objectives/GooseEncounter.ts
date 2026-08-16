/**
 * Goose-encounter objective — the Silly Goose himself, met only AFTER the
 * player has already guessed correctly with Marichuy (he's placed
 * dynamically, and only then — see FIESTA_DE_DAPHNE.dynamicNpc in
 * content/world.ts, gated on find-the-goose's outputs). This is the payoff
 * for solving the mystery, not a shortcut around it: a short, silly,
 * shy-but-mischievous exchange, caught red-handed with the keys.
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
      "correctly guessed where you were hiding and found you, caught " +
      "red-handed with the car keys after stealing them from Daphne's " +
      "birthday party. Act sheepish and a little embarrassed, honk " +
      "dramatically, and have a short, silly, simple A2 exchange with the " +
      "player — celebrate that they found you, and hand over the keys " +
      "with some playful reluctance. Keep every sentence short and " +
      "A2-simple. Wrap up after a few playful turns."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
