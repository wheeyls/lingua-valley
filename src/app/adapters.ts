/**
 * makeAdapters(profile) — the composition factory.
 *
 * The ONE place that picks concrete adapters per environment "profile". Tests
 * pass "test"; local dev can run "local-fakes" (in-memory multiplayer + scripted
 * grading) or "guest" (localStorage, real LLM); prod uses "cloud" when Supabase
 * is configured. Real realtime/server adapters slot in here at the last second.
 */

import { systemClock, type Clock } from "../domain/ports";
import type {
  PlayerStateRepository,
  RewardGrader,
  ConversationGrader,
  PresenceGateway,
  AuthGateway,
} from "../domain/ports";

import { LocalPlayerRepository } from "../net/LocalPlayerRepository";
import { LocalRewardGrader } from "../net/LocalRewardGrader";
import { HttpConversationGrader } from "../net/HttpConversationGrader";
import { getOrCreateGuestId } from "../net/guest";

import { FakeClock } from "../net/fakes/FakeClock";
import { InMemoryPlayerRepository } from "../net/fakes/InMemoryPlayerRepository";
import { FakeConversationGrader } from "../net/fakes/FakeConversationGrader";
import { FakePresenceGateway, PresenceBus } from "../net/fakes/FakePresenceGateway";
import { FakeAuthGateway } from "../net/fakes/FakeAuthGateway";
import { NoopPresenceGateway } from "../net/NoopPresenceGateway";
import { getSupabase } from "../net/supabaseClient";
import { SupabasePlayerRepository } from "../net/SupabasePlayerRepository";
import { SupabaseAuthGateway } from "../net/SupabaseAuthGateway";
import { SupabasePresenceGateway } from "../net/SupabasePresenceGateway";
import { HttpRewardClient } from "../net/HttpRewardClient";

export type AdapterProfile = "test" | "local-fakes" | "guest" | "cloud";

export interface Adapters {
  profile: AdapterProfile;
  clock: Clock;
  repo: PlayerStateRepository;
  rewardGrader: RewardGrader;
  conversationGrader: ConversationGrader;
  presence: PresenceGateway;
  auth: AuthGateway;
  /** Exposed for the dev harness when present (fakes only). */
  fakes?: {
    clock: FakeClock;
    grader: FakeConversationGrader;
    presence: FakePresenceGateway;
    bus: PresenceBus;
    auth: FakeAuthGateway;
  };
}

export function makeAdapters(profile: AdapterProfile): Adapters {
  switch (profile) {
    case "test":
    case "local-fakes": {
      // Fully in-memory: deterministic, no network, scriptable multiplayer.
      const clock = new FakeClock();
      const repo = new InMemoryPlayerRepository();
      const grader = new FakeConversationGrader();
      const bus = new PresenceBus();
      const presence = new FakePresenceGateway(bus);
      const auth = new FakeAuthGateway(getOrCreateGuestIdSafe());
      const rewardGrader = new LocalRewardGrader(repo, clock);
      return {
        profile,
        clock,
        repo,
        rewardGrader,
        conversationGrader: grader,
        presence,
        auth,
        fakes: { clock, grader, presence, bus, auth },
      };
    }

    case "guest": {
      // Local persistence + REAL LLM grading, but no multiplayer/cloud yet.
      const clock = systemClock;
      const repo = new LocalPlayerRepository(getOrCreateGuestIdSafe());
      const rewardGrader = new LocalRewardGrader(repo, clock);
      return {
        profile,
        clock,
        repo,
        rewardGrader,
        conversationGrader: new HttpConversationGrader(),
        presence: new NoopPresenceGateway(),
        auth: new FakeAuthGateway(getOrCreateGuestIdSafe()),
      };
    }

    case "cloud": {
      // Synchronous skeleton; composeApp upgrades to real Supabase adapters once
      // the session is known (see resolveCloudAdapters). If Supabase isn't
      // actually configured, this is just the guest path.
      const clock = systemClock;
      const repo = new LocalPlayerRepository(getOrCreateGuestIdSafe());
      const rewardGrader = new LocalRewardGrader(repo, clock);
      return {
        profile,
        clock,
        repo,
        rewardGrader,
        conversationGrader: new HttpConversationGrader(),
        presence: new NoopPresenceGateway(),
        auth: new FakeAuthGateway(getOrCreateGuestIdSafe()),
      };
    }
  }
}

/**
 * Resolve real cloud adapters once the Supabase session is known.
 *  - Signed in  -> SupabasePlayerRepository + HttpRewardClient (authoritative)
 *                  + SupabasePresenceGateway + SupabaseAuthGateway.
 *  - Signed out -> guest path (local save) but with real SupabaseAuthGateway so
 *                  the player can sign in; presence stays noop until signed in.
 * Used by composeApp; kept async + out of the sync factory so tests stay pure.
 */
export async function resolveCloudAdapters(): Promise<Adapters> {
  const sb = getSupabase();
  const guestId = getOrCreateGuestIdSafe();
  const clock = systemClock;

  if (!sb) {
    // Supabase not configured after all — behave as guest.
    return makeAdapters("guest");
  }

  const { data } = await sb.auth.getSession();
  const userId = data.session?.user?.id ?? null;
  const auth = new SupabaseAuthGateway(sb, guestId);
  const conversationGrader = new HttpConversationGrader();

  if (userId) {
    const repo = new SupabasePlayerRepository(sb, userId);
    return {
      profile: "cloud",
      clock,
      repo,
      rewardGrader: new HttpRewardClient(),
      conversationGrader,
      presence: new SupabasePresenceGateway(sb),
      auth,
    };
  }

  // Signed out: local guest save + real auth so sign-in is available.
  const repo = new LocalPlayerRepository(guestId);
  return {
    profile: "cloud",
    clock,
    repo,
    rewardGrader: new LocalRewardGrader(repo, clock),
    conversationGrader,
    presence: new NoopPresenceGateway(),
    auth,
  };
}

/** Guest id in browser; stable constant under Node/tests (no localStorage). */
function getOrCreateGuestIdSafe(): string {
  try {
    return getOrCreateGuestId();
  } catch {
    return "guest_node";
  }
}
