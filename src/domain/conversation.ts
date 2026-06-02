/**
 * Shared contract for the voiced conversation gate.
 *
 * These types are the wire format between the browser game and the serverless
 * /api functions. Keeping them in the domain layer (no Phaser, no Node) means
 * both sides compile against the same definitions.
 */

import type { CefrLevel } from "./cefr.js";

/** A single turn in an ongoing conversation with an NPC. */
export interface ConversationTurn {
  role: "npc" | "player";
  /** Spanish text of the turn. */
  text: string;
}

/**
 * Role-play context for a SCRIPTED conversation, derived from a lesson's lab.
 * When present, the NPC plays role A and the player plays role B; grading is
 * against the current expected role-B turn.
 */
export interface RolePlayContext {
  /** The lab scenario description (sets the scene). */
  scenario: string;
  /** Who the NPC is (role A name + description). */
  npcRole: { name: string; description: string };
  /** Who the player is (role B name + description). */
  playerRole: { name: string; description: string };
  /** What the player should accomplish THIS turn (role B goal). */
  expectedGoal: string;
  expectedGoalEnglish?: string;
  /** Acceptable phrases for this turn (es/en). */
  acceptablePhrases: { spanish: string; english: string }[];
  /** Model answer for this turn. */
  hint?: string;
  /** 1-based index of this turn / total player turns, for progress. */
  turnNumber: number;
  totalTurns: number;
}

/** Request to /api/converse: the player just said something; get NPC reply + grade. */
export interface ConverseRequest {
  /** Stable id of the NPC being spoken to (for persona + voice). */
  npcId: string;
  /** The NPC's display name — who the NPC IS (e.g. "Rosa"). */
  npcName?: string;
  /** The CEFR level this conversation is gated at. */
  level: CefrLevel;
  /** The learning objective the player is trying to demonstrate. */
  objectiveId: string;
  /** What the player must be able to do to pass (the "can-do" statement). */
  canDo: string;
  /** Vocab/phrases in scope for this objective, to anchor grading. */
  vocab: { es: string; en: string }[];
  /** The conversation so far (NPC opener + any prior turns). */
  history: ConversationTurn[];
  /** The player's latest utterance (already transcribed by Whisper). */
  playerUtterance: string;
  /** Present for scripted lesson role-plays; absent for free-form gates. */
  rolePlay?: RolePlayContext;
}

/** The LLM's assessment of the player's latest utterance. */
export interface UtteranceGrade {
  /** 0..1 — how well the player communicated the intended meaning. */
  communication: number;
  /** 0..1 — appropriateness/accuracy for the target CEFR level. */
  accuracy: number;
  /** Short, encouraging feedback in English (1–2 sentences). */
  feedback: string;
  /** Any specific corrections, e.g. "say 'me llamo' not 'mi nombre es'". */
  corrections: string[];
}

/** Response from /api/converse. */
export interface ConverseResponse {
  /** The NPC's spoken reply, in Spanish, at the conversation's level. */
  npcReply: string;
  /** Grade for the player's utterance. */
  grade: UtteranceGrade;
  /**
   * True when the player has demonstrated the objective well enough across the
   * conversation that the gate should open (objective mastered).
   */
  objectiveMet: boolean;
  /** True when the NPC considers the conversation complete. */
  conversationComplete: boolean;
}

export interface TranscribeResponse {
  text: string;
}

/** Mastery thresholds used by both the LLM prompt and any local fallback. */
export const PASS_COMMUNICATION = 0.7;
export const PASS_ACCURACY = 0.6;

/**
 * Local guardrail: even if the model says objectiveMet, require the latest
 * grade to clear thresholds. `strictness` (>=1, from a town's difficulty) raises
 * the bar in remoter towns; thresholds are clamped to stay achievable. Pure.
 */
export function gateShouldOpen(
  modelSaysMet: boolean,
  grade: UtteranceGrade,
  strictness = 1,
): boolean {
  const commBar = Math.min(0.95, PASS_COMMUNICATION * strictness);
  const accBar = Math.min(0.9, PASS_ACCURACY * strictness);
  return (
    modelSaysMet &&
    grade.communication >= commBar &&
    grade.accuracy >= accBar
  );
}
