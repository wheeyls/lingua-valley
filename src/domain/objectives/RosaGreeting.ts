/**
 * Rosa greeting objective — standalone daily greeting conversation.
 * No dependencies, no outputs. Just a friendly A1 conversation.
 */

import type { Objective, ObjectiveContext } from "../objective.js";

export class RosaGreeting implements Objective {
  readonly id = "rosa-greeting";
  readonly npcId = "rosa";
  readonly dependsOn: string[] = [];
  readonly reward = 10;

  buildTheme(_ctx: ObjectiveContext): string {
    return (
      "A casual, friendly greeting between neighbors. Keep it very simple — " +
      "ask how they are, what's new, basic small talk. Stay at the most basic " +
      "beginner level. 3-6 word sentences. Only the most common words."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {}; // no downstream consumers
  }
}
