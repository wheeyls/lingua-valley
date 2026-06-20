import { describe, it, expect } from "vitest";
import {
  initialPlayerState,
  normalizePlayerState,
  settleDailyState,
  applyActivity,
  mergeStates,
  type ActivityResult,
  type PlayerState,
} from "../player";
import { plantSeed } from "../field";
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

describe("applyActivity — money", () => {
  it("awards money on the first completion of an objective", () => {
    const s0 = withCrop();
    const { state, reward, earnedReward } = applyActivity(s0, activity(), NOW);
    expect(reward.money).toBeGreaterThan(0);
    expect(earnedReward).toBe(true);
    expect(state.money).toBe(reward.money);
  });

  it("does not pay twice for the same objective on the same day", () => {
    let s = withCrop();
    const first = applyActivity(s, activity(), NOW);
    s = first.state;
    const second = applyActivity(s, activity(), NOW);
    expect(second.earnedReward).toBe(false);
    expect(second.state.money).toBe(first.state.money); // unchanged
  });

  it("pays each objective independently — even two sharing the water role", () => {
    let s = withCrop();
    s = applyActivity(
      s,
      activity({ objectiveId: "story-telling", role: "water" }),
      NOW,
    ).state;
    const moneyAfterStory = s.money;
    const retell = applyActivity(
      s,
      activity({ objectiveId: "story-retell", role: "water" }),
      NOW,
    );
    expect(retell.earnedReward).toBe(true);
    expect(retell.state.money).toBeGreaterThan(moneyAfterStory);
  });

  it("low-quality conversation claims the objective but pays no money", () => {
    const s0 = withCrop();
    const res = applyActivity(s0, activity({ communication: 0.3, accuracy: 0.3 }), NOW);
    expect(res.reward.money).toBe(0);
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
      },
    };
    const later = new Date(NOW.getTime() + DAY_COOLDOWN_MS);
    const settled = settleDailyState(s0, later);
    expect(settled.daily.rewardedRoles).toEqual([]); // reset
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
      },
    };
    const settled = settleDailyState(s0, NOW);
    expect(settled).toBe(s0); // unchanged reference
  });
});
