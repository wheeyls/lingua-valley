/**
 * QuestService — application-layer orchestration for quests. Bridges quest
 * content + the pure quest domain functions to the player's persisted state via
 * PlayerService. No quest rules live here (those are in domain/quest.ts).
 */

import type { PlayerService } from "./PlayerService";
import {
  activateQuest,
  completeStep,
  completeQuest,
  questProgress,
  type Quest,
  type QuestProgress,
} from "../domain/quest";
import { questById, questsTargeting } from "../content/quests";

export class QuestService {
  constructor(private readonly player: PlayerService) {}

  progressFor(questId: string): QuestProgress {
    return questProgress(this.player.getState().quests, questId);
  }

  /** Activate a quest (player stated their plan in future tense). */
  async activate(questId: string): Promise<void> {
    await this.player.update((s) => ({
      ...s,
      quests: {
        ...s.quests,
        [questId]: activateQuest(questProgress(s.quests, questId)),
      },
    }));
  }

  /** Complete the quest after the past-tense recap; returns reward pesos. */
  async finishRecap(quest: Quest): Promise<number> {
    let awarded = 0;
    await this.player.update((s) => {
      const before = questProgress(s.quests, quest.id);
      if (before.phase !== "recap") return s;
      awarded = quest.reward;
      return {
        ...s,
        pesos: s.pesos + quest.reward,
        quests: { ...s.quests, [quest.id]: completeQuest(before) },
      };
    });
    return awarded;
  }

  /**
   * Mark any ACTIVE quest steps targeting `npcId` complete — call when the
   * player talks to / trades with that NPC. Returns the step descriptions that
   * were just completed (for UI feedback).
   */
  async noteInteraction(npcId: string): Promise<string[]> {
    const completed: string[] = [];
    await this.player.update((s) => {
      let quests = s.quests;
      for (const quest of questsTargeting(npcId)) {
        const before = questProgress(quests, quest.id);
        if (before.phase !== "active") continue;
        for (const step of quest.steps.filter((st) => st.targetNpcId === npcId)) {
          const after = completeStep(quest, questProgress(quests, quest.id), step.id);
          if (after !== questProgress(quests, quest.id)) {
            completed.push(step.description);
            quests = { ...quests, [quest.id]: after };
          }
        }
      }
      return quests === s.quests ? s : { ...s, quests };
    });
    return completed;
  }
}

export { questById };
