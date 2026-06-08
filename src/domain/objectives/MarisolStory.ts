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
      "Tell them exactly 2-3 specific, discrete things you did, using simple past tense. " +
      "For example: 'Me desperté temprano. Fui al mercado. Compré tomates.' " +
      "Use VERY simple vocabulary (A2 level). Speak slowly and clearly. " +
      "After telling your story, ask if they understood: '¿Entendiste?' " +
      "The player just needs to listen and respond with simple acknowledgments " +
      "like 'sí' or 'ah, ok'. Keep your story to 2-3 short sentences about " +
      "concrete actions. Vary the story each time — don't always say the same thing."
    );
  }

  extractOutputs(npcLines: string[]): Record<string, string> {
    // The "story" is everything Marisol said — Pablo will use this to quiz.
    return { storyText: npcLines.join(" ") };
  }
}
