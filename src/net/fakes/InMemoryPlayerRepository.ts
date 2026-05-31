/**
 * InMemoryPlayerRepository — a PlayerStateRepository with no persistence layer.
 * Ideal for tests and ephemeral local-fakes play. Holds one state in memory.
 */

import type { PlayerStateRepository } from "../../domain/ports";
import type { PlayerState } from "../../domain/player";

export class InMemoryPlayerRepository implements PlayerStateRepository {
  private state: PlayerState | null;

  constructor(initial: PlayerState | null = null) {
    this.state = initial ? structuredCloneSafe(initial) : null;
  }

  async load(): Promise<PlayerState | null> {
    return this.state ? structuredCloneSafe(this.state) : null;
  }

  async save(state: PlayerState): Promise<void> {
    this.state = structuredCloneSafe(state);
  }

  /** Test helper: peek without async. */
  peek(): PlayerState | null {
    return this.state ? structuredCloneSafe(this.state) : null;
  }
}

/** Deep clone that works in Node + browser, avoiding shared references. */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
