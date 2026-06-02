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
  /** The NPC's display name (who they are, e.g. "Rosa"). */
  npcName?: string;
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
   * Begin the conversation. The NPC's opening line is the configured opener
   * (in-character, e.g. Rosa's greeting) — we do NOT speak the lesson's raw
   * "hint" lines (those are learner examples with placeholder names like Carlos,
   * which caused the NPC to parrot wrong names). For a role-play we also advance
   * the script to the first player cue so grading has context.
   * Returns the single opening line to speak.
   */
  begin(opener?: string): string[] {
    if (this.config.rolePlay) {
      this.advanceToNextCue();
    }
    if (opener) {
      this.history.push({ role: "npc", text: opener });
      return [opener];
    }
    return [];
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
   * Advance the script PAST any NPC (role A) turns to the next player (role B)
   * cue, WITHOUT speaking the scripted A-lines — the LLM, playing the NPC in
   * character, produces the actual spoken reply. The script only tells us what
   * the player should attempt this turn (for grading) and when it's exhausted.
   */
  private advanceToNextCue(): void {
    const rp = this.config.rolePlay!;
    for (;;) {
      const step = rp.next();
      if (step.kind === "player") {
        this.pendingCue = step.cue.context;
        return;
      }
      if (step.kind === "end") {
        this.pendingCue = null;
        return;
      }
      // step.kind === "npc": skip — the LLM speaks for the NPC, not the script.
    }
  }

  /**
   * Submit one player utterance: grade it, grant rewards, decide mastery, and
   * (for role-plays) advance to the next NPC lines. Pure orchestration.
   */
  async submit(utterance: string): Promise<TurnOutcome> {
    this.history.push({ role: "player", text: utterance });

    const res = await this.grader.gradeTurn({
      npcId: this.config.npcId,
      npcName: this.config.npcName,
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

    // The NPC's spoken reply is ALWAYS the LLM's single in-character line —
    // never concatenated with scripted lines (that caused the run-on blobs).
    const npcReply = res.npcReply;
    this.history.push({ role: "npc", text: npcReply });

    // For role-plays, advance the cue to the next player turn so we know whether
    // the scene is finished (which is when friendship grows).
    let complete = res.conversationComplete;
    if (this.config.rolePlay) {
      this.advanceToNextCue();
      complete = this.pendingCue === null; // script exhausted
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

    return {
      npcReply,
      grade: res.grade,
      applied,
      mastered: applied.state.masteredObjectiveIds.includes(this.config.objectiveId),
      complete,
    };
  }
}
