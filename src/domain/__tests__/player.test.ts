import { describe, it, expect } from "vitest";
import {
  initialPlayerState,
  applyActivity,
  mergeStates,
  FOCUS_MAX,
  type ActivityResult,
  type PlayerState,
} from "../player";
import { ACTIVITY_FOCUS_COST } from "../economy";

const NOW = new Date("2025-06-01T12:00:00.000Z");

function activity(over: Partial<ActivityResult> = {}): ActivityResult {
  return {
    objectiveId: "a1.greetings",
    level: "A1",
    skill: "speaking",
    wordIds: ["hola"],
    communication: 1,
    accuracy: 1,
    objectiveMet: false,
    ...over,
  };
}

describe("applyActivity", () => {
  it("spends focus, awards pesos and skill, advances a card", () => {
    const s0 = initialPlayerState("Tester", 0x123456, "2025-06-01");
    const { state, reward } = applyActivity(s0, activity(), NOW);

    expect(reward?.pesos).toBeGreaterThan(0);
    expect(state.pesos).toBe(reward!.pesos);
    expect(state.focus).toBe(FOCUS_MAX - ACTIVITY_FOCUS_COST);
    expect(state.skills.speaking).toBe(100);
    expect(state.cards["hola"]).toBeDefined();
    expect(state.cards["hola"].reps).toBe(1);
  });

  it("blocks when focus is insufficient and grants nothing", () => {
    const s0: PlayerState = { ...initialPlayerState(), focus: 2, focusDay: "2025-06-01" };
    const res = applyActivity(s0, activity(), NOW);
    expect(res.reward).toBeNull();
    expect(res.blockedReason).toBe("insufficient-focus");
    expect(res.state.pesos).toBe(0);
    expect(res.state.cards["hola"]).toBeUndefined();
  });

  it("regens focus on a new day before spending", () => {
    const s0: PlayerState = { ...initialPlayerState(), focus: 0, focusDay: "2025-05-31" };
    const res = applyActivity(s0, activity(), NOW); // NOW is 2025-06-01
    expect(res.reward).not.toBeNull();
    expect(res.state.focus).toBe(FOCUS_MAX - ACTIVITY_FOCUS_COST);
  });

  it("does not master an objective until its words are mature, even if gate says met", () => {
    let s: PlayerState = initialPlayerState("T", 1, "2025-06-01");
    const wordIds = ["hola"];
    const objectiveWords = () => wordIds;

    // One pass: card is 'growing', not mature -> not mastered yet.
    let res = applyActivity(
      s,
      activity({ objectiveMet: true, wordIds }),
      NOW,
      objectiveWords,
    );
    s = res.state;
    expect(s.masteredObjectiveIds).not.toContain("a1.greetings");

    // Drive the card to mature over several days, each a fresh-day focus regen.
    for (let i = 1; i <= 4; i++) {
      const day = new Date(`2025-06-0${1 + i}T12:00:00.000Z`);
      res = applyActivity(
        s,
        activity({ objectiveMet: true, wordIds }),
        day,
        objectiveWords,
      );
      s = res.state;
    }
    expect(s.cards["hola"].state).toBe("mature");
    expect(s.masteredObjectiveIds).toContain("a1.greetings");
  });

  it("low-quality activity spends focus but pays no pesos", () => {
    const s0 = initialPlayerState("T", 1, "2025-06-01");
    const res = applyActivity(s0, activity({ communication: 0.3, accuracy: 0.3 }), NOW);
    expect(res.reward?.pesos).toBe(0);
    expect(res.state.focus).toBe(FOCUS_MAX - ACTIVITY_FOCUS_COST);
  });
});

describe("mergeStates (guest claim)", () => {
  it("sums pesos, maxes skills, unions mastery, keeps more-advanced cards", () => {
    const account: PlayerState = {
      ...initialPlayerState("Acct", 1, "2025-06-01"),
      pesos: 50,
      skills: { speaking: 100, listening: 0, vocab: 20 },
      masteredObjectiveIds: ["a1.greetings"],
      cards: { hola: { wordId: "hola", ease: 2.3, intervalDays: 3, reps: 2, dueAt: "x", state: "growing" } },
    };
    const guest: PlayerState = {
      ...initialPlayerState("Guest", 2, "2025-06-01"),
      pesos: 30,
      skills: { speaking: 40, listening: 60, vocab: 10 },
      masteredObjectiveIds: ["a1.numbers"],
      cards: { hola: { wordId: "hola", ease: 2.4, intervalDays: 10, reps: 4, dueAt: "y", state: "mature" } },
    };
    const merged = mergeStates(account, guest);
    expect(merged.pesos).toBe(80);
    expect(merged.skills).toEqual({ speaking: 100, listening: 60, vocab: 20 });
    expect(merged.masteredObjectiveIds.sort()).toEqual(["a1.greetings", "a1.numbers"]);
    expect(merged.cards["hola"].reps).toBe(4); // guest's more-advanced card wins
  });
});

