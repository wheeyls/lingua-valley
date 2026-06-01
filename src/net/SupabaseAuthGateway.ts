/**
 * SupabaseAuthGateway — AuthGateway over Supabase Auth.
 *
 * Default state is a guest (no Supabase session). signIn() triggers an OAuth /
 * magic-link flow; on an active session we report a real account. Translates
 * Supabase user → domain AuthUser; no game rules.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthGateway, AuthUser } from "../domain/ports";

export class SupabaseAuthGateway implements AuthGateway {
  private user: AuthUser;
  private listeners = new Set<(u: AuthUser) => void>();

  constructor(
    private readonly sb: SupabaseClient,
    guestId: string,
    private readonly redirectTo: string | undefined = undefined,
  ) {
    this.user = { id: guestId, displayName: "Invitado", isGuest: true };

    // React to auth state changes (sign-in/out, token refresh).
    this.sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.user = {
          id: session.user.id,
          displayName:
            (session.user.user_metadata?.name as string | undefined) ??
            session.user.email ??
            "Aprendiz",
          isGuest: false,
        };
      } else {
        this.user = { id: guestId, displayName: "Invitado", isGuest: true };
      }
      this.emit();
    });
  }

  current(): AuthUser {
    return this.user;
  }

  /**
   * Send a passwordless magic link to `email`. The session completes when the
   * player clicks the emailed link (onAuthStateChange then updates state).
   * Requires an email; throws if none is provided.
   */
  async signIn(email?: string): Promise<AuthUser> {
    if (!email) throw new Error("Email required for magic-link sign-in");
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: this.redirectTo ?? window.location.origin,
      },
    });
    if (error) throw error;
    return this.user;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  onChange(listener: (u: AuthUser) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.user);
  }
}
