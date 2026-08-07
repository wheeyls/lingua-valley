/**
 * Where-are-things-at-the-party objective — Maria (la abuela), the bonus
 * daily conversation at Daphne's first birthday party. Same shape as
 * WhereAreThings.ts (Maria's room in Pueblo del Ayer): independent of the
 * week's story/retell chain, doesn't gate "day complete", a different
 * grammar point (prepositions of place) than the week's `Lesson`. Just
 * re-themed: the bedroom → the picnic table at the park.
 *
 * Role: "ribbons". Completing it grows the player's ribbons — the finishing
 * touch that rounds out the week's shared bouquet alongside flowers and
 * foliage.
 *
 * `referenceScene` exposes today's raw scene so the UI can draw it as a
 * picture the player peeks at (press-and-hold) while answering — no Spanish
 * text, so answering still requires producing the vocabulary themselves.
 */

import type { Objective, ObjectiveContext, ReferenceScene } from "../objective.js";
import type { LessonVocab } from "./lesson.js";
import { sceneForDay, describeScene } from "./partyScene.js";

const VOCAB: LessonVocab[] = [
  { es: "¿Dónde está…?", en: "Where is…?" },
  { es: "está…", en: "it's…" },
  { es: "encima de", en: "on top of" },
  { es: "debajo de", en: "under" },
  { es: "delante de", en: "in front of" },
  { es: "detrás de", en: "behind" },
  { es: "a la izquierda de", en: "to the left of" },
  { es: "a la derecha de", en: "to the right of" },
  { es: "la hielera", en: "the cooler" },
  { es: "la mesa", en: "the table" },
  { es: "el árbol", en: "the tree" },
];

export class WhereAreThingsParty implements Objective {
  readonly id = "where-are-things-party";
  readonly npcId = "maria-abuela";
  readonly role = "ribbons" as const;
  readonly dependsOn: string[] = [];
  readonly bonus = true;
  readonly canDo =
    "understand and use prepositions of place (encima de, debajo de, " +
    "delante de, detrás de, a la izquierda/derecha de) to say where things are";
  readonly vocab = VOCAB;

  buildTheme(ctx: ObjectiveContext): string {
    const facts = describeScene(sceneForDay(ctx.today));
    return (
      "You are Maria, la abuela, standing by the picnic table at Daphne's " +
      "first birthday party in the park — there's a cooler, the picnic " +
      `table, and a shade tree nearby. Today things are arranged like this: ` +
      `${facts} Ask the player, one at a time and in any order, '¿Dónde ` +
      "está el/la ___?' for each of the three party items placed today. If " +
      "they answer correctly, praise them and move to the next item; if " +
      "they're wrong, gently correct them with the right phrase (e.g. 'No, " +
      "está detrás de la hielera') and have them repeat it. Use the target " +
      "vocabulary (encima de, debajo de, delante de, detrás de, a la " +
      "izquierda de, a la derecha de) liberally in your own descriptions " +
      "too, not just corrections. Wrap up once all three items have been " +
      "asked about."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }

  /** Today's raw scene — the UI draws this as a picture the player peeks at. */
  referenceScene(ctx: ObjectiveContext): ReferenceScene {
    return { kind: "party", scene: sceneForDay(ctx.today) };
  }
}
