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
import { gooseLocationForDay, allLocationPairs } from "./gooseMystery.js";

export class FindTheGoose implements Objective {
  readonly id = "find-the-goose";
  readonly npcId = "maria-abuela";
  readonly role = "store" as const;
  readonly dependsOn = ["goose-stakes", "goose-clue-jorgito-tio", "goose-clue-jackie-tia"];

  constructor(private readonly lesson: Lesson) {}

  buildTheme(ctx: ObjectiveContext): string {
    const loc = gooseLocationForDay(ctx.today);
    const places = allLocationPairs()
      .map((p) => `the ${p.en} (${p.es})`)
      .join(", ");
    return (
      "You are Marichuy, Daphne's grandmother, at the playground. The " +
      `Silly Goose is actually hiding at "${loc.name}" today — do not ` +
      "reveal this directly. Follow this exact structure, one beat per " +
      "turn — this keeps the conversation short and predictable for a " +
      "beginner, don't add extra turns, follow-up questions, or small " +
      "talk beyond it:\n" +
      "1. Greet the player and ask, in simple A2 Spanish, what they " +
      "already know so far (e.g. '¿Qué sabes hasta ahora?') and where " +
      "they think the goose is hiding — encourage them to answer with " +
      `'Creo que está en...'. As a reminder, mention the five possible ` +
      `spots, English name then Spanish: ${places} (the map labels each ` +
      "spot in English, but they must answer with the Spanish name).\n" +
      `2. Compare their answer to the real answer ("${loc.name}"), being ` +
      "forgiving of minor wording as long as they clearly named the right " +
      "place. In that SAME reply, judge it and wrap up — don't ask another " +
      "question. If they're right, celebrate warmly (e.g. '¡Sí, correcto! " +
      "¡Encontraste las llaves!') and naturally include the Spanish word " +
      "'correcto' somewhere in your reply. If they're wrong, be kind (e.g. " +
      "'No, no es correcto, pero puedes intentarlo mañana.') and naturally " +
      "include the Spanish word 'incorrecto' somewhere in your reply — " +
      "don't reveal the real location either way.\n" +
      `Keep it at the ${this.lesson.level} level.`
    );
  }

  extractOutputs(npcLines: string[]): Record<string, string> {
    // Scan from the most recent line backwards — the verdict usually lands
    // on the judging turn, not necessarily the very last line (Marichuy may
    // add a short farewell after it, which wouldn't otherwise contain
    // "correcto"/"incorrecto" and would silently drop the result to
    // "unknown" if we only checked npcLines.at(-1)).
    for (let i = npcLines.length - 1; i >= 0; i--) {
      const line = npcLines[i].toLowerCase();
      // "incorrecto" contains "correcto" as a substring — check it first.
      if (line.includes("incorrecto")) return { result: "incorrecto" };
      if (line.includes("correcto")) return { result: "correcto" };
    }
    return { result: "unknown" };
  }
}
