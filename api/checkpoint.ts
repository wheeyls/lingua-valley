import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminClient, userIdFromAuthHeader } from "./_lib/supabaseAdmin.js";
import { rowsToPlayerState, type ProfileRow, type PlayerStateRow } from "../src/net/supabaseMappers.js";
import { isCheckpointSunday, checkpointWeek, buildCheckpoint } from "../src/domain/checkpoint.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * GET /api/checkpoint?group=<id>&date=<YYYY-MM-DD>  (auth required)
 * Auth: Bearer <supabase access token>
 *
 * A group's weekly bloom checkpoint. `date` must be a Sunday (else 404). Sums
 * every group member's blooms over the 7 days ending the night before that
 * Sunday and returns the per-member tally + the group total. Reads use the
 * service role so it can see all members' rows (RLS otherwise scopes to self).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const admin = getAdminClient();
    const userId = await userIdFromAuthHeader(req.headers.authorization, admin);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const date = String(req.query.date ?? "");
    const groupId = String(req.query.group ?? "");
    if (!isCheckpointSunday(date)) return res.status(404).json({ error: "No checkpoint on this date" });

    const groupRes = await admin.from("groups").select("id,name").eq("id", groupId).maybeSingle();
    const group = groupRes.data as { id: string; name: string } | null;
    if (!group) return res.status(404).json({ error: "Group not found" });

    const profilesRes = await admin
      .from("profiles")
      .select("id,display_name,avatar_color")
      .eq("group_id", group.id);
    const profiles = (profilesRes.data ?? []) as ProfileRow[];
    const memberIds = profiles.map((p) => p.id);

    const statesRes = memberIds.length
      ? await admin.from("player_state").select("user_id,money,field,inventory,daily").in("user_id", memberIds)
      : { data: [] as PlayerStateRow[] };
    const stateByUser = new Map<string, PlayerStateRow>();
    for (const s of (statesRes.data ?? []) as PlayerStateRow[]) stateByUser.set(s.user_id, s);

    const week = checkpointWeek(date);
    const members = profiles.map((profile) => {
      const state = rowsToPlayerState(profile, stateByUser.get(profile.id) ?? null);
      return { displayName: state.displayName, avatarColor: state.avatarColor, garden: state.field };
    });
    const checkpoint = buildCheckpoint(members, week);

    return res.status(200).json({
      group: { id: group.id, name: group.name },
      date,
      start: week.start,
      end: week.end,
      totalBlooms: checkpoint.totalBlooms,
      rows: checkpoint.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("checkpoint error:", message);
    return res.status(500).json({ error: "Checkpoint failed", detail: message });
  }
}
