import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminClient, userIdFromAuthHeader } from "./_lib/supabaseAdmin.js";
import {
  mergeStates,
  normalizePlayerState,
  initialPlayerState,
  type PlayerState,
} from "../src/domain/player.js";
import {
  rowsToPlayerState,
  playerStateToRow,
  type ProfileRow,
  type PlayerStateRow,
} from "../src/net/supabaseMappers.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * POST /api/claim  (SERVER-AUTHORITATIVE)
 * Body: { guest: PlayerState }
 * Auth: Bearer <supabase access token>
 *
 * Merges the guest's local progress into the signed-in account using the SAME
 * domain `mergeStates` rule, persists the merged state, and returns it. The
 * guest payload is normalized (never trusted as-is) before merging.
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

    const { guest } = req.body as { guest?: unknown };

    const [profile, state] = await Promise.all([
      admin.from("profiles").select("id,display_name,avatar_color").eq("id", userId).maybeSingle(),
      admin.from("player_state").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const account: PlayerState = state.data
      ? rowsToPlayerState(
          (profile.data as ProfileRow) ?? null,
          state.data as PlayerStateRow,
        )
      : initialPlayerState();

    // No guest payload → nothing to merge; return the account state.
    if (!guest) return res.status(200).json(account);

    // Never trust the guest payload as-is — normalize before merging.
    const guestState = normalizePlayerState(guest);
    const merged = mergeStates(account, guestState);

    await admin.from("player_state").upsert(playerStateToRow(userId, merged));

    return res.status(200).json(merged);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("claim error:", message);
    return res.status(500).json({ error: "Claim failed", detail: message });
  }
}
