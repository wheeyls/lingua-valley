/**
 * Server-side Supabase admin client (service role) + JWT verification.
 * The service role bypasses RLS so the server can perform AUTHORITATIVE writes
 * to player_state / vocab_cards / activity_log. Key is server-only env.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getAdminClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  // Accept either env name; value should be a modern sb_secret_... key
  // (or a legacy service_role JWT). Both bypass RLS via the service_role role.
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Supabase admin env not configured");
  }
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { apikey: secretKey } },
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
