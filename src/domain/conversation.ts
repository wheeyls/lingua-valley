/**
 * Shared contract for the voiced conversation gate.
 *
 * These types are the wire format between the browser game and the serverless
 * /api functions. Keeping them in the domain layer (no Phaser, no Node) means
 * both sides compile against the same definitions.
 */

import type { CefrLevel } from "./cefr";

/** A single turn in an ongoing conversation with an NPC. */
export interface ConversationTurn {
  role: "npc" | "player";
  /** Spanish text of the turn. */
  text: string;
}

/** Request to /api/converse: the player just said something; get NPC reply + grade. */
export interface ConverseRequest {
  /** Stable id of the NPC being spoken to (for persona + voice). */
  npcId: string;
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
 * grade to clear thresholds. Pure function so it's unit-testable.
 */
export function gateShouldOpen(
  modelSaysMet: boolean,
  grade: UtteranceGrade,
): boolean {
  return (
    modelSaysMet &&
    grade.communication >= PASS_COMMUNICATION &&
    grade.accuracy >= PASS_ACCURACY
  );
}
