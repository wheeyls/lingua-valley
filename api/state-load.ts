import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminClient, userIdFromAuthHeader } from "./_lib/supabaseAdmin.js";
import { initialPlayerState } from "../src/domain/player.js";
import {
  rowsToPlayerState,
  type ProfileRow,
  type PlayerStateRow,
  type VocabCardRow,
} from "../src/net/supabaseMappers.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * GET/POST /api/state/load
 * Auth: Bearer <supabase access token>
 * Returns the authoritative PlayerState for the signed-in user (initial if new).
 *
 * Reads here use the service role for a single round-trip; RLS-scoped client
 * reads also work, but this keeps the load path consistent with the grant path.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const admin = getAdminClient();
    const userId = await userIdFromAuthHeader(req.headers.authorization, admin);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const [profile, state, cards] = await Promise.all([
      admin.from("profiles").select("id,display_name,avatar_color").eq("id", userId).maybeSingle(),
      admin.from("player_state").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("vocab_cards").select("*").eq("user_id", userId),
    ]);

    const playerState = state.data
      ? rowsToPlayerState(
          (profile.data as ProfileRow) ?? null,
          state.data as PlayerStateRow,
          (cards.data as VocabCardRow[]) ?? [],
        )
      : initialPlayerState();

    return res.status(200).json(playerState);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("state/load error:", message);
    return res.status(500).json({ error: "Load failed", detail: message });
  }
}
