/**
 * NoopPresenceGateway — a PresenceGateway that does nothing. Used when
 * multiplayer is not configured (guest/single-player), so the world code can
 * always depend on the port without null checks.
 */

import type { PresenceGateway, RemotePlayer } from "../domain/ports";

export class NoopPresenceGateway implements PresenceGateway {
  async join(_areaId: string, _self: RemotePlayer): Promise<void> {}
  move(_pos: Pick<RemotePlayer, "x" | "y" | "facing">): void {}
  onPlayers(_listener: (players: RemotePlayer[]) => void): () => void {
    return () => {};
  }
  async leave(): Promise<void> {}
}
