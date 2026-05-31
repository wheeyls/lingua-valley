/**
 * SupabasePresenceGateway — PresenceGateway over Supabase Realtime.
 *
 * Uses a presence-enabled channel per area. Our identity + position is tracked
 * via channel.track(); movement updates re-track (throttled by the caller).
 * Other players arrive through presence sync/join/leave events. Ephemeral —
 * positions are not persisted. Translates Realtime payloads ⇄ domain RemotePlayer.
 */

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { PresenceGateway, RemotePlayer } from "../domain/ports";

export class SupabasePresenceGateway implements PresenceGateway {
  private channel: RealtimeChannel | null = null;
  private self: RemotePlayer | null = null;
  private listeners = new Set<(players: RemotePlayer[]) => void>();

  constructor(private readonly sb: SupabaseClient) {}

  async join(areaId: string, self: RemotePlayer): Promise<void> {
    await this.leave();
    const me: RemotePlayer = { ...self };
    this.self = me;

    const channel = this.sb.channel(`presence:area:${areaId}`, {
      config: { presence: { key: self.userId } },
    });

    channel.on("presence", { event: "sync" }, () => this.emitFromState(channel));
    channel.on("presence", { event: "join" }, () => this.emitFromState(channel));
    channel.on("presence", { event: "leave" }, () => this.emitFromState(channel));

    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track(me).then(() => resolve());
        }
      });
    });

    this.channel = channel;
  }

  move(pos: Pick<RemotePlayer, "x" | "y" | "facing">): void {
    if (!this.channel || !this.self) return;
    const updated: RemotePlayer = { ...this.self, ...pos };
    this.self = updated;
    void this.channel.track(updated);
  }

  onPlayers(listener: (players: RemotePlayer[]) => void): () => void {
    this.listeners.add(listener);
    if (this.channel) this.emitFromState(this.channel);
    return () => this.listeners.delete(listener);
  }

  async leave(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.self = null;
  }

  private emitFromState(channel: RealtimeChannel): void {
    const state = channel.presenceState<RemotePlayer>();
    const players: RemotePlayer[] = [];
    for (const [key, metas] of Object.entries(state)) {
      if (key === this.self?.userId) continue;
      const meta = metas[metas.length - 1];
      if (meta) players.push(toRemotePlayer(meta));
    }
    for (const fn of this.listeners) fn(players);
  }
}

function toRemotePlayer(meta: Partial<RemotePlayer>): RemotePlayer {
  return {
    userId: meta.userId ?? "?",
    displayName: meta.displayName ?? "Jugador",
    color: meta.color ?? 0xffffff,
    x: meta.x ?? 0,
    y: meta.y ?? 0,
    facing: meta.facing ?? "down",
  };
}
