/**
 * HttpRewardClient — the server-authoritative RewardGrader. Posts the graded
 * activity to /api/activity-complete with the user's JWT; the server recomputes
 * the economy (same domain functions) and persists, returning the authoritative
 * new state. The client never grants itself resources.
 */

import type { RewardGrader } from "../domain/ports";
import type { ActivityResult, ApplyResult } from "../domain/player";
import { getAccessToken } from "./supabaseClient";

export class HttpRewardClient implements RewardGrader {
  async grant(activity: ActivityResult): Promise<ApplyResult> {
    const token = await getAccessToken();
    const res = await fetch("/api/activity-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ activity }),
    });
    if (!res.ok) throw new Error(`activity-complete failed: ${res.status}`);
    return (await res.json()) as ApplyResult;
  }
}
