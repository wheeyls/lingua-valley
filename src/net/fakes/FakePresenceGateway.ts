/**
 * FakePresenceGateway — multiplayer presence with NO websockets.
 *
 * A shared in-process "PresenceBus" stands in for the realtime server. Multiple
 * FakePresenceGateway instances sharing one bus see each other join/move/leave,
 * exactly as Supabase Realtime would deliver — so we can test the shared world
 * and develop avatars locally with zero networking.
 *
 * For solo dev, `spawnGhost` injects scripted players that wander around.
 */

import type { PresenceGateway, RemotePlayer } from "../../domain/ports";

type BusListener = () => void;

/** The shared "server": tracks who is present per area channel. */
export class PresenceBus {
  /** areaId -> (userId -> RemotePlayer). */
  private channels = new Map<string, Map<string, RemotePlayer>>();
  private listeners = new Map<string, Set<BusListener>>();

  private chan(areaId: string): Map<string, RemotePlayer> {
    let c = this.channels.get(areaId);
    if (!c) {
      c = new Map();
      this.channels.set(areaId, c);
    }
    return c;
  }

  set(areaId: string, player: RemotePlayer): void {
    this.chan(areaId).set(player.userId, player);
    this.notify(areaId);
  }

  remove(areaId: string, userId: string): void {
    this.chan(areaId).delete(userId);
    this.notify(areaId);
  }

  players(areaId: string): RemotePlayer[] {
    return [...this.chan(areaId).values()];
  }

  subscribe(areaId: string, fn: BusListener): () => void {
    let set = this.listeners.get(areaId);
    if (!set) {
      set = new Set();
      this.listeners.set(areaId, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  private notify(areaId: string): void {
    this.listeners.get(areaId)?.forEach((fn) => fn());
  }
}

/** A module-level default bus so separate gateways connect by default. */
export const defaultPresenceBus = new PresenceBus();

export class FakePresenceGateway implements PresenceGateway {
  private areaId: string | null = null;
  private self: RemotePlayer | null = null;
  private unsubBus: (() => void) | null = null;
  private ghostTimers: ReturnType<typeof setInterval>[] = [];

  constructor(private readonly bus: PresenceBus = defaultPresenceBus) {}

  async join(areaId: string, self: RemotePlayer): Promise<void> {
    await this.leave();
    this.areaId = areaId;
    this.self = { ...self };
    this.bus.set(areaId, this.self);
  }

  move(pos: Pick<RemotePlayer, "x" | "y" | "facing">): void {
    if (!this.areaId || !this.self) return;
    this.self = { ...this.self, ...pos };
    this.bus.set(this.areaId, this.self);
  }

  onPlayers(listener: (players: RemotePlayer[]) => void): () => void {
    if (!this.areaId) return () => {};
    const areaId = this.areaId;
    const emit = () => {
      const others = this.bus
        .players(areaId)
        .filter((p) => p.userId !== this.self?.userId);
      listener(others);
    };
    emit();
    return this.bus.subscribe(areaId, emit);
  }

  async leave(): Promise<void> {
    this.ghostTimers.forEach(clearInterval);
    this.ghostTimers = [];
    if (this.areaId && this.self) {
      this.bus.remove(this.areaId, this.self.userId);
    }
    this.unsubBus?.();
    this.unsubBus = null;
    this.areaId = null;
    this.self = null;
  }

  /**
   * Dev/test helper: spawn a scripted ghost that wanders within bounds. Returns
   * a stop function. Uses the bus directly, so others "see" the ghost move.
   */
  spawnGhost(
    areaId: string,
    ghost: RemotePlayer,
    opts: { bounds?: { x: number; y: number; w: number; h: number }; intervalMs?: number } = {},
  ): () => void {
    const bounds = opts.bounds ?? { x: 0, y: 0, w: 600, h: 500 };
    let pos = { ...ghost };
    this.bus.set(areaId, pos);
    const timer = setInterval(() => {
      const dx = (Math.random() - 0.5) * 40;
      const dy = (Math.random() - 0.5) * 40;
      pos = {
        ...pos,
        x: clamp(pos.x + dx, bounds.x, bounds.x + bounds.w),
        y: clamp(pos.y + dy, bounds.y, bounds.y + bounds.h),
        facing: dx < 0 ? "left" : dx > 0 ? "right" : pos.facing,
      };
      this.bus.set(areaId, pos);
    }, opts.intervalMs ?? 700);
    this.ghostTimers.push(timer);
    return () => {
      clearInterval(timer);
      this.bus.remove(areaId, ghost.userId);
    };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
