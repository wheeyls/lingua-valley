/**
 * Foliage-gathering objective — Arlene, the bonus daily conversation.
 *
 * Independent of the week's story/retell chain (no `dependsOn`) and doesn't
 * gate "day complete" (`bonus = true`) — it's extra practice, not a required
 * errand. Deliberately a DIFFERENT grammar point from the week's `Lesson`
 * (near-future "ir a + infinitivo" plans, not past tense), so its `canDo`/
 * `vocab` are fixed here rather than sourced from the lesson.
 *
 * Role: "foliage". Completing it grows the player's foliage garden — the
 * greenery that rounds out the week's shared bouquet alongside the flowers.
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { LessonVocab } from "./lesson.js";

const VOCAB: LessonVocab[] = [
  { es: "ir a + infinitivo", en: "going to + verb" },
  { es: "voy a…", en: "I'm going to…" },
  { es: "vas a…", en: "you're going to…" },
  { es: "va a…", en: "he/she is going to…" },
  { es: "vamos a…", en: "we're going to…" },
  { es: "hoy", en: "today" },
  { es: "mañana", en: "tomorrow" },
  { es: "esta tarde", en: "this afternoon" },
  { es: "esta noche", en: "tonight" },
  { es: "este fin de semana", en: "this weekend" },
  { es: "la próxima semana", en: "next week" },
  { es: "primero", en: "first" },
  { es: "luego", en: "then / next" },
  { es: "después", en: "after that" },
];

export class FoliageGathering implements Objective {
  readonly id = "foliage-gathering";
  readonly npcId = "arlene";
  readonly role = "foliage" as const;
  readonly dependsOn: string[] = [];
  readonly bonus = true;
  readonly canDo =
    "talk about your plans using ir a + infinitivo (voy a…) — what you're " +
    "going to do today, this week, or the weekend";
  readonly vocab = VOCAB;

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      "You are Arlene, a cheerful gardener gathering greenery and filler for " +
      "the village's shared weekly bouquet. Chat with the player about their " +
      "PLANS — what they're going to do today, this week, or this weekend — " +
      "using 'ir a + infinitivo' (voy a…, vas a…, vamos a…). Ask '¿Qué vas a " +
      "hacer hoy?' or '¿Qué vas a hacer esta semana?' and encourage 2-3 simple " +
      "plans linked with 'primero', 'luego', 'después'. Keep it light and " +
      "short — this is bonus practice, not the main story. Thank them for " +
      "helping gather greenery for the bouquet before wrapping up."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
