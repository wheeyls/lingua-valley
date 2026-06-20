/**
 * Story-telling objective — the FIRST half of the two-person water practice.
 *
 * The story-teller (Marisol) recounts a couple of things she did today in the
 * past tense. The player just has to understand. Her story is captured as
 * `storyText` output so the retell objective can quiz against it.
 *
 * Role: "water" (shared with the retell objective; completing both waters the
 * field once for the day).
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { Lesson } from "./lesson.js";

export class StoryTelling implements Objective {
  readonly id = "story-telling";
  readonly npcId = "marisol";
  readonly role = "water" as const;
  readonly dependsOn: string[] = [];

  constructor(private readonly lesson: Lesson) {}

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      `${this.lesson.storyTheme ?? this.lesson.practiceTheme ?? ""} ` +
      `Keep it at the ${this.lesson.level} level.`
    );
  }

  extractOutputs(npcLines: string[]): Record<string, string> {
    // The whole of what the story-teller said — the retell NPC quizzes on this.
    return { storyText: npcLines.join(" ") };
  }
}
