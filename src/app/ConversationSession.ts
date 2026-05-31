/**
 * ConversationSession — application-layer driver for one voiced conversation
 * gate, independent of Phaser. It coordinates the ConversationGrader and the
 * economy (via PlayerService), applying the domain gate rule.
 *
 * Because it takes ports (not OpenAI/Phaser), the entire gate+economy loop is
 * testable against fakes. ConversationScene becomes a thin renderer over this.
 */

import type { ConversationGrader } from "../domain/ports";
import type {
  ConversationTurn,
  UtteranceGrade,
} from "../domain/conversation";
import { gateShouldOpen } from "../domain/conversation";
import type { CefrLevel } from "../domain/cefr";
import type { ApplyResult, SkillTrack } from "../domain/player";
import type { PlayerService } from "./PlayerService";

export interface ConversationConfig {
  npcId: string;
  level: CefrLevel;
  objectiveId: string;
  canDo: string;
  vocab: { es: string; en: string }[];
  skill: SkillTrack;
}

export interface TurnOutcome {
  npcReply: string;
  grade: UtteranceGrade;
  /** Authoritative economy result for this turn (null if blocked). */
  applied: ApplyResult;
  /** True if the objective is now mastered (gate opens). */
  mastered: boolean;
  /** True if the NPC ended the conversation. */
  complete: boolean;
}

export class ConversationSession {
  readonly history: ConversationTurn[] = [];

  constructor(
    private readonly config: ConversationConfig,
    private readonly grader: ConversationGrader,
    private readonly player: PlayerService,
  ) {}

  /** Seed the NPC's opening line. */
  begin(opener: string): void {
    this.history.push({ role: "npc", text: opener });
  }

  /**
   * Submit one player utterance: grade it, grant rewards, decide mastery.
   * Pure orchestration over ports — no rendering, no network specifics.
   */
  async submit(utterance: string): Promise<TurnOutcome> {
    this.history.push({ role: "player", text: utterance });

    const res = await this.grader.gradeTurn({
      npcId: this.config.npcId,
      level: this.config.level,
      objectiveId: this.config.objectiveId,
      canDo: this.config.canDo,
      vocab: this.config.vocab,
      history: this.history,
      playerUtterance: utterance,
    });

    const gateOpens = gateShouldOpen(res.objectiveMet, res.grade);

    const applied = await this.player.completeActivity({
      objectiveId: this.config.objectiveId,
      level: this.config.level,
      skill: this.config.skill,
      wordIds: this.config.vocab.map((v) => v.es),
      communication: res.grade.communication,
      accuracy: res.grade.accuracy,
      objectiveMet: gateOpens,
    });

    this.history.push({ role: "npc", text: res.npcReply });

    return {
      npcReply: res.npcReply,
      grade: res.grade,
      applied,
      mastered: applied.state.masteredObjectiveIds.includes(this.config.objectiveId),
      complete: res.conversationComplete,
    };
  }
}
