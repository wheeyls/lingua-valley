/**
 * Composition root (client side).
 *
 * The ONE place that selects an adapter profile and constructs the application
 * services. Scenes never new-up adapters — they receive these services.
 *
 * Profile selection:
 *  - ?dev=fakes  or  VITE_ADAPTER_PROFILE=local-fakes  -> in-memory everything
 *    (scriptable multiplayer + grading, advanceable clock). Great for local dev.
 *  - Supabase env configured                            -> "cloud"
 *  - otherwise                                           -> "guest" (local save,
 *    real LLM grading, no multiplayer yet)
 */

import { makeAdapters, type Adapters, type AdapterProfile } from "./adapters";
import { PlayerService } from "./PlayerService";
import { supabaseEnv } from "../net/env";

export interface ComposedApp {
  adapters: Adapters;
  player: PlayerService;
  profile: AdapterProfile;
}

export function chooseProfile(): AdapterProfile {
  // URL flag (browser only).
  if (typeof location !== "undefined") {
    const params = new URLSearchParams(location.search);
    const dev = params.get("dev");
    if (dev === "fakes" || dev === "1") return "local-fakes";
  }
  // Explicit env override.
  const envProfile = import.meta.env.VITE_ADAPTER_PROFILE as
    | AdapterProfile
    | undefined;
  if (envProfile) return envProfile;

  return supabaseEnv().configured ? "cloud" : "guest";
}

/** Build and initialize the application for the chosen profile. */
export async function composeApp(profile = chooseProfile()): Promise<ComposedApp> {
  const adapters = makeAdapters(profile);
  const player = new PlayerService(adapters.repo, adapters.rewardGrader);
  await player.init();
  return { adapters, player, profile };
}

export function cloudConfigured(): boolean {
  return supabaseEnv().configured;
}
