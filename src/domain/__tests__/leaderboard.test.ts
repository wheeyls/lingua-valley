import { describe, it, expect } from "vitest";
import { toLeaderboardRow, rankLeaderboard, totalGrowth } from "../leaderboard";
import { initialPlayerState, type PlayerState } from "../player";
import {
  makeGarden,
  plantRow,
  waterActiveRow,
  VISIBLE_ROWS,
  ROW_LENGTH,
  type Garden,
} from "../garden";
import { add as addItem, ticketId } from "../inventory";

const addDays = (day: string, n: number): string => {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function bloomGarden(blooms: number): Garden {
  let g: Garden = makeGarden();
  let seed = "2025-06-01";
  let placed = 0;
  while (placed < blooms) {
    g = plantRow(g, seed);
    for (let d = 0; d < ROW_LENGTH && placed < blooms; d++) {
      g = waterActiveRow(g, addDays(seed, d)).garden;
      placed++;
    }
    seed = addDays(seed, ROW_LENGTH);
  }
  return g;
}

function player(over: Partial<PlayerState> = {}): PlayerState {
  return { ...initialPlayerState("P", 1), ...over };
}

describe("leaderboard helpers", () => {
  it("sums total blooms across the garden", () => {
    const s = player({ field: bloomGarden(3) });
    expect(totalGrowth(s)).toBe(3);
  });

  it("builds a row with money, blooms, ticket, today and streak", () => {
    const s = player({
      money: 40,
      inventory: addItem({}, ticketId("mercado")),
      field: bloomGarden(VISIBLE_ROWS * ROW_LENGTH),
    });
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
    expect(row.growth).toBe(VISIBLE_ROWS * ROW_LENGTH);
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
    expect(ranked[0].ticket).toBe(true);
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
