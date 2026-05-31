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
