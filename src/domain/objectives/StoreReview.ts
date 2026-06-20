/**
 * Store review objective — the review / "unit test" conversation.
 *
 * Selling a harvest-ready crop at the store is a graded review of the whole
 * lesson theme. Completing it sells the crop for money (handled by the
 * controller), progressing toward the train ticket. Role: "store".
 */

import type { Objective, ObjectiveContext } from "../objective.js";
import type { Lesson } from "./lesson.js";

export class StoreReview implements Objective {
  readonly id = "store-review";
  readonly npcId = "shopkeeper";
  readonly role = "store" as const;
  readonly dependsOn: string[] = [];

  constructor(private readonly lesson: Lesson) {}

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      `You are the shopkeeper buying the neighbour's harvest. Use this as a ` +
      `friendly review/test of: ${this.lesson.title}. Goal: ${this.lesson.canDo}. ` +
      `${this.lesson.reviewTheme} Ask a few questions that make the player ` +
      `demonstrate what they practiced this week, at the ${this.lesson.level} level. ` +
      `When satisfied, agree on a price, thank them, and wrap up.`
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {};
  }
}
