/**
 * Quest definitions (content). One quest for the first build: a planner sends
 * you off (future tense), you run errands in the market, and report back (past
 * tense). Steps target existing, always-accessible NPCs.
 */

import type { Quest } from "../domain/quest.js";

export const QUESTS: Quest[] = [
  {
    id: "market-errands",
    giverNpcId: "marisol",
    title: "Market Errands",
    planLessonSlug: "weekend-plans", // future tense: "voy a…", "vamos a…"
    recapLessonSlug: "morning-routine", // past tense: "compré…", "visité…"
    reward: 60,
    steps: [
      {
        id: "buy-from-vendedora",
        description: "buy produce from La Vendedora",
        targetNpcId: "vendedora",
      },
      {
        id: "talk-to-panadero",
        description: "get bread from El Panadero",
        targetNpcId: "panadero",
      },
    ],
  },
];

export function questById(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}

/** The quest an NPC gives (if any). */
export function questByGiver(npcId: string): Quest | undefined {
  return QUESTS.find((q) => q.giverNpcId === npcId);
}

/** Quests that have a step targeting this NPC (for marking steps complete). */
export function questsTargeting(npcId: string): Quest[] {
  return QUESTS.filter((q) => q.steps.some((s) => s.targetNpcId === npcId));
}
