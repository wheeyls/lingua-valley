import { describe, it, expect } from "vitest";
import { ClaimService, type GuestSource } from "../ClaimService";
import { InMemoryPlayerRepository } from "../../net/fakes/InMemoryPlayerRepository";
import { initialPlayerState, type PlayerState } from "../../domain/player";

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
      ...initialPlayerState("Guest", 1, "2025-06-01"),
      pesos: 120,
      skills: { speaking: 200, listening: 50, vocab: 30 },
      masteredObjectiveIds: ["a1.greetings"],
    };
    const guest = guestWith(guestState);

    const merged = await svc.claim(guest);

    expect(merged.pesos).toBe(120);
    expect(merged.masteredObjectiveIds).toContain("a1.greetings");
    expect(guest.cleared).toBe(true);
    // Persisted to the account repo.
    expect((await account.load())!.pesos).toBe(120);
  });

  it("sums pesos and unions mastery when the account already has progress", async () => {
    const account = new InMemoryPlayerRepository({
      ...initialPlayerState("Acct", 1, "2025-06-01"),
      pesos: 50,
      masteredObjectiveIds: ["a1.numbers"],
    });
    const svc = new ClaimService(account);

    const guest = guestWith({
      ...initialPlayerState("Guest", 2, "2025-06-01"),
      pesos: 30,
      masteredObjectiveIds: ["a1.greetings"],
    });

    const merged = await svc.claim(guest);
    expect(merged.pesos).toBe(80);
    expect(merged.masteredObjectiveIds.sort()).toEqual(["a1.greetings", "a1.numbers"]);
  });

  it("no-ops gracefully when there is no guest progress", async () => {
    const account = new InMemoryPlayerRepository({
      ...initialPlayerState("Acct", 1, "2025-06-01"),
      pesos: 42,
    });
    const svc = new ClaimService(account);
    const guest = guestWith(null);

    const result = await svc.claim(guest);
    expect(result.pesos).toBe(42);
    expect(guest.cleared).toBe(false);
  });
});
