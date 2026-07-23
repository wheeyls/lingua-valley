/**
 * Story-telling objective — Marisol's seed conversation (at the seed farm).
 *
 * Marisol recounts a couple of things she did today in the past tense and hands
 * over this week's seed. The player just has to understand; her story is captured
 * as `storyText` output so the retell objective can quiz against it.
 *
 * Role: "seeds" — completing it plants this week's garden row.
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { Lesson } from "./lesson.js";

export class StoryTelling implements Objective {
  readonly id = "story-telling";
  readonly npcId = "marisol";
  readonly role = "seeds" as const;
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
