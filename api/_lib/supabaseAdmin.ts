/**
 * Server-side Supabase admin client (service role) + JWT verification.
 * The service role bypasses RLS so the server can perform AUTHORITATIVE writes
 * to player_state / vocab_cards / activity_log. Key is server-only env.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getAdminClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin env not configured");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Verify the bearer JWT from the request and return the user id, or null.
 * Uses the admin client's getUser, which validates the token signature.
 */
export async function userIdFromAuthHeader(
  authHeader: string | undefined,
  admin: SupabaseClient,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
