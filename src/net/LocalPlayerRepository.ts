/**
 * LocalPlayerRepository — a DRIVEN ADAPTER implementing PlayerStateRepository
 * over the browser's localStorage. Used for guest play (and as offline fallback).
 *
 * Contains NO game rules — it only serializes/deserializes the domain PlayerState.
 */

import type { PlayerStateRepository } from "../domain/ports";
import type { PlayerState } from "../domain/player";

const KEY_PREFIX = "lingua-valley.player.";

export class LocalPlayerRepository implements PlayerStateRepository {
  constructor(private readonly guestId: string) {}

  private get key(): string {
    return KEY_PREFIX + this.guestId;
  }

  async load(): Promise<PlayerState | null> {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as PlayerState) : null;
    } catch {
      return null;
    }
  }

  async save(state: PlayerState): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      /* storage full / unavailable — ignore for guest play */
    }
  }

  /** Read the raw guest state synchronously (used during account claim). */
  loadSync(): PlayerState | null {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as PlayerState) : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}
