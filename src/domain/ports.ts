/**
 * PORTS — the interfaces the domain requires from the outside world.
 *
 * The domain depends ONLY on these abstractions. Concrete adapters
 * (Supabase, HTTP, OpenAI, Phaser, Realtime) implement them and are injected at
 * the composition root. The domain never imports a vendor SDK.
 */

import type {
  PlayerState,
  ActivityResult,
  ApplyResult,
  PlayerAction,
  ActionResult,
} from "./player.js";
import type { ConverseRequest, ConverseResponse } from "./conversation.js";

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

/**
 * Performs a non-conversation player action (e.g. buying a train ticket)
 * authoritatively. The server adapter validates + persists; the guest adapter
 * runs the same domain reducer locally. Returns the new authoritative state.
 */
export interface PlayerActionGateway {
  perform(action: PlayerAction): Promise<ActionResult>;
}

/**
 * Merges a guest's local progress into the signed-in account authoritatively.
 * The server adapter loads the account state (service role), runs the domain
 * `mergeStates`, persists, and returns the merged state — keeping player_state
 * server-owned. Returns the merged PlayerState.
 */
export interface ClaimGateway {
  claim(guest: PlayerState): Promise<PlayerState>;
}

/**
 * Produces a graded NPC turn for a player utterance. The real adapter calls the
 * LLM (/api/converse); the fake returns scripted grades. Keeps OpenAI out of
 * gameplay logic and tests.
 */
export interface ConversationGrader {
  gradeTurn(req: ConverseRequest): Promise<ConverseResponse>;
}

/** Identity for the current session. Fake = instant scriptable users. */
export interface AuthUser {
  id: string;
  displayName: string;
  /** True for an anonymous guest (local-only), false for a real account. */
  isGuest: boolean;
}

export interface AuthGateway {
  /** The current user (guest by default). */
  current(): AuthUser;
  /** Sign in with email + password. */
  signIn(email?: string, password?: string): Promise<AuthUser>;
  /** Sign out, returning to guest. */
  signOut(): Promise<void>;
  /** Subscribe to user changes. Returns unsubscribe. */
  onChange(listener: (user: AuthUser) => void): () => void;
  /** Send a password-reset email. Resolves when the email has been dispatched. */
  resetPasswordForEmail(email: string): Promise<void>;
  /** Set a new password for the currently authenticated session (called after
   *  the user clicks the reset link and lands on /reset-password). */
  updatePassword(newPassword: string): Promise<void>;
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
