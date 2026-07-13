import { describe, it, expect } from "vitest";
import {
  initialPlayerState,
  normalizePlayerState,
  settleDailyState,
  applyActivity,
  applyPlayerAction,
  mergeStates,
  type ActivityResult,
  type PlayerState,
} from "../player";
import { makeGarden, plantRow, waterActiveRow, totalBlooms, type Garden } from "../garden";
import { add as addItem, ticketId, hasTicketTo } from "../inventory";
import { DAY_COOLDOWN_MS } from "../dailyLoop";

const NOW = new Date("2025-06-01T12:00:00.000Z");
const DAY = "2025-06-01";

function activity(over: Partial<ActivityResult> = {}): ActivityResult {
  return {
    objectiveId: "a1.greetings",
    level: "A1",
    role: "water",
    communication: 1,
    accuracy: 1,
    ...over,
  };
}

function withRow(): PlayerState {
  const s = initialPlayerState("Tester", 0x123456);
  return { ...s, field: plantRow(s.field, DAY) };
}

function bloomGarden(blooms: number): Garden {
  let g = plantRow(makeGarden(), DAY);
  for (let i = 0; i < blooms; i++) {
    const d = new Date(`${DAY}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + i);
    g = waterActiveRow(g, d.toISOString().slice(0, 10)).garden;
  }
  return g;
}

describe("applyActivity — money comes only from the store review", () => {
  it("a water/practice conversation grants no money", () => {
    const { state, earnedReward } = applyActivity(withRow(), activity({ role: "water" }), NOW);
    expect(earnedReward).toBe(true);
    expect(state.money).toBe(0);
  });

  it("a seeds conversation grants no money", () => {
    const res = applyActivity(
      initialPlayerState("T", 1),
      activity({ objectiveId: "seeds-intro", role: "seeds" }),
      NOW,
    );
    expect(res.state.money).toBe(0);
  });

  it("the store review pays money from its grade", () => {
    const res = applyActivity(
      initialPlayerState("T", 1),
      activity({ objectiveId: "store-review", role: "store", communication: 1, accuracy: 1 }),
      NOW,
    );
    expect(res.soldValue).toBeGreaterThan(0);
    expect(res.sold).toBe(1);
    expect(res.state.money).toBe(res.soldValue);
  });

  it("a poor store review pays nothing (below the quality threshold)", () => {
    const res = applyActivity(
      initialPlayerState("T", 1),
      activity({ objectiveId: "store-review", role: "store", communication: 0.2, accuracy: 0.2 }),
      NOW,
    );
    expect(res.soldValue).toBe(0);
    expect(res.state.money).toBe(0);
  });
});

describe("applyActivity — blooms", () => {
  it("the water role blooms today's plant once per day", () => {
    const res = applyActivity(withRow(), activity({ role: "water" }), NOW);
    expect(res.grown).toBe(1);
    expect(totalBlooms(res.state.field)).toBe(1);
  });

  it("watering again the same day blooms nothing", () => {
    let s = withRow();
    s = applyActivity(s, activity({ role: "water" }), NOW).state;
    const again = applyActivity(s, activity({ role: "water" }), NOW);
    expect(again.grown).toBe(0);
    expect(totalBlooms(again.state.field)).toBe(1);
  });

  it("watering with no active row (needs seed) blooms nothing", () => {
    const res = applyActivity(initialPlayerState("T", 1), activity({ role: "water" }), NOW);
    expect(res.grown).toBe(0);
    expect(totalBlooms(res.state.field)).toBe(0);
  });

  it("two water objectives in a day still only bloom once", () => {
    let s = withRow();
    const story = applyActivity(s, activity({ objectiveId: "story-telling", role: "water" }), NOW);
    expect(story.grown).toBe(1);
    s = story.state;
    const retell = applyActivity(s, activity({ objectiveId: "story-retell", role: "water" }), NOW);
    expect(retell.grown).toBe(0);
    expect(totalBlooms(retell.state.field)).toBe(1);
  });
});

describe("applyActivity — authoritative side-effects", () => {
  it("starts a garden row when a seeds conversation completes", () => {
    const res = applyActivity(
      initialPlayerState("T", 1),
      activity({ objectiveId: "seeds-intro", role: "seeds" }),
      NOW,
    );
    expect(res.planted).toBe(true);
    expect(res.state.field.rows).toHaveLength(1);
    expect(res.state.field.rows[0].seedDay).toBe(DAY);
  });

  it("only starts one row per day even if the seeds chat has many turns", () => {
    let s = initialPlayerState("T", 1);
    s = applyActivity(s, activity({ objectiveId: "seeds-intro", role: "seeds" }), NOW).state;
    const again = applyActivity(s, activity({ objectiveId: "seeds-intro", role: "seeds" }), NOW);
    expect(again.planted).toBe(false);
    expect(again.state.field.rows).toHaveLength(1);
  });

  it("does not start a new row while the current one is still growing", () => {
    const res = applyActivity(withRow(), activity({ objectiveId: "seeds-intro", role: "seeds" }), NOW);
    expect(res.planted).toBe(false);
    expect(res.state.field.rows).toHaveLength(1);
  });

  it("records objective completion + outputs in daily state (survives refresh)", () => {
    const res = applyActivity(
      initialPlayerState("T", 1),
      activity({
        objectiveId: "story-telling",
        role: "water",
        outputs: { storyText: "Fui al mercado." },
      }),
      NOW,
    );
    expect(res.state.daily.objectiveState["story-telling"]).toBeDefined();
    expect(res.state.daily.objectiveState["story-telling"].outputs.storyText).toBe(
      "Fui al mercado.",
    );
  });

  it("refreshes accumulating outputs across turns but keeps the first timestamp", () => {
    let s = initialPlayerState("T", 1);
    const t1 = applyActivity(
      s,
      activity({ objectiveId: "story-telling", role: "water", outputs: { storyText: "A." } }),
      NOW,
    );
    s = t1.state;
    const firstTs = s.daily.objectiveState["story-telling"].completedAt;
    const later = new Date(NOW.getTime() + 60_000);
    const t2 = applyActivity(
      s,
      activity({ objectiveId: "story-telling", role: "water", outputs: { storyText: "A. B." } }),
      later,
    );
    expect(t2.state.daily.objectiveState["story-telling"].outputs.storyText).toBe("A. B.");
    expect(t2.state.daily.objectiveState["story-telling"].completedAt).toBe(firstTs);
  });
});

describe("applyPlayerAction — buy ticket (authoritative)", () => {
  it("buys a ticket when affordable and not owned", () => {
    const s0: PlayerState = { ...initialPlayerState("T", 1), money: 100 };
    const res = applyPlayerAction(s0, { type: "buy-ticket", areaId: "mercado", price: 60 });
    expect(res.ok).toBe(true);
    expect(res.state.money).toBe(40);
    expect(hasTicketTo(res.state.inventory, "mercado")).toBe(true);
  });

  it("rejects when funds are insufficient", () => {
    const s0: PlayerState = { ...initialPlayerState("T", 1), money: 10 };
    const res = applyPlayerAction(s0, { type: "buy-ticket", areaId: "mercado", price: 60 });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("insufficient-funds");
    expect(res.state.money).toBe(10);
  });

  it("rejects buying a ticket you already own", () => {
    const s0: PlayerState = {
      ...initialPlayerState("T", 1),
      money: 100,
      inventory: addItem({}, ticketId("mercado")),
    };
    const res = applyPlayerAction(s0, { type: "buy-ticket", areaId: "mercado", price: 60 });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("already-owned");
    expect(res.state.money).toBe(100);
  });
});

describe("mergeStates (guest claim)", () => {
  it("sums money, keeps the garden with more blooms, unions inventory", () => {
    const account: PlayerState = {
      ...initialPlayerState("Acct", 1),
      money: 50,
      inventory: addItem({}, ticketId("mercado")),
    };
    const guest: PlayerState = {
      ...initialPlayerState("Guest", 2),
      money: 30,
      field: bloomGarden(3),
    };
    const merged = mergeStates(account, guest);
    expect(merged.money).toBe(80);
    expect(totalBlooms(merged.field)).toBe(3);
    expect(hasTicketTo(merged.inventory, "mercado")).toBe(true);
  });
});

describe("normalizePlayerState (forward-compatible loads)", () => {
  it("maps an OLD save's pesos to money and fills new fields", () => {
    const oldSave = {
      displayName: "Vieja",
      avatarColor: 123,
      pesos: 42,
      focus: 50,
      skills: { speaking: 10 },
    };
    const s = normalizePlayerState(oldSave);
    expect(s.money).toBe(42);
    expect(s.field.rows).toEqual([]);
    expect(s.inventory).toEqual({});
    expect(s.daily.rewardedRoles).toEqual([]);
  });

  it("migrates an OLD crop field (slots) to a fresh garden", () => {
    const s = normalizePlayerState({ field: { slots: [{ theme: "x", growth: 3 }] } });
    expect(s.field.rows).toEqual([]);
  });

  it("loads a saved garden", () => {
    const s = normalizePlayerState({ field: bloomGarden(2) });
    expect(totalBlooms(s.field)).toBe(2);
  });

  it("returns a fresh state for garbage/null input", () => {
    expect(normalizePlayerState(null).money).toBe(0);
    expect(normalizePlayerState("nonsense").field.rows).toEqual([]);
  });
});

describe("settleDailyState (daily reset on load)", () => {
  it("starts a fresh day once the cooldown has elapsed", () => {
    const s0: PlayerState = {
      ...initialPlayerState("T", 1),
      money: 10,
      daily: {
        dayStartedAt: NOW.toISOString(),
        rewardedRoles: ["water", "seeds"],
        rewardedObjectives: ["story-telling"],
        objectiveState: {},
        streak: 3,
        lastPlayedDay: NOW.toISOString().slice(0, 10),
      },
    };
    const later = new Date(NOW.getTime() + DAY_COOLDOWN_MS);
    const settled = settleDailyState(s0, later);
    expect(settled.daily.rewardedRoles).toEqual([]);
    expect(settled.daily.streak).toBe(3);
    expect(settled.money).toBe(10);
  });

  it("is a no-op within the same day", () => {
    const s0: PlayerState = {
      ...initialPlayerState("T", 1),
      daily: {
        dayStartedAt: NOW.toISOString(),
        rewardedRoles: ["water"],
        rewardedObjectives: [],
        objectiveState: {},
        streak: 1,
        lastPlayedDay: NOW.toISOString().slice(0, 10),
      },
    };
    const settled = settleDailyState(s0, NOW);
    expect(settled).toBe(s0);
  });
});
