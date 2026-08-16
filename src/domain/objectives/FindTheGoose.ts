/**
 * Find-the-goose objective — Marichuy, the final conversation in Daphne's
 * birthday mystery. The player guesses where the Silly Goose is hiding;
 * Marichuy knows the real answer (today's day-seeded location — see
 * gooseMystery.ts) but doesn't reveal it directly, she just judges the
 * guess.
 *
 * Role: "store" — reused deliberately: player.ts's STORE branch just pays
 * money from the conversation's grade, with no crop/inventory side effect
 * to trip over, so it's a safe fit for "the review/checkpoint conversation
 * of the day" even though nothing is literally being sold. A wrong guess
 * still completes the objective for today (so "try again tomorrow" falls
 * straight out of the existing daily reset) — money is paid from
 * conversation quality either way; correct/incorrect only changes which
 * toast the player sees (GameController.afterConversation), not the money.
 *
 * Gated on the three REQUIRED clues (Papachulo's + the two required
 * GooseClue instances) — by construction (gooseMystery.test.ts) those three
 * facts alone always uniquely identify today's location, so by the time
 * Marichuy is reachable the mystery is always solvable.
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { Lesson } from "./lesson.js";
import { gooseLocationForDay } from "./gooseMystery.js";

export class FindTheGoose implements Objective {
  readonly id = "find-the-goose";
  readonly npcId = "maria-abuela";
  readonly role = "store" as const;
  readonly dependsOn = ["goose-stakes", "goose-clue-jorgito-tio", "goose-clue-jackie-tia"];

  constructor(private readonly lesson: Lesson) {}

  buildTheme(ctx: ObjectiveContext): string {
    const loc = gooseLocationForDay(ctx.today);
    return (
      "You are Marichuy, Daphne's grandmother, at the playground. The " +
      `Silly Goose is actually hiding at "${loc.name}" today — do not ` +
      "reveal this directly. Ask the player, in simple A2 Spanish, where " +
      "they think the goose is hiding — encourage them to answer with " +
      "'Creo que está en...'. Compare their answer to the real answer " +
      `("${loc.name}"), being forgiving of minor wording as long as they ` +
      "clearly named the right place. If they're right, celebrate warmly " +
      "(e.g. '¡Sí, correcto! ¡Encontraste las llaves!') and naturally " +
      "include the Spanish word 'correcto' somewhere in your reply. If " +
      "they're wrong, be kind (e.g. 'No, no es correcto, pero puedes " +
      "intentarlo mañana.') and naturally include the Spanish word " +
      "'incorrecto' somewhere in your reply — don't reveal the real " +
      `location either way. Keep it at the ${this.lesson.level} level.`
    );
  }

  extractOutputs(npcLines: string[]): Record<string, string> {
    const last = (npcLines.at(-1) ?? "").toLowerCase();
    // "incorrecto" contains "correcto" as a substring — check it first.
    const result = last.includes("incorrecto")
      ? "incorrecto"
      : last.includes("correcto")
        ? "correcto"
        : "unknown";
    return { result };
  }
}
