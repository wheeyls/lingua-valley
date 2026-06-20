/**
 * Story-retell objective — the SECOND half of the two-person water practice.
 *
 * Pablo asks the player to retell what the story-teller just said. Depends on
 * `story-telling` (won't activate until the story's been heard) and consumes its
 * `storyText` so the LLM can prompt and check the retelling.
 *
 * Role: "water". Completing this (after the story) is what waters the field for
 * the day — the daily growth driver.
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { Lesson } from "./lesson.js";

export class StoryRetell implements Objective {
  readonly id = "story-retell";
  readonly npcId = "pablo";
  readonly role = "water" as const;
  readonly dependsOn = ["story-telling"];

  constructor(private readonly lesson: Lesson) {}

  buildTheme(ctx: ObjectiveContext): string {
    const story = ctx.inputs["storyText"] ?? "";
    return (
      `${this.lesson.retellTheme ?? ""} ` +
      (story
        ? `For reference, Marisol's story was: "${story}". `
        : "") +
      `Keep it at the ${this.lesson.level} level.`
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
