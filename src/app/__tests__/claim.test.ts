import { describe, it, expect } from "vitest";
import { ClaimService, type GuestSource } from "../ClaimService";
import { InMemoryPlayerRepository } from "../../net/fakes/InMemoryPlayerRepository";
import { initialPlayerState, type PlayerState } from "../../domain/player";
import { plantSeed } from "../../domain/field";
import { add as addItem, ticketId, hasTicketTo } from "../../domain/inventory";

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
    const account = new InMemoryPlayerRepository(); // brand-new account
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

  it("sums money and keeps the more-grown field when the account has progress", async () => {
    let accountField = initialPlayerState().field;
    accountField = plantSeed(accountField, "g", "2025-06-01");
    accountField.slots[0]!.growth = 1;
    const account = new InMemoryPlayerRepository({
      ...initialPlayerState("Acct", 1),
      money: 50,
      field: accountField,
    });
    const svc = new ClaimService(account);

    let guestField = initialPlayerState().field;
    guestField = plantSeed(guestField, "g", "2025-06-01");
    guestField.slots[0]!.growth = 4;
    const guest = guestWith({
      ...initialPlayerState("Guest", 2),
      money: 30,
      field: guestField,
    });

    const merged = await svc.claim(guest);
    expect(merged.money).toBe(80);
    expect(merged.field.slots[0]!.growth).toBe(4); // guest more grown
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
    // The account repo would be RLS-blocked on cloud, so the gateway owns the
    // merge+persist. We assert the gateway is used and its result is returned.
    const account = new InMemoryPlayerRepository();
    let gatewayCalled = false;
    const gateway = {
      async claim(guest: PlayerState): Promise<PlayerState> {
        gatewayCalled = true;
        return { ...guest, money: guest.money + 1000 }; // server-merged result
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
