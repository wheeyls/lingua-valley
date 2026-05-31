/**
 * PORTS — the interfaces the domain requires from the outside world.
 *
 * The domain depends ONLY on these abstractions. Concrete adapters
 * (Supabase, HTTP, OpenAI, Phaser, Realtime) implement them and are injected at
 * the composition root. The domain never imports a vendor SDK.
 */

import type { PlayerState, ActivityResult, ApplyResult } from "./player";

/** Time source, so domain logic stays deterministic and testable. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

/** Stable id generation (guest ids, etc.). */
export interface IdGenerator {
  newId(): string;
}

/** Loads/saves the player's durable state. Implemented by Supabase / local. */
export interface PlayerStateRepository {
  /** Load the current player's state, or null if none exists yet. */
  load(): Promise<PlayerState | null>;
  /** Persist the full player state. */
  save(state: PlayerState): Promise<void>;
}

/**
 * Grants rewards for a completed activity. The server-authoritative adapter
 * recomputes the economy from the raw grade and persists; the guest adapter
 * runs the same domain reducer locally. Either way the domain calls this port
 * and receives the new authoritative state.
 */
export interface RewardGrader {
  grant(activity: ActivityResult): Promise<ApplyResult>;
}

/** A remote player as the domain understands them (no transport details). */
export interface RemotePlayer {
  userId: string;
  displayName: string;
  color: number;
  x: number;
  y: number;
  facing: "up" | "down" | "left" | "right";
}

/** Realtime presence/movement for the shared world. */
export interface PresenceGateway {
  /** Join an area channel, announcing our identity + position. */
  join(areaId: string, self: RemotePlayer): Promise<void>;
  /** Broadcast our latest movement. */
  move(pos: Pick<RemotePlayer, "x" | "y" | "facing">): void;
  /** Subscribe to the set of other players present. Returns an unsubscribe fn. */
  onPlayers(listener: (players: RemotePlayer[]) => void): () => void;
  /** Leave the current channel. */
  leave(): Promise<void>;
}
