/**
 * Composition root (client side).
 *
 * This is the ONE place that constructs concrete adapters and injects them into
 * the application/domain. Scenes never new-up adapters.
 *
 * Adapter selection is environment-driven:
 *  - If Supabase env vars are present AND a user is signed in, use the
 *    server-authoritative path (HttpRewardClient + SupabasePlayerRepository).
 *  - Otherwise, use the guest path (LocalRewardGrader + LocalPlayerRepository),
 *    which runs the identical domain reducer locally. The game is fully
 *    playable offline this way.
 */

import { systemClock } from "../domain/ports";
import { objectiveWordIds } from "../content/curriculum";
import { PlayerService } from "./PlayerService";
import { LocalPlayerRepository } from "../net/LocalPlayerRepository";
import { LocalRewardGrader } from "../net/LocalRewardGrader";
import { getOrCreateGuestId } from "../net/guest";
import { supabaseEnv } from "../net/env";

export interface ComposedApp {
  player: PlayerService;
  mode: "guest" | "cloud";
}

/**
 * Build the guest (local) application. Always available, no backend required.
 */
export function composeGuestApp(): ComposedApp {
  const guestId = getOrCreateGuestId();
  const repo = new LocalPlayerRepository(guestId);
  const grader = new LocalRewardGrader(repo, systemClock, objectiveWordIds);
  return { player: new PlayerService(repo, grader), mode: "guest" };
}

/**
 * Whether cloud features (auth, sync, multiplayer) are configured. Used by the
 * UI to show/hide sign-in. The actual cloud adapters are wired only after a
 * successful sign-in (see net/auth.ts), keeping guest play the default.
 */
export function cloudConfigured(): boolean {
  return supabaseEnv().configured;
}
