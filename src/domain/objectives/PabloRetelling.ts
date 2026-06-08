/**
 * Pablo retelling objective — depends on MarisolStory. Consumes `storyText`
 * and asks the player to retell what Marisol said, prompting through each point.
 */

import type { Objective, ObjectiveContext } from "../objective.js";

export class PabloRetelling implements Objective {
  readonly id = "pablo-retelling";
  readonly npcId = "pablo";
  readonly dependsOn = ["marisol-story"];
  readonly reward = 25;

  buildTheme(ctx: ObjectiveContext): string {
    const story = ctx.inputs["storyText"] ?? "";
    return (
      "You are Marisol's brother Pablo. Marisol just told the player about her morning. " +
      "Ask the player: '¿Qué hizo Marisol hoy?' (What did Marisol do today?) " +
      (story
        ? `Marisol's story was: "${story}". The player should try to retell these things. `
        : "The player should try to retell what Marisol told them. ") +
      "Prompt them through it one thing at a time. If they get stuck, give hints: " +
      "'¿Y luego?' (And then?), '¿Qué más?' (What else?), or give the first word. " +
      "Be patient and encouraging. When they've covered the main points, praise them " +
      "and wrap up naturally."
    );
  }

  extractOutputs(_npcLines: string[]): Record<string, string> {
    return {}; // terminal objective
  }
}
