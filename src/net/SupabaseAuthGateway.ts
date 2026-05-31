/**
 * SupabaseAuthGateway — AuthGateway over Supabase Auth.
 *
 * Default state is a guest (no Supabase session). signIn() triggers an OAuth /
 * magic-link flow; on an active session we report a real account. Translates
 * Supabase user → domain AuthUser; no game rules.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthGateway, AuthUser } from "../domain/ports";

export interface SignInOptions {
  /** "google" for OAuth, or an email for magic-link. */
  method: "google" | { email: string };
  redirectTo?: string;
}

export class SupabaseAuthGateway implements AuthGateway {
  private user: AuthUser;
  private listeners = new Set<(u: AuthUser) => void>();

  constructor(
    private readonly sb: SupabaseClient,
    guestId: string,
    private readonly defaultSignIn: SignInOptions = { method: "google" },
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

  async signIn(): Promise<AuthUser> {
    const opts = this.defaultSignIn;
    if (opts.method === "google") {
      await this.sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: opts.redirectTo ?? window.location.origin },
      });
    } else {
      await this.sb.auth.signInWithOtp({
        email: opts.method.email,
        options: { emailRedirectTo: opts.redirectTo ?? window.location.origin },
      });
    }
    // OAuth/magic-link complete via redirect; onAuthStateChange updates state.
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
