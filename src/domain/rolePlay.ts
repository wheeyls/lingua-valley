/**
 * RolePlay — pure domain logic for stepping through a lesson lab as a
 * conversation. The NPC plays role A, the player plays role B.
 *
 * A lab's turns alternate (mostly A, B, A, B…). We walk them: emit the NPC's
 * A-turns (using their hint as the spoken line), and when we reach a B-turn we
 * pause for the player, exposing the expected goal/phrases/hint as a
 * RolePlayContext for grading. Framework-free and testable.
 */

import type { Lab, TurnPrompt } from "../content/lessons/types";
import type { RolePlayContext } from "./conversation";

export interface NpcLine {
  text: string;
}

export interface PlayerCue {
  context: RolePlayContext;
}

/** A step is either NPC speech to play, a player prompt, or the end. */
export type RolePlayStep =
  | { kind: "npc"; line: NpcLine }
  | { kind: "player"; cue: PlayerCue }
  | { kind: "end" };

export class RolePlay {
  private index = 0;
  private readonly totalPlayerTurns: number;
  private playerTurnsSeen = 0;

  constructor(private readonly lab: Lab) {
    this.totalPlayerTurns = lab.turns.filter((t) => t.role === "B").length;
  }

  /** The NPC's role (A) and the player's role (B). */
  npcRole() {
    return this.lab.roles.find((r) => r.id === "A");
  }
  playerRole() {
    return this.lab.roles.find((r) => r.id === "B");
  }

  /**
   * Advance to the next step. NPC turns are returned to be spoken; the first
   * player (B) turn encountered returns a cue and pauses. Call repeatedly:
   * typically you play NPC lines until a player cue, then submit, then continue.
   */
  next(): RolePlayStep {
    if (this.index >= this.lab.turns.length) return { kind: "end" };

    const turn = this.lab.turns[this.index];
    this.index++;

    if (turn.role === "A") {
      return { kind: "npc", line: { text: npcLineFor(turn) } };
    }
    // role B — the player's turn.
    this.playerTurnsSeen++;
    return {
      kind: "player",
      cue: { context: this.contextFor(turn, this.playerTurnsSeen) },
    };
  }

  /** True once every turn has been consumed. */
  isComplete(): boolean {
    return this.index >= this.lab.turns.length;
  }

  private contextFor(turn: TurnPrompt, turnNumber: number): RolePlayContext {
    const npc = this.npcRole();
    const player = this.playerRole();
    return {
      scenario: this.lab.scenario,
      npcRole: { name: npc?.name ?? "Local", description: npc?.description ?? "" },
      playerRole: {
        name: player?.name ?? "Visitor",
        description: player?.description ?? "",
      },
      expectedGoal: turn.goal,
      expectedGoalEnglish: turn.goalEnglish,
      acceptablePhrases: turn.phrases,
      hint: turn.hint,
      turnNumber,
      totalTurns: this.totalPlayerTurns,
    };
  }
}

/** What the NPC says for an A-turn: prefer the hint (model line), else goal. */
export function npcLineFor(turn: TurnPrompt): string {
  return turn.hint ?? turn.phrases[0]?.spanish ?? turn.goal;
}
