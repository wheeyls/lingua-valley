/**
 * Seeds intro objective — the once-a-cycle "new lesson" conversation.
 *
 * The seed farmer introduces what you'll learn this week and hands over a batch
 * of seeds. Completing it plants a crop (handled by the controller) and sets the
 * week's lesson theme. Role: "seeds".
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { Lesson } from "./lesson.js";

export class SeedsIntro implements Objective {
  readonly id = "seeds-intro";
  readonly npcId = "seedsman";
  readonly role = "seeds" as const;
  readonly dependsOn: string[] = [];

  constructor(private readonly lesson: Lesson) {}

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      `You are the seed farmer. Warmly welcome the neighbour and explain that ` +
      `this week's seeds will help them practice: ${this.lesson.title}. ` +
      `Goal for the player: ${this.lesson.canDo}. ${this.lesson.introTheme} ` +
      `Keep it short and encouraging, at the ${this.lesson.level} level. End by ` +
      `giving them a batch of seeds to plant back home.`
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return { theme: this.lesson.id };
  }
}
