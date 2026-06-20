/**
 * Water practice objective — the daily practice conversation.
 *
 * Visiting the water tower keeper is the daily drill against the lesson theme.
 * Completing it (once per day) waters the field and grows every crop +1 unit —
 * the GROWTH DRIVER of the loop. Role: "water".
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { Lesson } from "./lesson.js";

export class WaterPractice implements Objective {
  readonly id = "water-practice";
  readonly npcId = "waterkeeper";
  readonly role = "water" as const;
  readonly dependsOn: string[] = [];

  constructor(private readonly lesson: Lesson) {}

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      `You are the water-tower keeper. Give the neighbour a friendly daily ` +
      `practice session on: ${this.lesson.title}. Goal: ${this.lesson.canDo}. ` +
      `${this.lesson.practiceTheme} Keep it at the ${this.lesson.level} level, ` +
      `gently correcting and encouraging. When the player has had a good practice, ` +
      `tell them their water is ready for the garden and wrap up.`
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
