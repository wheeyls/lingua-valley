/**
 * Party-plans objective — one of Daphne's tías, bonus daily conversation at
 * her first birthday party. Same shape as FoliageGathering.ts (Arlene in
 * Pueblo del Ayer): independent of the week's story/retell chain, doesn't
 * gate "day complete", a different grammar point (near-future "ir a +
 * infinitivo" plans) than the week's `Lesson`.
 *
 * Unlike FoliageGathering, this class takes its `npcId` as a constructor
 * param — several tías (Jackie, Arlene, Annette) offer the exact same bonus
 * practice, so one instance is registered per tía rather than duplicating
 * the class per person. Each gets its own objective id (`party-plans-<npc>`)
 * so they're independently completable, but all share the "foliage" role —
 * talking to any one of them earns the day's growth; the others are free
 * extra practice.
 *
 * Role: "foliage". Completing it grows the player's foliage garden — the
 * greenery that rounds out the week's shared bouquet alongside the flowers.
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { LessonVocab } from "./lesson.js";

const VOCAB: LessonVocab[] = [
  { es: "ir a + infinitivo", en: "going to + verb" },
  { es: "voy a…", en: "I'm going to…" },
  { es: "vamos a…", en: "we're going to…" },
  { es: "va a…", en: "he/she is going to…" },
  { es: "van a…", en: "they're going to…" },
  { es: "ahora", en: "now" },
  { es: "en un momento", en: "in a moment" },
  { es: "después del pastel", en: "after the cake" },
  { es: "más tarde", en: "later" },
  { es: "primero", en: "first" },
  { es: "luego", en: "then / next" },
  { es: "por último", en: "lastly" },
];

export class PartyPlans implements Objective {
  readonly id: string;
  readonly role = "foliage" as const;
  readonly dependsOn: string[] = [];
  readonly bonus = true;
  readonly canDo =
    "talk about what's about to happen at the party using ir a + infinitivo " +
    "(vamos a…) — cake, piñata, presents, games";
  readonly vocab = VOCAB;

  constructor(readonly npcId: string) {
    this.id = `party-plans-${npcId}`;
  }

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      "You are one of Daphne's tías at her first birthday party in the " +
      "park. Chat with the player about what's ABOUT TO HAPPEN next at the " +
      "party — cake, piñata, presents, games — using 'ir a + infinitivo' " +
      "(vamos a…, va a…, van a…). Ask '¿Qué vamos a hacer ahora?' or '¿Qué " +
      "va a pasar después del pastel?' and encourage 2-3 simple plans " +
      "linked with 'primero', 'luego', 'después'. Keep it light and short — " +
      "this is bonus practice, not the main story. Thank them for " +
      "celebrating with the family before wrapping up."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
