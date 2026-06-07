/**
 * FakeConversationGrader — a scriptable ConversationGrader for tests and the
 * dev harness. No OpenAI. You queue grades, or set a default, and it returns
 * deterministic ConverseResponses. This lets us drive the whole conversation
 * gate + economy loop without any network.
 */

import type { ConversationGrader } from "../../domain/ports";
import type { ConverseRequest, ConverseResponse, UtteranceGrade } from "../../domain/conversation";

export interface ScriptedTurn {
  communication: number;
  accuracy: number;
  npcReply?: string;
  feedback?: string;
  corrections?: string[];
  objectiveMet?: boolean;
  conversationComplete?: boolean;
}

export class FakeConversationGrader implements ConversationGrader {
  private queue: ScriptedTurn[] = [];
  private fallback: ScriptedTurn = {
    communication: 0.9,
    accuracy: 0.85,
    objectiveMet: true,
    conversationComplete: true,
  };
  public calls: ConverseRequest[] = [];

  /** Queue the grade(s) returned by the next gradeTurn call(s). */
  enqueue(...turns: ScriptedTurn[]): this {
    this.queue.push(...turns);
    return this;
  }

  /** Set the grade returned when the queue is empty. */
  setDefault(turn: ScriptedTurn): this {
    this.fallback = turn;
    return this;
  }

  async gradeTurn(req: ConverseRequest): Promise<ConverseResponse> {
    this.calls.push(req);
    const t = this.queue.shift() ?? this.fallback;
    const grade: UtteranceGrade = {
      communication: t.communication,
      accuracy: t.accuracy,
      feedback: t.feedback ?? "Scripted feedback.",
      corrections: t.corrections ?? [],
    };
    return {
      npcReply: t.npcReply ?? "Muy bien, sigamos.",
      grade,
      objectiveMet: t.objectiveMet ?? false,
      // Free-form conversations: the script controls completion (default false,
      // so tests drive several turns; the session also enforces a min-turn floor).
      conversationComplete: t.conversationComplete ?? false,
    };
  }
}
