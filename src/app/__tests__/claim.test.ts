import { describe, it, expect } from "vitest";
import { ClaimService, type GuestSource } from "../ClaimService";
import { InMemoryPlayerRepository } from "../../net/fakes/InMemoryPlayerRepository";
import { initialPlayerState, type PlayerState } from "../../domain/player";
import {
  makeGarden,
  plantRow,
  waterActiveRow,
  totalBlooms,
  type Garden,
} from "../../domain/garden";
import { add as addItem, ticketId, hasTicketTo } from "../../domain/inventory";

const addDays = (day: string, n: number): string => {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function bloomGarden(blooms: number): Garden {
  let g: Garden = plantRow(makeGarden(), "2025-06-01");
  for (let i = 0; i < blooms; i++) {
    g = waterActiveRow(g, addDays("2025-06-01", i)).garden;
  }
  return g;
}

function guestWith(state: PlayerState | null): GuestSource & { cleared: boolean } {
  return {
    cleared: false,
    read() {
      return state;
    },
    clear() {
      this.cleared = true;
    },
  };
}

describe("ClaimService", () => {
  it("merges guest progress into a fresh account and clears the guest save", async () => {
    const account = new InMemoryPlayerRepository();
    const svc = new ClaimService(account);

    const guestState: PlayerState = {
      ...initialPlayerState("Guest", 1),
      money: 120,
      inventory: addItem({}, ticketId("mercado")),
    };
    const guest = guestWith(guestState);

    const merged = await svc.claim(guest);

    expect(merged.money).toBe(120);
    expect(hasTicketTo(merged.inventory, "mercado")).toBe(true);
    expect(guest.cleared).toBe(true);
    expect((await account.load())!.money).toBe(120);
  });

  it("sums money and keeps the garden with more blooms when the account has progress", async () => {
    const account = new InMemoryPlayerRepository({
      ...initialPlayerState("Acct", 1),
      money: 50,
      field: bloomGarden(1),
    });
    const svc = new ClaimService(account);

    const guest = guestWith({
      ...initialPlayerState("Guest", 2),
      money: 30,
      field: bloomGarden(4),
    });

    const merged = await svc.claim(guest);
    expect(merged.money).toBe(80);
    expect(totalBlooms(merged.field)).toBe(4);
  });

  it("no-ops gracefully when there is no guest progress", async () => {
    const account = new InMemoryPlayerRepository({
      ...initialPlayerState("Acct", 1),
      money: 42,
    });
    const svc = new ClaimService(account);
    const guest = guestWith(null);

    const result = await svc.claim(guest);
    expect(result.money).toBe(42);
    expect(guest.cleared).toBe(false);
  });

  it("uses the ClaimGateway (server) to merge when one is provided", async () => {
    const account = new InMemoryPlayerRepository();
    let gatewayCalled = false;
    const gateway = {
      async claim(guest: PlayerState): Promise<PlayerState> {
        gatewayCalled = true;
        return { ...guest, money: guest.money + 1000 };
      },
    };
    const svc = new ClaimService(account, gateway);
    const guest = guestWith({ ...initialPlayerState("Guest", 1), money: 5 });

    const merged = await svc.claim(guest);
    expect(gatewayCalled).toBe(true);
    expect(merged.money).toBe(1005);
    expect(guest.cleared).toBe(true);
  });
});
