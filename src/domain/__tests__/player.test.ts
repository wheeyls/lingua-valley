import { describe, it, expect } from "vitest";
import {
  initialPlayerState,
  normalizePlayerState,
  settleDailyState,
  applyActivity,
  applyPlayerAction,
  mergeStates,
  CROP_VALUE,
  type ActivityResult,
  type PlayerState,
} from "../player";
import { plantSeed, MAX_GROWTH } from "../field";
import { add as addItem, ticketId, hasTicketTo } from "../inventory";
import { DAY_COOLDOWN_MS } from "../dailyLoop";

const NOW = new Date("2025-06-01T12:00:00.000Z");

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

/** A player with one crop already planted (so watering can grow it). */
function withCrop(): PlayerState {
  const s = initialPlayerState("Tester", 0x123456);
  return { ...s, field: plantSeed(s.field, "greetings", "2025-06-01") };
}

describe("applyActivity — money comes ONLY from selling at the store", () => {
  it("a water/practice conversation grants no money", () => {
    const s0 = withCrop();
    const { state, earnedReward } = applyActivity(s0, activity({ role: "water" }), NOW);
    expect(earnedReward).toBe(true); // still counts as completed today
    expect(state.money).toBe(0); // but pays nothing
  });

  it("a seeds conversation grants no money", () => {
    const s0 = initialPlayerState("T", 1);
    const res = applyActivity(s0, activity({ objectiveId: "seeds-intro", role: "seeds" }), NOW);
    expect(res.state.money).toBe(0);
  });

  it("even a high-quality conversation pays nothing on its own", () => {
    const s0 = withCrop();
    const res = applyActivity(s0, activity({ communication: 1, accuracy: 1, role: "water" }), NOW);
    expect(res.state.money).toBe(0);
  });
});

describe("applyActivity — growth", () => {
  it("the water role grows the field once per day", () => {
    let s = withCrop();
    const res = applyActivity(s, activity({ role: "water" }), NOW);
    expect(res.grown).toBe(1);
    expect(res.state.field.slots[0]!.growth).toBe(1);
  });

  it("watering again the same day grows nothing", () => {
    let s = withCrop();
    s = applyActivity(s, activity({ role: "water" }), NOW).state;
    const again = applyActivity(s, activity({ role: "water" }), NOW);
    expect(again.grown).toBe(0);
    expect(again.state.field.slots[0]!.growth).toBe(1);
  });

  it("non-water roles never grow the field", () => {
    const s = withCrop();
    const res = applyActivity(s, activity({ role: "seeds" }), NOW);
    expect(res.grown).toBe(0);
    expect(res.state.field.slots[0]!.growth).toBe(0);
  });

  it("two water objectives in a day still only grow the field once", () => {
    let s = withCrop();
    const story = applyActivity(
      s,
      activity({ objectiveId: "story-telling", role: "water" }),
      NOW,
    );
    expect(story.grown).toBe(1);
    s = story.state;
    const retell = applyActivity(
      s,
      activity({ objectiveId: "story-retell", role: "water" }),
      NOW,
    );
    expect(retell.grown).toBe(0); // growth gated once/day per role
    expect(retell.state.field.slots[0]!.growth).toBe(1);
  });
});

describe("applyActivity — authoritative side-effects (the persistence fix)", () => {
  it("plants a crop when a seeds conversation completes", () => {
    const s0 = initialPlayerState("T", 1); // empty field
    const res = applyActivity(
      s0,
      activity({ objectiveId: "seeds-intro", role: "seeds", theme: "past-tense" }),
      NOW,
    );
    expect(res.planted).toBe(true);
    expect(res.state.field.slots[0]).not.toBeNull();
    expect(res.state.field.slots[0]!.theme).toBe("past-tense");
  });

  it("only plants once per day even if the seeds chat has many turns", () => {
    let s = initialPlayerState("T", 1);
    s = applyActivity(s, activity({ objectiveId: "seeds-intro", role: "seeds" }), NOW).state;
    const again = applyActivity(s, activity({ objectiveId: "seeds-intro", role: "seeds" }), NOW);
    expect(again.planted).toBe(false);
    expect(again.state.field.slots.filter((c) => c !== null)).toHaveLength(1);
  });

  it("sells a ready crop and pays out at the store", () => {
    let s = initialPlayerState("T", 1);
    s = { ...s, field: plantSeed(s.field, "past-tense", "2025-06-01") };
    s.field.slots[0]!.growth = MAX_GROWTH; // ready to harvest
    const res = applyActivity(
      s,
      activity({ objectiveId: "store-review", role: "store" }),
      NOW,
    );
    expect(res.sold).toBe(1);
    expect(res.soldValue).toBe(CROP_VALUE);
    // Money comes only from the sale (conversations pay nothing).
    expect(res.state.money).toBe(CROP_VALUE);
    expect(res.state.field.slots[0]).toBeNull(); // harvested
  });

  it("does not sell an unripe crop", () => {
    let s = initialPlayerState("T", 1);
    s = { ...s, field: plantSeed(s.field, "past-tense", "2025-06-01") };
    const res = applyActivity(
      s,
      activity({ objectiveId: "store-review", role: "store" }),
      NOW,
    );
    expect(res.sold).toBe(0);
    expect(res.state.field.slots[0]).not.toBeNull();
  });

  it("records objective completion + outputs in daily state (survives refresh)", () => {
    const s0 = initialPlayerState("T", 1);
    const res = applyActivity(
      s0,
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
    expect(res.state.money).toBe(100); // unchanged
  });
});

describe("mergeStates (guest claim)", () => {
  it("sums money, keeps the more-grown field, unions inventory", () => {
    const account: PlayerState = {
      ...initialPlayerState("Acct", 1),
      money: 50,
      inventory: addItem({}, ticketId("mercado")),
    };
    let guestField = initialPlayerState().field;
    guestField = plantSeed(guestField, "g", "2025-06-01");
    guestField.slots[0]!.growth = 3;
    const guest: PlayerState = {
      ...initialPlayerState("Guest", 2),
      money: 30,
      field: guestField,
    };
    const merged = mergeStates(account, guest);
    expect(merged.money).toBe(80);
    expect(merged.field.slots[0]!.growth).toBe(3); // guest more grown
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
    expect(s.field.slots).toHaveLength(1);
    expect(s.inventory).toEqual({});
    expect(s.daily.rewardedRoles).toEqual([]);
  });

  it("returns a fresh state for garbage/null input", () => {
    expect(normalizePlayerState(null).money).toBe(0);
    expect(normalizePlayerState("nonsense").field.slots).toHaveLength(1);
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
    expect(settled.daily.rewardedRoles).toEqual([]); // reset
    expect(settled.daily.streak).toBe(3); // streak carried forward
    expect(settled.money).toBe(10); // money preserved
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
    expect(settled).toBe(s0); // unchanged reference
  });
});
