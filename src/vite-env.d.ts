/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ADAPTER_PROFILE?: "test" | "local-fakes" | "guest" | "cloud";
  readonly VITE_DEV_TOOLS?: string;
  /** Secret UUID for the invite-only registration page (/register/<uuid>). */
  readonly VITE_REGISTRATION_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
