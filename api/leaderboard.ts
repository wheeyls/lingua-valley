import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminClient, userIdFromAuthHeader } from "./_lib/supabaseAdmin.js";
import { rowsToPlayerState, type ProfileRow, type PlayerStateRow } from "../src/net/supabaseMappers.js";
import { toLeaderboardRow, rankLeaderboard } from "../src/domain/leaderboard.js";
import { CURRENT_AREA } from "../src/content/world.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * GET /api/leaderboard  (auth required — any signed-in user)
 * Auth: Bearer <supabase access token>
 *
 * Returns every player's status (display name, money, crop growth, ticket,
 * today's progress, streak, last active), ranked by overall progress. Read uses
 * the service role so it can see all rows (RLS otherwise scopes to self).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const admin = getAdminClient();
    // Require a valid signed-in user (don't expose the board publicly).
    const userId = await userIdFromAuthHeader(req.headers.authorization, admin);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const [profiles, states, activity] = await Promise.all([
      admin.from("profiles").select("id,display_name,avatar_color"),
      admin.from("player_state").select("user_id,money,field,inventory,daily"),
      admin.from("activity_log").select("user_id,created_at"),
    ]);

    const profileById = new Map<string, ProfileRow>();
    for (const p of (profiles.data ?? []) as ProfileRow[]) profileById.set(p.id, p);

    const stateByUser = new Map<string, PlayerStateRow>();
    for (const s of (states.data ?? []) as PlayerStateRow[]) stateByUser.set(s.user_id, s);

    // Most-recent activity timestamp per user.
    const lastActive = new Map<string, string>();
    for (const a of (activity.data ?? []) as { user_id: string; created_at: string }[]) {
      const cur = lastActive.get(a.user_id);
      if (!cur || a.created_at > cur) lastActive.set(a.user_id, a.created_at);
    }

    // How many conversations a full day offers in the current campaign.
    const totalToday = CURRENT_AREA.locations.reduce((n, loc) => n + loc.npcIds.length, 0);

    const rows = [...profileById.values()].map((profile) => {
      const state = rowsToPlayerState(profile, stateByUser.get(profile.id) ?? null);
      return toLeaderboardRow(state, {
        totalToday,
        nextAreaId: CURRENT_AREA.nextAreaId,
        lastActive: lastActive.get(profile.id) ?? "",
      });
    });

    return res.status(200).json({ rows: rankLeaderboard(rows) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("leaderboard error:", message);
    return res.status(500).json({ error: "Leaderboard failed", detail: message });
  }
}
