/**
 * PlayerService — application layer that scenes interact with.
 *
 * It owns the current in-memory PlayerState, notifies subscribers (e.g. the
 * HUD) on change, and delegates the authoritative economy step to the injected
 * RewardGrader port (Local for guests, HTTP for signed-in players).
 *
 * No game rules live here — those are in the domain. This is wiring + caching.
 */

import type { PlayerStateRepository, RewardGrader } from "../domain/ports";
import {
  initialPlayerState,
  type PlayerState,
  type ActivityResult,
  type ApplyResult,
} from "../domain/player";

type Listener = (state: PlayerState) => void;

export class PlayerService {
  private state: PlayerState = initialPlayerState();
  private listeners = new Set<Listener>();

  constructor(
    private readonly repo: PlayerStateRepository,
    private readonly grader: RewardGrader,
  ) {}

  /** Load persisted state (or initialize a fresh one) and notify. */
  async init(): Promise<void> {
    const loaded = await this.repo.load();
    this.state = loaded ?? initialPlayerState();
    if (!loaded) await this.repo.save(this.state);
    this.emit();
  }

  getState(): PlayerState {
    return this.state;
  }

  /** Replace the current state (e.g. after a guest→account claim) and notify. */
  adopt(state: PlayerState): void {
    this.state = state;
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  /**
   * Complete a graded activity. Routes through the RewardGrader port (which is
   * server-authoritative when signed in), then adopts the returned state.
   */
  async completeActivity(activity: ActivityResult): Promise<ApplyResult> {
    const result = await this.grader.grant(activity);
    this.state = result.state;
    this.emit();
    return result;
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}
