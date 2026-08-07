/**
 * Where-are-things objective — Maria, the bonus daily conversation.
 *
 * Independent of the week's story/retell chain (no `dependsOn`) and doesn't
 * gate "day complete" (`bonus = true`) — it's extra practice, not a required
 * errand. Deliberately a DIFFERENT grammar point from the week's `Lesson`
 * (prepositions of place, not past tense), so its `canDo`/`vocab` are fixed
 * here rather than sourced from the lesson.
 *
 * Role: "ribbons". Completing it grows the player's ribbons — the finishing
 * touch that rounds out the week's shared bouquet alongside flowers and
 * foliage.
 *
 * `referencePanel` surfaces today's room layout on screen (via
 * `scenePanelItems`) so the player has something to look at when answering —
 * Maria's questions describe a room only she can "see" otherwise.
 */

import type { Objective, ObjectiveContext, ReferencePanelItem } from "../objective.js";
import type { LessonVocab } from "./lesson.js";
import { sceneForDay, describeScene, scenePanelItems } from "./scene.js";

const VOCAB: LessonVocab[] = [
  { es: "¿Dónde está…?", en: "Where is…?" },
  { es: "está…", en: "it's…" },
  { es: "encima de", en: "on top of" },
  { es: "debajo de", en: "under" },
  { es: "delante de", en: "in front of" },
  { es: "detrás de", en: "behind" },
  { es: "a la izquierda de", en: "to the left of" },
  { es: "a la derecha de", en: "to the right of" },
  { es: "la puerta", en: "the door" },
  { es: "la mesa", en: "the table" },
  { es: "el florero", en: "the vase" },
];

export class WhereAreThings implements Objective {
  readonly id = "where-are-things";
  readonly npcId = "maria";
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
      "You are Maria, standing in a room with a door, a table, and a vase. " +
      `Today the room is arranged like this: ${facts} Ask the player, one at ` +
      "a time and in any order, '¿Dónde está el/la ___?' for each of the " +
      "three items placed today. If they answer correctly, praise them and " +
      "move to the next item; if they're wrong, gently correct them with the " +
      "right phrase (e.g. 'No, está detrás de la puerta') and have them " +
      "repeat it. Use the target vocabulary (encima de, debajo de, delante " +
      "de, detrás de, a la izquierda de, a la derecha de) liberally in your " +
      "own descriptions too, not just corrections. Wrap up once all three " +
      "items have been asked about."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }

  /** Today's room layout — the player looks at this to answer Maria's questions. */
  referencePanel(ctx: ObjectiveContext): ReferencePanelItem[] {
    return scenePanelItems(sceneForDay(ctx.today));
  }
}
