/**
 * Full gameplay scenario tests — driven entirely against FAKE adapters.
 * No OpenAI, no Supabase, no websockets, no waiting on real time. This proves
 * the game loop end-to-end and is the safety net for all future changes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { makeAdapters, type Adapters } from "../adapters";
import { PlayerService } from "../PlayerService";
import { ConversationSession } from "../ConversationSession";
import { objectiveById } from "../../content/curriculum";
import type { RemotePlayer } from "../../domain/ports";

function sessionFor(adapters: Adapters, player: PlayerService, objectiveId: string) {
  const obj = objectiveById(objectiveId)!;
  return new ConversationSession(
    {
      npcId: "rosa",
      level: obj.level,
      objectiveId: obj.id,
      canDo: obj.canDo,
      vocab: obj.vocab.map((v) => ({ es: v.es, en: v.en })),
      skill: "speaking",
    },
    adapters.conversationGrader,
    player,
  );
}

describe("single graded conversation turn", () => {
  let adapters: Adapters;
  let player: PlayerService;

  beforeEach(async () => {
    adapters = makeAdapters("test");
    player = new PlayerService(adapters.repo, adapters.rewardGrader);
    await player.init();
  });

  it("awards pesos + skill and advances a vocab card on a good turn", async () => {
    adapters.fakes!.grader.enqueue({
      communication: 0.9,
      accuracy: 0.85,
      objectiveMet: false,
      conversationComplete: false,
    });
    const s = sessionFor(adapters, player, "a1.greetings");
    s.begin("¡Hola! ¿Cómo estás?");
    const outcome = await s.submit("Hola, buenos días.");

    expect(outcome.applied.reward!.pesos).toBeGreaterThan(0);
    expect(player.getState().pesos).toBe(outcome.applied.reward!.pesos);
    expect(player.getState().skills.speaking).toBeGreaterThan(0);
    const firstWord = objectiveById("a1.greetings")!.vocab[0].es;
    expect(player.getState().cards[firstWord]).toBeDefined();
    expect(outcome.mastered).toBe(false); // one turn can't mature the words
  });

  it("pays nothing for a poor turn but still spends focus", async () => {
    adapters.fakes!.grader.enqueue({ communication: 0.3, accuracy: 0.3 });
    const s = sessionFor(adapters, player, "a1.greetings");
    s.begin("¡Hola!");
    const outcome = await s.submit("uhh no sé");
    expect(outcome.applied.reward!.pesos).toBe(0);
    expect(player.getState().focus).toBeLessThan(100);
  });
});

describe("mastery over multiple days (deterministic clock)", () => {
  it("masters an objective once words mature, opening progression", async () => {
    const adapters = makeAdapters("test");
    const player = new PlayerService(adapters.repo, adapters.rewardGrader);
    await player.init();

    // Always grade as a strong pass that meets the objective.
    adapters.fakes!.grader.setDefault({
      communication: 0.95,
      accuracy: 0.9,
      objectiveMet: true,
      conversationComplete: false,
    });

    let mastered = false;
    // Practice once per day across several days; the clock drives SRS maturation.
    for (let day = 0; day < 8 && !mastered; day++) {
      const s = sessionFor(adapters, player, "a1.greetings");
      s.begin("¡Hola!");
      const outcome = await s.submit("Hola, buenos días, ¿cómo estás?");
      mastered = outcome.mastered;
      adapters.fakes!.clock.advanceDays(1); // next day -> focus regens, cards due
    }

    expect(mastered).toBe(true);
    expect(player.getState().masteredObjectiveIds).toContain("a1.greetings");
  });
});

describe("focus daily budget", () => {
  it("blocks activities when focus runs out, then refills next day", async () => {
    const adapters = makeAdapters("test");
    const player = new PlayerService(adapters.repo, adapters.rewardGrader);
    await player.init();
    adapters.fakes!.grader.setDefault({ communication: 0.8, accuracy: 0.8 });

    // FOCUS_MAX=100, cost=5 -> 20 activities, then blocked.
    let blocked = 0;
    for (let i = 0; i < 21; i++) {
      const s = sessionFor(adapters, player, "a1.greetings");
      s.begin("¡Hola!");
      const outcome = await s.submit("Hola.");
      if (outcome.applied.blockedReason === "insufficient-focus") blocked++;
    }
    expect(blocked).toBe(1);
    expect(player.getState().focus).toBe(0);

    // New day refills.
    adapters.fakes!.clock.advanceDays(1);
    const s = sessionFor(adapters, player, "a1.greetings");
    s.begin("¡Hola!");
    const outcome = await s.submit("Hola.");
    expect(outcome.applied.blockedReason).toBeUndefined();
    expect(player.getState().focus).toBe(95);
  });
});

describe("multiplayer presence (fake in-process bus)", () => {
  it("two players in the same area see each other; movement propagates; leave removes", async () => {
    const adapters = makeAdapters("test");
    const bus = adapters.fakes!.bus;

    const alice: RemotePlayer = { userId: "a", displayName: "Alice", color: 1, x: 10, y: 10, facing: "down" };
    const bob: RemotePlayer = { userId: "b", displayName: "Bob", color: 2, x: 50, y: 50, facing: "up" };

    const { FakePresenceGateway } = await import("../../net/fakes/FakePresenceGateway");
    const gwA = new FakePresenceGateway(bus);
    const gwB = new FakePresenceGateway(bus);

    await gwA.join("plaza", alice);
    await gwB.join("plaza", bob);

    let aliceSees: RemotePlayer[] = [];
    gwA.onPlayers((p) => (aliceSees = p));
    expect(aliceSees.map((p) => p.userId)).toEqual(["b"]);

    gwB.move({ x: 60, y: 55, facing: "left" });
    expect(aliceSees.find((p) => p.userId === "b")!.x).toBe(60);

    await gwB.leave();
    expect(aliceSees.map((p) => p.userId)).toEqual([]);
  });

  it("spawnGhost injects a wandering player others can see", async () => {
    const adapters = makeAdapters("test");
    const bus = adapters.fakes!.bus;
    const { FakePresenceGateway } = await import("../../net/fakes/FakePresenceGateway");
    const gw = new FakePresenceGateway(bus);
    await gw.join("plaza", { userId: "me", displayName: "Me", color: 1, x: 0, y: 0, facing: "down" });

    let seen: RemotePlayer[] = [];
    gw.onPlayers((p) => (seen = p));
    const ghost: RemotePlayer = { userId: "ghost1", displayName: "Fantasma", color: 9, x: 100, y: 100, facing: "down" };
    const stop = gw.spawnGhost("plaza", ghost);
    expect(seen.map((p) => p.userId)).toContain("ghost1");
    stop();
    expect(seen.map((p) => p.userId)).not.toContain("ghost1");
  });
});

describe("auth + guest claim", () => {
  it("signs in instantly and reports a non-guest account", async () => {
    const adapters = makeAdapters("test");
    expect(adapters.auth.current().isGuest).toBe(true);
    const user = await adapters.auth.signIn();
    expect(user.isGuest).toBe(false);
    expect(adapters.auth.current().isGuest).toBe(false);
  });
});
