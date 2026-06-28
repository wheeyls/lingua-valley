/**
 * Full gameplay scenario tests — driven entirely against FAKE adapters.
 * No OpenAI, no Supabase, no websockets, no waiting on real time. This proves
 * the farming loop end-to-end and is the safety net for all future changes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { makeAdapters, type Adapters } from "../adapters";
import { PlayerService } from "../PlayerService";
import { ConversationSession } from "../ConversationSession";
import { CURRENT_LESSON } from "../../content/lessons";
import { plantSeed, MAX_GROWTH } from "../../domain/field";
import { hasTicketTo } from "../../domain/inventory";
import type { DailyRole } from "../../domain/dailyLoop";
import type { RemotePlayer } from "../../domain/ports";

function sessionFor(
  adapters: Adapters,
  player: PlayerService,
  role: DailyRole,
  objectiveId = `${role}-conv`,
) {
  return new ConversationSession(
    {
      npcId: `${role}-npc`,
      level: CURRENT_LESSON.level,
      objectiveId,
      role,
      canDo: CURRENT_LESSON.canDo,
      vocab: CURRENT_LESSON.vocab.map((v) => ({ es: v.es, en: v.en })),
      cropTheme: CURRENT_LESSON.id,
    },
    adapters.conversationGrader,
    player,
  );
}

function newPlayer(adapters: Adapters): PlayerService {
  return new PlayerService(
    adapters.repo,
    adapters.rewardGrader,
    adapters.clock,
    adapters.playerActions,
  );
}

describe("a single graded conversation turn", () => {
  let adapters: Adapters;
  let player: PlayerService;

  beforeEach(async () => {
    adapters = makeAdapters("test");
    player = new PlayerService(adapters.repo, adapters.rewardGrader, adapters.clock);
    await player.init();
  });

  it("a good water turn completes the objective but pays no money", async () => {
    adapters.fakes!.grader.enqueue({
      communication: 0.9,
      accuracy: 0.85,
      objectiveMet: false,
      conversationComplete: false,
    });
    const s = sessionFor(adapters, player, "water");
    s.begin("¡Hola!");
    const outcome = await s.submit("Hola, buenos días.");

    expect(outcome.applied.earnedReward).toBe(true); // counts as done today
    expect(player.getState().money).toBe(0); // money only comes from selling
  });

  it("conversations never pay, regardless of grade", async () => {
    adapters.fakes!.grader.enqueue({ communication: 0.3, accuracy: 0.3 });
    const s = sessionFor(adapters, player, "water");
    s.begin("¡Hola!");
    await s.submit("uhh no sé");
    expect(player.getState().money).toBe(0);
  });
});

describe("the crop grows over a week of watering", () => {
  it("plants, grows one unit per day, and is harvest-ready after MAX_GROWTH days", async () => {
    const adapters = makeAdapters("test");
    const player = new PlayerService(adapters.repo, adapters.rewardGrader, adapters.clock);
    await player.init();
    adapters.fakes!.grader.setDefault({ communication: 0.85, accuracy: 0.85 });

    // Plant a crop (as the seeds conversation would).
    await player.update((s) => ({
      ...s,
      field: plantSeed(s.field, CURRENT_LESSON.id, "2025-06-01"),
    }));

    // Water once per day for MAX_GROWTH days; the clock drives the daily gate.
    for (let day = 0; day < MAX_GROWTH; day++) {
      const s = sessionFor(adapters, player, "water");
      s.begin("¡Hola!");
      const outcome = await s.submit("Hola, ¿cómo estás?");
      expect(outcome.applied.grown).toBe(1);
      adapters.fakes!.clock.advanceDays(1);
    }

    const crop = player.getState().field.slots[0]!;
    expect(crop.growth).toBe(MAX_GROWTH);
  });

  it("watering twice in one day only grows once", async () => {
    const adapters = makeAdapters("test");
    const player = new PlayerService(adapters.repo, adapters.rewardGrader, adapters.clock);
    await player.init();
    adapters.fakes!.grader.setDefault({ communication: 0.85, accuracy: 0.85 });
    await player.update((s) => ({
      ...s,
      field: plantSeed(s.field, CURRENT_LESSON.id, "2025-06-01"),
    }));

    const s1 = sessionFor(adapters, player, "water");
    s1.begin("¡Hola!");
    await s1.submit("Hola.");

    const s2 = sessionFor(adapters, player, "water");
    s2.begin("¡Hola!");
    const again = await s2.submit("Hola de nuevo.");
    expect(again.applied.grown).toBe(0);
    expect(player.getState().field.slots[0]!.growth).toBe(1);
  });
});

describe("farming side-effects persist across a refresh (the bug)", () => {
  it("completing the seeds chat plants a crop that survives a reload", async () => {
    const adapters = makeAdapters("test");
    const player = newPlayer(adapters);
    await player.init();
    adapters.fakes!.grader.setDefault({ communication: 0.9, accuracy: 0.9 });

    // Complete the seeds conversation (as Don Semilla).
    const seeds = sessionFor(adapters, player, "seeds", "seeds-intro");
    seeds.begin("¡Buenas!");
    const outcome = await seeds.submit("Hola, quiero semillas.");
    expect(outcome.applied.planted).toBe(true);
    expect(player.getState().field.slots[0]).not.toBeNull();

    // Simulate a browser refresh: a NEW PlayerService loading from the SAME repo.
    const reloaded = newPlayer(adapters);
    await reloaded.init();
    expect(reloaded.getState().field.slots[0]).not.toBeNull();
    expect(reloaded.getState().field.slots[0]!.theme).toBe(CURRENT_LESSON.id);
  });

  it("selling at the store persists money + cleared field across a reload", async () => {
    const adapters = makeAdapters("test");
    const player = newPlayer(adapters);
    await player.init();
    adapters.fakes!.grader.setDefault({ communication: 0.9, accuracy: 0.9 });

    // Seed a ready-to-harvest crop directly via the repo, then reload.
    await player.update((s) => {
      const field = plantSeed(s.field, CURRENT_LESSON.id, "2025-06-01");
      field.slots[0]!.growth = MAX_GROWTH;
      return { ...s, field };
    });

    const store = sessionFor(adapters, player, "store", "store-review");
    store.begin("¡Hola!");
    const outcome = await store.submit("Ayer fui al mercado y compré pan.");
    expect(outcome.applied.sold).toBe(1);
    expect(player.getState().money).toBeGreaterThan(0);

    const reloaded = newPlayer(adapters);
    await reloaded.init();
    expect(reloaded.getState().money).toBeGreaterThan(0);
    expect(reloaded.getState().field.slots[0]).toBeNull();
  });

  it("buying a ticket persists across a reload", async () => {
    const adapters = makeAdapters("test");
    const player = newPlayer(adapters);
    await player.init();
    await player.update((s) => ({ ...s, money: 100 }));

    const result = await player.performAction({
      type: "buy-ticket",
      areaId: "mercado",
      price: 60,
    });
    expect(result.ok).toBe(true);

    const reloaded = newPlayer(adapters);
    await reloaded.init();
    expect(reloaded.getState().money).toBe(40);
    expect(hasTicketTo(reloaded.getState().inventory, "mercado")).toBe(true);
  });
});

describe("the daily gate resets after the cooldown", () => {
  it("re-opens the daily completion gate on a new day", async () => {
    const adapters = makeAdapters("test");
    const player = newPlayer(adapters);
    await player.init();
    adapters.fakes!.grader.setDefault({ communication: 0.9, accuracy: 0.9 });

    const day1 = sessionFor(adapters, player, "water");
    day1.begin("¡Hola!");
    const first = await day1.submit("Hola.");
    expect(first.applied.earnedReward).toBe(true);

    // Same day: the gate is closed (replay earns nothing).
    const replay = sessionFor(adapters, player, "water");
    replay.begin("¡Hola!");
    expect((await replay.submit("otra vez")).applied.earnedReward).toBe(false);

    // Advance past the 12h cooldown and re-init so settleDailyState runs.
    adapters.fakes!.clock.advanceDays(1);
    const player2 = newPlayer(adapters);
    await player2.init();

    const day2 = sessionFor(adapters, player2, "water");
    day2.begin("¡Hola!");
    const outcome = await day2.submit("Hola otra vez.");
    expect(outcome.applied.earnedReward).toBe(true); // gate re-opened
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

describe("free-form conversation (LLM-driven)", () => {
  it("runs several turns, can't end before the minimum, then completes", async () => {
    const { MIN_PLAYER_TURNS } = await import("../ConversationSession");
    const adapters = makeAdapters("test");
    const player = new PlayerService(adapters.repo, adapters.rewardGrader, adapters.clock);
    await player.init();
    adapters.fakes!.grader.setDefault({ communication: 0.85, accuracy: 0.8 });

    const session = sessionFor(adapters, player, "water");
    const opening = session.begin("¡Buenas! ¿Qué onda?");
    expect(opening).toEqual(["¡Buenas! ¿Qué onda?"]);

    // Even if the LLM tries to end early, the min-turn floor prevents it.
    adapters.fakes!.grader.enqueue({
      communication: 0.9,
      accuracy: 0.9,
      conversationComplete: true,
    });
    const first = await session.submit("¡Ey! ¿Cómo andas?");
    expect(first.complete).toBe(false); // below MIN_PLAYER_TURNS

    let complete = false;
    let turns = 1;
    adapters.fakes!.grader.setDefault({
      communication: 0.85,
      accuracy: 0.85,
      conversationComplete: true,
    });
    while (!complete && turns < 10) {
      const outcome = await session.submit("respuesta " + turns);
      complete = outcome.complete;
      turns++;
    }
    expect(complete).toBe(true);
    expect(turns).toBeGreaterThanOrEqual(MIN_PLAYER_TURNS);
  });
});

describe("reward grant resilience", () => {
  it("a throwing grader does not break gameplay — falls back to local economy", async () => {
    const { InMemoryPlayerRepository } = await import(
      "../../net/fakes/InMemoryPlayerRepository"
    );
    const repo = new InMemoryPlayerRepository();
    const throwingGrader = {
      async grant() {
        throw new Error("activity-complete failed: 401");
      },
    };
    const player = new PlayerService(repo, throwingGrader as never);
    await player.init();

    const result = await player.completeActivity({
      objectiveId: "store-review",
      level: "A2",
      role: "store",
      communication: 1,
      accuracy: 1,
    });

    // Did not throw; applied locally. (Money would come from a sale; here the
    // field is empty so soldValue is 0 — the point is gameplay didn't break.)
    expect(result.earnedReward).toBe(true);
    expect(result.sold).toBe(0);
  });
});
