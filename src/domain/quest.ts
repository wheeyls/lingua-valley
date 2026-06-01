/**
 * Quests — a narrative arc that frames practice around tense.
 *
 * A quest-giver asks "¿Qué vas a hacer?" and you state your plan in FUTURE tense
 * ("Voy a visitar al granjero, voy a comprar café"). You then go DO those steps
 * in the world (talk to / trade with the target NPCs). When you return, the same
 * NPC asks "¿Qué hiciste?" and you recap in PAST tense ("Visité al granjero,
 * compré café"). Same content, two tenses, bookending a journey.
 *
 * Pure domain: the quest definitions live in content, but the *state machine*
 * and rules live here. Framework-free and fully testable.
 */

export type QuestPhase = "offered" | "planning" | "active" | "recap" | "done";

/** A concrete thing to do, completed by interacting with `targetNpcId`. */
export interface QuestStep {
  id: string;
  /** What the player will narrate (future) / recap (past). */
  description: string;
  /** Completed when the player talks to / trades with this NPC. */
  targetNpcId: string;
}

/** A quest definition (content). Same NPC gives and receives. */
export interface Quest {
  id: string;
  /** The NPC who gives the quest and hears the recap. */
  giverNpcId: string;
  title: string;
  /** Lesson slug for the FUTURE-tense planning conversation. */
  planLessonSlug: string;
  /** Lesson slug for the PAST-tense recap conversation. */
  recapLessonSlug: string;
  steps: QuestStep[];
  /** Bonus pesos for completing the whole quest (the recap). */
  reward: number;
}

/** Per-player progress for one quest. Stored on PlayerState. */
export interface QuestProgress {
  phase: QuestPhase;
  /** Step ids the player has completed in the world. */
  completedStepIds: string[];
}

export const INITIAL_QUEST_PROGRESS: QuestProgress = {
  phase: "offered",
  completedStepIds: [],
};

/** Read a quest's progress from a map, defaulting to "offered". */
export function questProgress(
  progress: Record<string, QuestProgress>,
  questId: string,
): QuestProgress {
  return progress[questId] ?? INITIAL_QUEST_PROGRESS;
}

/** Begin the quest: the player has stated their plan in future tense. */
export function activateQuest(p: QuestProgress): QuestProgress {
  if (p.phase !== "offered" && p.phase !== "planning") return p;
  return { ...p, phase: "active" };
}

/** Mark a step complete (player interacted with its target NPC). Pure. */
export function completeStep(
  quest: Quest,
  p: QuestProgress,
  stepId: string,
): QuestProgress {
  if (p.phase !== "active") return p;
  if (!quest.steps.some((s) => s.id === stepId)) return p;
  if (p.completedStepIds.includes(stepId)) return p;
  const completedStepIds = [...p.completedStepIds, stepId];
  // All steps done? Move to the recap phase (ready to report back).
  const allDone = quest.steps.every((s) => completedStepIds.includes(s.id));
  return {
    ...p,
    completedStepIds,
    phase: allDone ? "recap" : "active",
  };
}

/** Finish the quest after the past-tense recap conversation. */
export function completeQuest(p: QuestProgress): QuestProgress {
  if (p.phase !== "recap") return p;
  return { ...p, phase: "done" };
}

export function allStepsComplete(quest: Quest, p: QuestProgress): boolean {
  return quest.steps.every((s) => p.completedStepIds.includes(s.id));
}

export function remainingSteps(quest: Quest, p: QuestProgress): QuestStep[] {
  return quest.steps.filter((s) => !p.completedStepIds.includes(s.id));
}

/**
 * Which lesson the quest-giver should run RIGHT NOW, based on phase:
 *  - offered/planning -> the future-tense planning lesson
 *  - recap            -> the past-tense recap lesson
 *  - active/done      -> none (giver just nudges you to finish your steps / thanks you)
 */
export function lessonForPhase(quest: Quest, p: QuestProgress): string | null {
  switch (p.phase) {
    case "offered":
    case "planning":
      return quest.planLessonSlug;
    case "recap":
      return quest.recapLessonSlug;
    default:
      return null;
  }
}
