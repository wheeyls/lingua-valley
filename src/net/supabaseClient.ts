/**
 * Browser Supabase client (singleton). Adapter-level construction only — built
 * from public env (URL + anon key). Returns null when not configured so the
 * app cleanly falls back to guest mode.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const env = supabaseEnv();
  if (!env.configured) return null;
  client = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** The current access token (JWT) for authenticated API calls, if signed in. */
export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}
