/**
 * ConversationSession — application-layer driver for one voiced conversation,
 * independent of Phaser. Coordinates the ConversationGrader (LLM) and the
 * economy (via PlayerService), applying the domain gate rule.
 *
 * Conversations are FREE-FORM: the NPC is played by the LLM, which reacts to
 * what the player actually said and stays on the lesson's theme/vocab/level.
 * There is no rigid turn-by-turn script — that caused opener/goal mismatches and
 * script drift. The LLM decides when the chat reaches a natural end
 * (`conversationComplete`); we enforce a small minimum so it can't end after one
 * exchange. Completing a conversation is when friendship grows.
 *
 * Because it takes ports (not OpenAI/Phaser), the loop is testable against fakes.
 */

import type { ConversationGrader } from "../domain/ports";
import type { ConversationTurn, UtteranceGrade } from "../domain/conversation";
import { gateShouldOpen } from "../domain/conversation";
import type { CefrLevel } from "../domain/cefr";
import type { ApplyResult, SkillTrack } from "../domain/player";
import type { PlayerService } from "./PlayerService";

/** A conversation must have at least this many player turns before it can end. */
export const MIN_PLAYER_TURNS = 3;

export interface ConversationConfig {
  npcId: string;
  /** The NPC's display name (who they are, e.g. "Rosa"). */
  npcName?: string;
  level: CefrLevel;
  objectiveId: string;
  canDo: string;
  vocab: { es: string; en: string }[];
  skill: SkillTrack;
  /** Short theme/scenario to keep the LLM on-topic (e.g. from a lesson lab). */
  theme?: string;
  /** Grading strictness (>=1) from the town's difficulty. Defaults to 1. */
  strictness?: number;
}

export interface TurnOutcome {
  npcReply: string;
  grade: UtteranceGrade;
  /** Authoritative economy result for this turn (null if blocked). */
  applied: ApplyResult;
  /** True if the objective is now mastered (gate opens). */
  mastered: boolean;
  /** True if the conversation reached a natural end. */
  complete: boolean;
}

export class ConversationSession {
  readonly history: ConversationTurn[] = [];
  private playerTurns = 0;

  constructor(
    private readonly config: ConversationConfig,
    private readonly grader: ConversationGrader,
    private readonly player: PlayerService,
  ) {}

  /**
   * Begin the conversation. The NPC greets first with their in-character opener.
   * Returns the opening line(s) to speak.
   */
  begin(opener?: string): string[] {
    if (opener) {
      this.history.push({ role: "npc", text: opener });
      return [opener];
    }
    return [];
  }

  /** Always a free conversation now (kept for the scene's branching/messages). */
  get isRolePlay(): boolean {
    return true;
  }

  /** No per-turn scripted goal anymore — free conversation. */
  get currentGoal(): string | null {
    return null;
  }

  /**
   * Submit one player utterance: grade it, grant rewards, decide mastery and
   * whether the conversation has reached a natural end. Pure orchestration.
   */
  async submit(utterance: string): Promise<TurnOutcome> {
    this.history.push({ role: "player", text: utterance });
    this.playerTurns += 1;

    const res = await this.grader.gradeTurn({
      npcId: this.config.npcId,
      npcName: this.config.npcName,
      level: this.config.level,
      objectiveId: this.config.objectiveId,
      canDo: this.config.canDo,
      vocab: this.config.vocab,
      theme: this.config.theme,
      history: this.history,
      playerUtterance: utterance,
    });

    const gateOpens = gateShouldOpen(
      res.objectiveMet,
      res.grade,
      this.config.strictness ?? 1,
    );

    const npcReply = res.npcReply;
    this.history.push({ role: "npc", text: npcReply });

    // The conversation can only end after a minimum number of exchanges, so it
    // never wraps up after a single turn.
    const complete =
      res.conversationComplete && this.playerTurns >= MIN_PLAYER_TURNS;

    const applied = await this.player.completeActivity({
      objectiveId: this.config.objectiveId,
      level: this.config.level,
      skill: this.config.skill,
      wordIds: this.config.vocab.map((v) => v.es),
      communication: res.grade.communication,
      accuracy: res.grade.accuracy,
      objectiveMet: gateOpens,
      npcId: this.config.npcId,
      // Friendship grows when the whole conversation completes.
      rolePlayComplete: complete,
    });

    return {
      npcReply,
      grade: res.grade,
      applied,
      mastered: applied.state.masteredObjectiveIds.includes(this.config.objectiveId),
      complete,
    };
  }
}
