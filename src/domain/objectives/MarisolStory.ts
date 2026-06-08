/**
 * Marisol story objective — she tells you 2-3 discrete things she did today
 * in simple past tense. Produces `storyText` for the Pablo retelling objective.
 * No dependencies.
 */

import type { Objective, ObjectiveContext } from "../objective.js";

export class MarisolStory implements Objective {
  readonly id = "marisol-story";
  readonly npcId = "marisol";
  readonly dependsOn: string[] = [];
  readonly reward = 15;

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      "You are telling the player about YOUR morning — what YOU did today. " +
      "Tell them exactly 2 things you did, using simple past tense. " +
      "Make them DISTINCTIVE, VISUAL, and MEMORABLE — things the player can easily " +
      "picture and retell later. Good examples: 'Fui al parque.' 'Vi un perro grande.' " +
      "'Compré flores rojas.' 'Cociné pasta.' Bad examples (too boring/vague): " +
      "'Me desperté temprano.' 'Trabajé mucho.' " +
      "Use VERY simple vocabulary (A2 level). Each action should be ONE short sentence. " +
      "After telling your 2 things, ask if they understood: '¿Entendiste?' " +
      "The player just needs to listen and say 'sí'. " +
      "IMPORTANT: Vary the story each conversation — pick different actions each time."
    );
  }

  extractOutputs(npcLines: string[]): Record<string, string> {
    // The "story" is everything Marisol said — Pablo will use this to quiz.
    return { storyText: npcLines.join(" ") };
  }
}
