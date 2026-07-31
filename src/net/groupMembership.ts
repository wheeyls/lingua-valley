/**
 * Group membership — reads "my group id" for the signed-in user.
 *
 * RLS already permits a user to read their own `profiles` row, so this is a
 * plain client-side Supabase read, not a domain port: it's a cloud-only
 * concern (like the leaderboard/checkpoint fetches in main.ts), and guest /
 * local-fakes profiles have no notion of a group at all.
 */

import { getSupabase } from "./supabaseClient.js";

/** The signed-in user's group id, or null if unavailable/not found. */
export async function getMyGroupId(userId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from("profiles")
      .select("group_id")
      .eq("id", userId)
      .maybeSingle();
    return (data as { group_id: string } | null)?.group_id ?? null;
  } catch {
    return null;
  }
}
