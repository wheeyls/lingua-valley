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
import { objectiveWordIds } from "../content/curriculum";

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
      const rewardGrader = new LocalRewardGrader(repo, clock, objectiveWordIds);
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
      const rewardGrader = new LocalRewardGrader(repo, clock, objectiveWordIds);
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
      // Real services wired here at the last second. Until the Supabase
      // adapters are implemented, fall back to the guest path so the game
      // always runs. (SupabasePlayerRepository/Auth/Presence + HttpRewardClient
      // will replace these lines.)
      const clock = systemClock;
      const repo = new LocalPlayerRepository(getOrCreateGuestIdSafe());
      const rewardGrader = new LocalRewardGrader(repo, clock, objectiveWordIds);
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

/** Guest id in browser; stable constant under Node/tests (no localStorage). */
function getOrCreateGuestIdSafe(): string {
  try {
    return getOrCreateGuestId();
  } catch {
    return "guest_node";
  }
}
