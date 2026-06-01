/**
 * FakeAuthGateway — instant, scriptable auth for tests and the dev harness.
 * Starts as a guest; signIn() resolves immediately to a fake account so the
 * guest->account claim flow can be exercised without a real provider.
 */

import type { AuthGateway, AuthUser } from "../../domain/ports";

export class FakeAuthGateway implements AuthGateway {
  private user: AuthUser;
  private listeners = new Set<(u: AuthUser) => void>();

  constructor(
    guestId = "guest_fake",
    private nextAccount: AuthUser = {
      id: "user_fake",
      displayName: "Aprendiz",
      isGuest: false,
    },
  ) {
    this.user = { id: guestId, displayName: "Invitado", isGuest: true };
  }

  current(): AuthUser {
    return this.user;
  }

  async signIn(email?: string): Promise<AuthUser> {
    this.user = email
      ? { ...this.nextAccount, displayName: email }
      : { ...this.nextAccount };
    this.emit();
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = { id: "guest_fake", displayName: "Invitado", isGuest: true };
    this.emit();
  }

  onChange(listener: (u: AuthUser) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Test helper: configure the account returned by the next signIn. */
  setNextAccount(user: AuthUser): void {
    this.nextAccount = user;
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.user);
  }
}
