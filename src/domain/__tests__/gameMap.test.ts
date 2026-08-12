import { describe, it, expect } from "vitest";
import { buildHubMap } from "../../content/maps";
import { visibleLocations } from "../../content/world";
import { PUEBLO_DEL_AYER } from "../../content/world";

// Exercises the generic map-building mechanism (buildHubMap) — pinned to
// Pueblo del Ayer specifically, independent of whichever campaign is
// DEFAULT_CAMPAIGN today.
const HUB = buildHubMap(PUEBLO_DEL_AYER);

describe("gameMap — flat hub", () => {
  it("the hub has one NPC card per visible location (store hidden)", () => {
    expect(HUB.npcs).toHaveLength(visibleLocations(PUEBLO_DEL_AYER).length);
    const npcIds = HUB.npcs.map((n) => n.npcId);
    expect(npcIds).toContain("jorgito");
    expect(npcIds).not.toContain("shopkeeper");
  });

  it("each NPC card matches its location's npc and icon", () => {
    const plaza = visibleLocations(PUEBLO_DEL_AYER).find((l) => l.id === "plaza")!;
    const card = HUB.npcs.find((n) => n.npcId === "jorgito")!;
    expect(card).toBeDefined();
    expect(card.icon).toBe(plaza.icon);
    expect(card.name).toBe("Jorgito");
  });
});
