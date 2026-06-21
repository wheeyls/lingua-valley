/**
 * ClaimService — application-layer orchestration for "claiming" a guest's local
 * progress into a freshly signed-in account.
 *
 * The MERGE RULE lives in the domain (`mergeStates`). This service only wires
 * ports together. Two paths:
 *   - with a ClaimGateway (cloud): the SERVER merges + persists authoritatively
 *     (player_state stays server-owned, RLS strict).
 *   - without one (guest/fakes): merge locally and save via the repo.
 */

import type { ClaimGateway, PlayerStateRepository } from "../domain/ports";
import { mergeStates, initialPlayerState, type PlayerState } from "../domain/player";

export interface GuestSource {
  /** The guest's locally-saved state, or null if none. */
  read(): PlayerState | null;
  /** Remove the guest save after a successful claim. */
  clear(): void;
}

export class ClaimService {
  constructor(
    private readonly accountRepo: PlayerStateRepository,
    private readonly gateway?: ClaimGateway,
  ) {}

  /**
   * Merge any guest progress into the account and return the merged state.
   * If there's no guest progress, returns the account state unchanged (or a
   * fresh state when the account is brand new).
   */
  async claim(guest: GuestSource): Promise<PlayerState> {
    const guestState = guest.read();

    // Server-authoritative path: let the server load + merge + persist.
    if (this.gateway) {
      const merged = guestState
        ? await this.gateway.claim(guestState)
        : (await this.accountRepo.load()) ?? initialPlayerState();
      if (guestState) guest.clear();
      return merged;
    }

    // Local path (guest/fakes): merge here and save via the repo.
    const accountState = (await this.accountRepo.load()) ?? initialPlayerState();
    if (!guestState) return accountState;
    const merged = mergeStates(accountState, guestState);
    await this.accountRepo.save(merged);
    guest.clear();
    return merged;
  }
}
