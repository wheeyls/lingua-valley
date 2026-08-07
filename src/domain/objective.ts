/**
 * Objective system — code-driven, composable, dependency-aware.
 *
 * An Objective is a unit of daily practice (e.g. "greet Rosa", "listen to
 * Jackie's story", "retell the story to Jorgito"). Each objective:
 *   - is tied to an NPC
 *   - has a theme/instructions for the LLM conversation
 *   - can DEPEND on other objectives (won't activate until deps are complete)
 *   - can PRODUCE outputs that downstream objectives CONSUME as inputs
 *   - can be completed once per daily cycle for a reward; replays earn nothing
 *
 * Objectives are registered in an ObjectiveGraph which resolves dependencies,
 * routes data between them, and tracks completion state.
 *
 * PURE DOMAIN: pure domain, no framework imports. Fully testable.
 */

import type { DailyRole } from "./dailyLoop.js";
import type { LessonVocab } from "./objectives/lesson.js";
import type { DailyScene } from "./objectives/scene.js";

/** The completion record for one objective in one daily cycle. */
export interface ObjectiveCompletion {
  completedAt: string; // ISO timestamp
  /** Arbitrary outputs produced by this objective (e.g. { storyText: "..." }). */
  outputs: Record<string, string>;
}

/** Per-cycle state for all objectives, keyed by objective id. */
export type ObjectiveState = Record<string, ObjectiveCompletion>;

/** Context passed to an objective's methods at runtime. */
export interface ObjectiveContext {
  /** Outputs from completed dependency objectives (merged by key). */
  inputs: Record<string, string>;
  /** The current daily cycle's objective state (for checking deps). */
  state: ObjectiveState;
  /** Today's Pacific calendar day (YYYY-MM-DD), for date-seeded content. */
  today: string;
}

/**
 * An Objective is a code-driven unit of daily practice. Implement this
 * interface for each type of interaction (greeting, story, retelling, etc.).
 */
export interface Objective {
  /** Unique id (e.g. "story-telling", "story-retell", "store-review"). */
  readonly id: string;
  /** The NPC this objective is tied to. */
  readonly npcId: string;
  /** Which daily-loop role this objective fulfills (gates reward + growth). */
  readonly role: DailyRole;
  /** Ids of objectives that must complete before this one activates. */
  readonly dependsOn: string[];
  /**
   * When true, this objective is bonus practice: it doesn't count toward
   * "all done today" even though completing it still earns growth/reward.
   */
  readonly bonus?: boolean;
  /** Override the lesson's can-do statement for this objective's conversation. */
  readonly canDo?: string;
  /** Override the lesson's vocab for this objective's conversation. */
  readonly vocab?: LessonVocab[];

  /**
   * Build the LLM conversation theme/instructions for this objective.
   * Receives inputs from completed dependencies (e.g. the story text).
   * Called by the scene before starting the conversation.
   */
  buildTheme(ctx: ObjectiveContext): string;

  /**
   * Extract outputs from a completed conversation (e.g. the story Jackie told).
   * `npcLines` is every line the NPC spoke during the conversation.
   * Returns key-value outputs that downstream objectives can consume.
   */
  extractOutputs(npcLines: string[]): Record<string, string>;

  /**
   * Optional visual scene the player can peek at during the conversation
   * (e.g. Maria's room) — the UI renders this into a picture, deliberately
   * with no target-language text, so answering still requires producing the
   * Spanish themselves. Absent for objectives that don't need one.
   */
  referenceScene?(ctx: ObjectiveContext): DailyScene;
}

/**
 * ObjectiveGraph — owns the set of objectives, resolves dependencies, tracks
 * daily completion, and routes data. Pure, no framework.
 */
export class ObjectiveGraph {
  private objectives = new Map<string, Objective>();

  register(obj: Objective): this {
    this.objectives.set(obj.id, obj);
    return this;
  }

  get(id: string): Objective | undefined {
    return this.objectives.get(id);
  }

  /** Find the objective tied to a given NPC, if any. */
  forNpc(npcId: string): Objective | undefined {
    for (const obj of this.objectives.values()) {
      if (obj.npcId === npcId) return obj;
    }
    return undefined;
  }

  /** All registered objectives in registration order. */
  all(): Objective[] {
    return [...this.objectives.values()];
  }

  /** Whether all dependencies of `objId` are complete in `state`. */
  isAvailable(objId: string, state: ObjectiveState): boolean {
    const obj = this.objectives.get(objId);
    if (!obj) return false;
    return obj.dependsOn.every((dep) => state[dep] != null);
  }

  /** Whether `objId` has been completed in this cycle. */
  isComplete(objId: string, state: ObjectiveState): boolean {
    return state[objId] != null;
  }

  /** Whether this is a first completion (earns reward) vs a replay. */
  earnsReward(objId: string, state: ObjectiveState): boolean {
    return !this.isComplete(objId, state);
  }

  /**
   * Gather inputs for an objective from its completed dependencies' outputs.
   * Returns a merged key-value map.
   */
  gatherInputs(objId: string, state: ObjectiveState): Record<string, string> {
    const obj = this.objectives.get(objId);
    if (!obj) return {};
    const inputs: Record<string, string> = {};
    for (const depId of obj.dependsOn) {
      const dep = state[depId];
      if (dep) Object.assign(inputs, dep.outputs);
    }
    return inputs;
  }

  /**
   * Mark an objective complete and store its outputs. Pure — returns new state.
   */
  complete(
    objId: string,
    state: ObjectiveState,
    npcLines: string[],
    now: Date,
  ): ObjectiveState {
    const obj = this.objectives.get(objId);
    if (!obj) return state;
    return {
      ...state,
      [objId]: {
        completedAt: now.toISOString(),
        outputs: obj.extractOutputs(npcLines),
      },
    };
  }
}
