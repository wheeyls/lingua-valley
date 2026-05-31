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
  RolePlayContext,
} from "../domain/conversation";
import { gateShouldOpen } from "../domain/conversation";
import type { CefrLevel } from "../domain/cefr";
import type { ApplyResult, SkillTrack } from "../domain/player";
import type { PlayerService } from "./PlayerService";
import { RolePlay } from "../domain/rolePlay";

export interface ConversationConfig {
  npcId: string;
  level: CefrLevel;
  objectiveId: string;
  canDo: string;
  vocab: { es: string; en: string }[];
  skill: SkillTrack;
  /** Optional scripted role-play; when set, the session steps through it. */
  rolePlay?: RolePlay;
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
  /** True if the NPC ended the conversation. */
  complete: boolean;
}

export class ConversationSession {
  readonly history: ConversationTurn[] = [];
  /** The role-play context awaiting the player's next utterance (if scripted). */
  private pendingCue: RolePlayContext | null = null;

  constructor(
    private readonly config: ConversationConfig,
    private readonly grader: ConversationGrader,
    private readonly player: PlayerService,
  ) {}

  /**
   * Begin the conversation. For a free-form gate, pass the opener line and it's
   * the player's turn. For a role-play, the opener is ignored — call
   * `advanceScript()` to play NPC lines up to the first player cue.
   * Returns NPC lines to speak (one or more for role-plays).
   */
  begin(opener?: string): string[] {
    if (this.config.rolePlay) {
      return this.advanceScript();
    }
    if (opener) this.history.push({ role: "npc", text: opener });
    return opener ? [opener] : [];
  }

  /** Whether this session is a scripted role-play. */
  get isRolePlay(): boolean {
    return !!this.config.rolePlay;
  }

  /** The current player goal (role-play only), for the UI to show. */
  get currentGoal(): string | null {
    return this.pendingCue?.expectedGoalEnglish ?? this.pendingCue?.expectedGoal ?? null;
  }

  /**
   * Play NPC (role A) lines until the next player (role B) cue or the end.
   * Returns the NPC lines spoken. Sets pendingCue for the next submit().
   */
  private advanceScript(): string[] {
    const rp = this.config.rolePlay!;
    const npcLines: string[] = [];
    for (;;) {
      const step = rp.next();
      if (step.kind === "npc") {
        this.history.push({ role: "npc", text: step.line.text });
        npcLines.push(step.line.text);
      } else if (step.kind === "player") {
        this.pendingCue = step.cue.context;
        break;
      } else {
        this.pendingCue = null;
        break;
      }
    }
    return npcLines;
  }

  /**
   * Submit one player utterance: grade it, grant rewards, decide mastery, and
   * (for role-plays) advance to the next NPC lines. Pure orchestration.
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
      rolePlay: this.pendingCue ?? undefined,
    });

    const gateOpens = gateShouldOpen(
      res.objectiveMet,
      res.grade,
      this.config.strictness ?? 1,
    );

    // For role-plays, advance the script FIRST so we know whether this turn
    // completed the scene (which is when friendship grows).
    let complete = res.conversationComplete;
    let npcReply = res.npcReply;
    if (this.config.rolePlay) {
      this.history.push({ role: "npc", text: res.npcReply });
      const more = this.advanceScript();
      complete = this.pendingCue === null; // script exhausted
      npcReply = [res.npcReply, ...more].join(" ");
    }

    const applied = await this.player.completeActivity({
      objectiveId: this.config.objectiveId,
      level: this.config.level,
      skill: this.config.skill,
      wordIds: this.config.vocab.map((v) => v.es),
      communication: res.grade.communication,
      accuracy: res.grade.accuracy,
      objectiveMet: gateOpens,
      npcId: this.config.npcId,
      rolePlayComplete: !!this.config.rolePlay && complete,
    });

    if (!this.config.rolePlay) {
      this.history.push({ role: "npc", text: res.npcReply });
    }

    return {
      npcReply,
      grade: res.grade,
      applied,
      mastered: applied.state.masteredObjectiveIds.includes(this.config.objectiveId),
      complete,
    };
  }
}
