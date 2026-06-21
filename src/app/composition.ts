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

import {
  makeAdapters,
  resolveCloudAdapters,
  type Adapters,
  type AdapterProfile,
} from "./adapters";
import { PlayerService } from "./PlayerService";
import { ClaimService } from "./ClaimService";
import { supabaseEnv } from "../net/env";
import { LocalPlayerRepository } from "../net/LocalPlayerRepository";
import { SupabasePlayerRepository } from "../net/SupabasePlayerRepository";
import { HttpClaimClient } from "../net/HttpClaimClient";
import { getSupabase } from "../net/supabaseClient";
import { getOrCreateGuestId } from "../net/guest";

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
  try {
    return await composeFor(profile);
  } catch (err) {
    // Never let a backend hiccup (e.g. a missing migration) blank the game.
    // Fall back to guest mode so the player can always play.
    console.error(
      `[composeApp] "${profile}" init failed — falling back to guest mode.`,
      err,
    );
    if (profile !== "guest") return composeFor("guest");
    throw err;
  }
}

async function composeFor(profile: AdapterProfile): Promise<ComposedApp> {
  const adapters =
    profile === "cloud" ? await resolveCloudAdapters() : makeAdapters(profile);
  const player = new PlayerService(
    adapters.repo,
    adapters.rewardGrader,
    adapters.clock,
    adapters.playerActions,
  );
  await player.init();

  // On the cloud profile, claim the guest's local progress into the account the
  // first time they sign in, then adopt the merged state.
  if (profile === "cloud") {
    adapters.auth.onChange((user) => {
      if (!user.isGuest) void claimGuestIntoAccount(user.id, player);
    });
  }

  return { adapters, player, profile };
}

/**
 * Merge the local guest save into the freshly signed-in account, then adopt the
 * merged state into the running PlayerService. Uses the domain merge rule via
 * ClaimService. Safe no-op when Supabase isn't available or there's no guest save.
 */
async function claimGuestIntoAccount(
  userId: string,
  player: PlayerService,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const guestId = getOrCreateGuestId();
  const guestRepo = new LocalPlayerRepository(guestId);
  const accountRepo = new SupabasePlayerRepository(sb, userId);

  // Server-authoritative merge: the /api/claim endpoint loads the account
  // state, merges the guest payload, and persists (player_state stays
  // server-owned). The repo is only used to read the account state as a fallback.
  const claim = new ClaimService(accountRepo, new HttpClaimClient());
  const merged = await claim.claim({
    read: () => guestRepo.loadSync(),
    clear: () => guestRepo.clear(),
  });
  player.adopt(merged);
}

export function cloudConfigured(): boolean {
  return supabaseEnv().configured;
}
