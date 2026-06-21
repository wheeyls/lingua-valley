/**
 * HttpClaimClient — server-authoritative ClaimGateway. Posts the guest's local
 * PlayerState to /api/claim with the user's JWT; the server merges it into the
 * account's authoritative state (same domain `mergeStates`), persists, and
 * returns the merged state. Keeps player_state server-owned.
 */

import type { ClaimGateway } from "../domain/ports";
import type { PlayerState } from "../domain/player";
import { getAccessToken } from "./supabaseClient";

export class HttpClaimClient implements ClaimGateway {
  async claim(guest: PlayerState): Promise<PlayerState> {
    const token = await getAccessToken();
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ guest }),
    });
    if (!res.ok) throw new Error(`claim failed: ${res.status}`);
    return (await res.json()) as PlayerState;
  }
}
