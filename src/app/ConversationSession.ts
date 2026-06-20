/**
 * ConversationSession — application-layer driver for one voiced conversation,
 * independent of the UI. Coordinates the ConversationGrader (LLM) and the
 * economy (via PlayerService), applying the domain gate rule.
 *
 * Conversations are FREE-FORM: the NPC is played by the LLM, which reacts to
 * what the player actually said and stays on the lesson's theme/vocab/level.
 * The LLM decides when the chat reaches a natural end (`conversationComplete`);
 * we enforce a small minimum so it can't end after one exchange.
 *
 * Because it takes ports (not vendor SDKs), the loop is testable against fakes.
 */

import type { ConversationGrader } from "../domain/ports";
import type { ConversationTurn, UtteranceGrade } from "../domain/conversation";
import { gateShouldOpen } from "../domain/conversation";
import type { CefrLevel } from "../domain/cefr";
import type { ApplyResult } from "../domain/player";
import type { DailyRole } from "../domain/dailyLoop";
import type { PlayerService } from "./PlayerService";

/** A conversation must have at least this many player turns before it can end. */
export const MIN_PLAYER_TURNS = 3;

export interface ConversationConfig {
  npcId: string;
  /** The NPC's display name (who they are, e.g. "Aguamarina"). */
  npcName?: string;
  level: CefrLevel;
  objectiveId: string;
  /** Which daily role this conversation fulfills (gates reward + growth). */
  role: DailyRole;
  canDo: string;
  vocab: { es: string; en: string }[];
  /** Short theme/scenario to keep the LLM on-topic. */
  theme?: string;
}

export interface TurnOutcome {
  npcReply: string;
  grade: UtteranceGrade;
  /** Authoritative economy result for this turn. */
  applied: ApplyResult;
  /** True if the player demonstrated the objective well enough (gate opens). */
  passed: boolean;
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

  /**
   * Submit one player utterance: grade it, grant rewards, decide whether the
   * conversation has reached a natural end. Pure orchestration.
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

    const passed = gateShouldOpen(res.objectiveMet, res.grade, 1);

    const npcReply = res.npcReply;
    this.history.push({ role: "npc", text: npcReply });

    // The conversation can only end after a minimum number of exchanges.
    const complete =
      res.conversationComplete && this.playerTurns >= MIN_PLAYER_TURNS;

    const applied = await this.player.completeActivity({
      objectiveId: this.config.objectiveId,
      level: this.config.level,
      role: this.config.role,
      communication: res.grade.communication,
      accuracy: res.grade.accuracy,
    });

    return { npcReply, grade: res.grade, applied, passed, complete };
  }
}
