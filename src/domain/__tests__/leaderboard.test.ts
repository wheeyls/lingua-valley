import { describe, it, expect } from "vitest";
import { toLeaderboardRow, rankLeaderboard, totalGrowth } from "../leaderboard";
import { initialPlayerState, type PlayerState } from "../player";
import { plantSeed, MAX_GROWTH } from "../field";
import { add as addItem, ticketId } from "../inventory";

function player(over: Partial<PlayerState> = {}): PlayerState {
  return { ...initialPlayerState("P", 1), ...over };
}

describe("leaderboard helpers", () => {
  it("sums total growth across the field", () => {
    let s = player();
    s = { ...s, field: plantSeed(s.field, "t", "2025-06-01") };
    s.field.slots[0]!.growth = 3;
    expect(totalGrowth(s)).toBe(3);
  });

  it("builds a row with money, growth, ticket, today and streak", () => {
    let s = player({
      money: 40,
      inventory: addItem({}, ticketId("mercado")),
    });
    s = { ...s, field: plantSeed(s.field, "t", "2025-06-01") };
    s.field.slots[0]!.growth = MAX_GROWTH;
    s.daily.streak = 5;
    s.daily.objectiveState = {
      "story-telling": { completedAt: "x", outputs: {} },
      "story-retell": { completedAt: "x", outputs: {} },
    };

    const row = toLeaderboardRow(s, {
      totalToday: 4,
      nextAreaId: "mercado",
      lastActive: "2025-06-03T10:00:00Z",
    });

    expect(row.money).toBe(40);
    expect(row.growth).toBe(MAX_GROWTH);
    expect(row.growthPct).toBe(1);
    expect(row.ticket).toBe(true);
    expect(row.doneToday).toBe(2);
    expect(row.totalToday).toBe(4);
    expect(row.streak).toBe(5);
    expect(row.lastActive).toBe("2025-06-03T10:00:00Z");
  });

  it("ranks ticket-holders and higher progress first", () => {
    const noTicket = toLeaderboardRow(player({ money: 100 }), { totalToday: 4 });
    const withTicket = toLeaderboardRow(
      player({ money: 10, inventory: addItem({}, ticketId("mercado")) }),
      { totalToday: 4, nextAreaId: "mercado" },
    );
    const ranked = rankLeaderboard([noTicket, withTicket]);
    expect(ranked[0].ticket).toBe(true); // milestone outranks raw money
  });

  it("caps doneToday at totalToday", () => {
    const s = player();
    s.daily.objectiveState = {
      a: { completedAt: "x", outputs: {} },
      b: { completedAt: "x", outputs: {} },
      c: { completedAt: "x", outputs: {} },
    };
    const row = toLeaderboardRow(s, { totalToday: 2 });
    expect(row.doneToday).toBe(2);
  });
});
