import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminClient, userIdFromAuthHeader } from "./_lib/supabaseAdmin.js";
import {
  applyPlayerAction,
  initialPlayerState,
  type PlayerAction,
} from "../src/domain/player.js";
import {
  rowsToPlayerState,
  playerStateToRow,
  type ProfileRow,
  type PlayerStateRow,
} from "../src/net/supabaseMappers.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * POST /api/player-action  (SERVER-AUTHORITATIVE)
 * Body: { action: PlayerAction }
 * Auth: Bearer <supabase access token>
 *
 * Validates + applies a non-conversation action (e.g. buy-ticket) using the
 * SAME domain reducer the client uses, persists the new state, and returns the
 * authoritative ActionResult. The client cannot fabricate purchases.
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

    const { action } = req.body as { action?: PlayerAction };
    if (!action?.type) return res.status(400).json({ error: "Missing action" });

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

    const result = applyPlayerAction(prev, action);
    if (result.ok) {
      await admin.from("player_state").upsert(playerStateToRow(userId, result.state));
    }

    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("player-action error:", message);
    return res.status(500).json({ error: "Action failed", detail: message });
  }
}
