import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminClient, userIdFromAuthHeader } from "./_lib/supabaseAdmin.js";
import { applyActivity, initialPlayerState, type ActivityResult } from "../src/domain/player.js";
import {
  rowsToPlayerState,
  playerStateToRow,
  type ProfileRow,
  type PlayerStateRow,
} from "../src/net/supabaseMappers.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * POST /api/activity/complete  (SERVER-AUTHORITATIVE)
 * Body: { activity: ActivityResult }
 * Auth: Bearer <supabase access token>
 *
 * Recomputes the economy from the RAW grade using the SAME domain reducer the
 * client uses, persists the new state + cards, logs the activity, and returns
 * the authoritative ApplyResult. The client cannot fabricate rewards.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const admin = getAdminClient();
    const userId = await userIdFromAuthHeader(req.headers.authorization, admin);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { activity } = req.body as { activity?: ActivityResult };
    if (!activity?.objectiveId) return res.status(400).json({ error: "Missing activity" });

    // Load current authoritative state.
    const [profile, state] = await Promise.all([
      admin.from("profiles").select("id,display_name,avatar_color").eq("id", userId).maybeSingle(),
      admin.from("player_state").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const prev = state.data
      ? rowsToPlayerState(
          (profile.data as ProfileRow) ?? null,
          state.data as PlayerStateRow,
        )
      : initialPlayerState();

    // THE authoritative economy step — identical domain logic to the client.
    const result = applyActivity(prev, activity, new Date());
    const next = result.state;

    // Persist new state.
    await admin.from("player_state").upsert(playerStateToRow(userId, next));

    // Audit log (also powers leaderboards later).
    await admin.from("activity_log").insert({
      user_id: userId,
      npc_id: null,
      objective_id: activity.objectiveId,
      level: activity.level,
      communication: activity.communication,
      accuracy: activity.accuracy,
      quality: result.reward.quality,
      // Money only comes from selling at the store now (not conversations).
      money_awarded: result.soldValue,
    });

    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("activity/complete error:", message);
    return res.status(500).json({ error: "Grant failed", detail: message });
  }
}
