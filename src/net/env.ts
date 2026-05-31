/**
 * Reads Supabase configuration from Vite env vars. Adapter-level concern.
 *
 * Set these in .env / Vercel to enable cloud features:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY   (public anon key — safe in the client)
 *
 * When absent, the game runs in guest mode (local persistence) with no errors.
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
  configured: boolean;
}

export function supabaseEnv(): SupabaseEnv {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const anonKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  return { url, anonKey, configured: Boolean(url && anonKey) };
}
