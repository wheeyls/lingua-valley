/**
 * LocalPlayerActionGateway — guest/offline adapter for PlayerActionGateway.
 * Runs the SAME domain reducer (`applyPlayerAction`) the server uses, then
 * persists via the injected repository. No game rules of its own.
 */

import type { PlayerActionGateway, PlayerStateRepository } from "../domain/ports";
import {
  applyPlayerAction,
  initialPlayerState,
  type PlayerAction,
} from "../domain/player";

export class LocalPlayerActionGateway implements PlayerActionGateway {
  constructor(private readonly repo: PlayerStateRepository) {}

  async perform(action: PlayerAction) {
    const prev = (await this.repo.load()) ?? initialPlayerState();
    const result = applyPlayerAction(prev, action);
    if (result.ok) await this.repo.save(result.state);
    return result;
  }
}
