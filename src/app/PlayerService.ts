/**
 * PlayerService — application layer that scenes interact with.
 *
 * It owns the current in-memory PlayerState, notifies subscribers (e.g. the
 * HUD) on change, and delegates the authoritative economy step to the injected
 * RewardGrader port (Local for guests, HTTP for signed-in players).
 *
 * No game rules live here — those are in the domain. This is wiring + caching.
 */

import type {
  PlayerStateRepository,
  RewardGrader,
  PlayerActionGateway,
  Clock,
} from "../domain/ports";
import { systemClock } from "../domain/ports";
import {
  initialPlayerState,
  settleDailyState,
  applyActivity,
  applyPlayerAction,
  type PlayerState,
  type ActivityResult,
  type ApplyResult,
  type PlayerAction,
  type ActionResult,
} from "../domain/player";

type Listener = (state: PlayerState) => void;

export class PlayerService {
  private state: PlayerState = initialPlayerState();
  private listeners = new Set<Listener>();

  constructor(
    private readonly repo: PlayerStateRepository,
    private readonly grader: RewardGrader,
    private readonly clock: Clock = systemClock,
    private readonly actions?: PlayerActionGateway,
  ) {}

  /** Load persisted state (or initialize a fresh one) and notify. */
  async init(): Promise<void> {
    let loaded: PlayerState | null = null;
    try {
      loaded = await this.repo.load();
    } catch (err) {
      // A load failure (e.g. schema drift) must not crash the game — start fresh.
      console.error("[PlayerService] load failed; starting fresh.", err);
    }
    // Settle time-based state (relationship decay for skipped days, reset the
    // daily activity counter on a new day) the moment we load.
    this.state = settleDailyState(
      loaded ?? initialPlayerState(),
      this.clock.now(),
    );
    // Persist if brand-new OR if settling changed anything (e.g. decay applied).
    if (!loaded || this.state !== (loaded ?? null)) {
      try {
        await this.repo.save(this.state);
      } catch (err) {
        console.error("[PlayerService] initial save failed (continuing).", err);
      }
    }
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

  /** Apply a pure state transform (e.g. unlockTown) and persist if it changed. */
  async update(transform: (state: PlayerState) => PlayerState): Promise<PlayerState> {
    const next = transform(this.state);
    if (next !== this.state) {
      this.state = next;
      await this.repo.save(this.state);
      this.emit();
    }
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  /**
   * Complete a graded activity. Routes through the RewardGrader port (which is
   * server-authoritative when signed in). If that fails (network/auth/server
   * hiccup) we MUST NOT break the conversation — fall back to applying the same
   * domain reducer locally so the player still gets their reward and gameplay
   * continues. The server stays the source of truth when it's reachable.
   */
  async completeActivity(activity: ActivityResult): Promise<ApplyResult> {
    // Roll over to a new day if the cooldown elapsed since the last activity, so
    // the daily reward/growth gate resets mid-session (not only on reload).
    const settled = settleDailyState(this.state, this.clock.now());
    if (settled !== this.state) {
      this.state = settled;
      await this.repo.save(this.state).catch(() => {});
    }

    let result: ApplyResult;
    try {
      result = await this.grader.grant(activity);
    } catch (err) {
      console.error("[PlayerService] reward grant failed; applying locally.", err);
      result = applyActivity(this.state, activity, this.clock.now());
      // Best-effort local persist (also non-fatal).
      this.repo.save(result.state).catch(() => {});
    }
    this.state = result.state;
    this.emit();
    return result;
  }

  /**
   * Perform a non-conversation action (e.g. buy a ticket) authoritatively. Like
   * completeActivity, routes through the gateway when present (server-auth when
   * signed in) and falls back to the local reducer so gameplay never breaks.
   */
  async performAction(action: PlayerAction): Promise<ActionResult> {
    let result: ActionResult;
    try {
      if (!this.actions) throw new Error("no action gateway");
      result = await this.actions.perform(action);
    } catch (err) {
      console.error("[PlayerService] action failed; applying locally.", err);
      result = applyPlayerAction(this.state, action);
      if (result.ok) this.repo.save(result.state).catch(() => {});
    }
    if (result.ok) {
      this.state = result.state;
      this.emit();
    }
    return result;
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}
