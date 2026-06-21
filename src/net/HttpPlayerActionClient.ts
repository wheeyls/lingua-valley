/**
 * HttpPlayerActionClient — server-authoritative PlayerActionGateway. Posts the
 * action to /api/player-action with the user's JWT; the server validates,
 * applies the same domain reducer, persists, and returns the authoritative
 * result. The client never mutates player_state directly.
 */

import type { PlayerActionGateway } from "../domain/ports";
import type { PlayerAction, ActionResult } from "../domain/player";
import { getAccessToken } from "./supabaseClient";

export class HttpPlayerActionClient implements PlayerActionGateway {
  async perform(action: PlayerAction): Promise<ActionResult> {
    const token = await getAccessToken();
    const res = await fetch("/api/player-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error(`player-action failed: ${res.status}`);
    return (await res.json()) as ActionResult;
  }
}
