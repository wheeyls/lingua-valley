import { describe, it, expect } from "vitest";
import {
  isTownUnlocked,
  producerAccessible,
  capstonePassed,
  unlockTown,
  gradingStrictness,
  showsEnglishHelp,
  townReachable,
  type Gatekeeper,
  type TownInfo,
} from "../town";
import { initialPlayerState } from "../player";

const gatekeeper: Gatekeeper = {
  npcId: "carmen",
  lessonSlug: "asking-for-directions",
  passQuality: 0.7,
};

describe("towns & gatekeepers", () => {
  it("producers are inaccessible until the town is unlocked", () => {
    const s = initialPlayerState("T", 1, "2025-06-01");
    expect(producerAccessible(s, "mercado")).toBe(false);
    const unlocked = unlockTown(s, "mercado");
    expect(isTownUnlocked(unlocked, "mercado")).toBe(true);
    expect(producerAccessible(unlocked, "mercado")).toBe(true);
  });

  it("capstone passes only at or above the quality bar", () => {
    expect(capstonePassed(gatekeeper, 0.69)).toBe(false);
    expect(capstonePassed(gatekeeper, 0.7)).toBe(true);
    expect(capstonePassed(gatekeeper, 0.95)).toBe(true);
  });

  it("unlockTown is idempotent and pure", () => {
    const s = initialPlayerState("T", 1, "2025-06-01");
    const once = unlockTown(s, "mercado");
    const twice = unlockTown(once, "mercado");
    expect(twice.townsUnlocked).toEqual(["mercado"]);
    expect(s.townsUnlocked).toEqual([]); // original untouched
  });

  it("remote towns grade stricter and hide English help", () => {
    const metro: TownInfo = {
      id: "plaza",
      name: "Plaza",
      depth: 0,
      level: "A1",
      englishAvailability: 1,
    };
    const remote: TownInfo = {
      id: "mercado",
      name: "Mercado",
      depth: 1,
      level: "A2",
      englishAvailability: 0.2,
    };
    expect(gradingStrictness(remote)).toBeGreaterThan(gradingStrictness(metro));
    expect(showsEnglishHelp(metro)).toBe(true);
    expect(showsEnglishHelp(remote)).toBe(false);
  });
});

describe("travel gating", () => {
  const metro: TownInfo = { id: "plaza", name: "Plaza", depth: 0, level: "A1", englishAvailability: 1 };
  const mercado: TownInfo = { id: "mercado", name: "Mercado", depth: 1, level: "A2", englishAvailability: 0.5, gatekeeper };

  it("the first town is always reachable", () => {
    const s = initialPlayerState("T", 1, "2025-06-01");
    expect(townReachable(s, null)).toBe(true);
    expect(townReachable(s, metro)).toBe(true); // metro has no gatekeeper
  });

  it("a deeper town is reachable only after the previous gatekeeper is beaten", () => {
    const s = initialPlayerState("T", 1, "2025-06-01");
    expect(townReachable(s, mercado)).toBe(false);
    const unlocked = unlockTown(s, "mercado");
    expect(townReachable(unlocked, mercado)).toBe(true);
  });
});