describe("friendship via repeated role-plays", () => {
  it("grows rapport each time a role-play completes, building tiers", () => {
    let s = initialPlayerState("T", 1, "2025-06-01");
    const npcId = "rosa";

    // Repeat the same completed role-play across days; rapport accumulates.
    let day = 1;
    for (let i = 0; i < 12; i++) {
      const now = new Date(`2025-06-${String(day).padStart(2, "0")}T12:00:00.000Z`);
      const res = applyActivity(
        s,
        activity({
          npcId,
          rolePlayComplete: true,
          communication: 0.9,
          accuracy: 0.85,
        }),
        now,
      );
      s = res.state;
      expect(res.rapportGained).toBeGreaterThan(0);
      day++;
    }
    expect(s.rapport[npcId].points).toBeGreaterThan(0);
  });

  it("does not grant rapport for an incomplete role-play turn", () => {
    const s0 = initialPlayerState("T", 1, "2025-06-01");
    const res = applyActivity(
      s0,
      activity({ npcId: "rosa", rolePlayComplete: false }),
      NOW,
    );
    expect(res.rapportGained).toBe(0);
    expect(res.state.rapport["rosa"]).toBeUndefined();
  });
});

describe("normalizePlayerState (forward-compatible loads)", () => {
  it("fills missing newer fields from an OLD save without crashing", async () => {
    const { normalizePlayerState } = await import("../player");
    // Simulate a save written before rapport/goods/townsUnlocked existed.
    const oldSave = {
      displayName: "Vieja",
      avatarColor: 123,
      pesos: 42,
      focus: 50,
      focusDay: "2025-01-01",
      skills: { speaking: 10, listening: 5, vocab: 3 },
      masteredObjectiveIds: ["a1.greetings"],
      cards: {},
    };
    const s = normalizePlayerState(oldSave);
    expect(s.pesos).toBe(42);
    expect(s.masteredObjectiveIds).toEqual(["a1.greetings"]);
    // Newer fields are present and safe to use.
    expect(s.rapport).toEqual({});
    expect(s.goods).toEqual({});
    expect(s.townsUnlocked).toEqual([]);
    expect(Array.isArray(s.townsUnlocked)).toBe(true);
  });

  it("returns a fresh state for garbage/null input", async () => {
    const { normalizePlayerState, initialPlayerState } = await import("../player");
    expect(normalizePlayerState(null).pesos).toBe(initialPlayerState().pesos);
    expect(normalizePlayerState("nonsense").townsUnlocked).toEqual([]);
    expect(normalizePlayerState({ skills: null }).skills).toEqual({
      speaking: 0,
      listening: 0,
      vocab: 0,
    });
  });
});

describe("settleDailyState (decay on load + daily reset)", () => {
  it("decays relationships for skipped days and resets the daily activity counter", async () => {
    const { settleDailyState, initialPlayerState } = await import("../player");
    const s0 = {
      ...initialPlayerState("T", 1, "2025-06-01"),
      rapport: { rosa: { points: 100, lastDay: "2025-06-01", countToday: 2 } },
      activitiesToday: 5,
      activityDay: "2025-06-01",
    };
    // Load five days later.
    const settled = settleDailyState(s0, "2025-06-06");
    expect(settled.rapport.rosa.points).toBeLessThan(100); // decayed
    expect(settled.activitiesToday).toBe(0); // new day -> reset
    expect(settled.activityDay).toBe("2025-06-06");
  });

  it("is a no-op within the same day", async () => {
    const { settleDailyState, initialPlayerState } = await import("../player");
    const s0 = {
      ...initialPlayerState("T", 1, "2025-06-01"),
      rapport: { rosa: { points: 50, lastDay: "2025-06-01", countToday: 1 } },
      activitiesToday: 3,
      activityDay: "2025-06-01",
    };
    const settled = settleDailyState(s0, "2025-06-01");
    expect(settled).toBe(s0); // unchanged reference
  });
});
