/**
 * SupabaseAuthGateway — AuthGateway over Supabase Auth.
 *
 * Uses email + password authentication. Registration is invite-only via a
 * secret URL; login is a standard email/password form.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthGateway, AuthUser } from "../domain/ports";

export class SupabaseAuthGateway implements AuthGateway {
  private user: AuthUser;
  private listeners = new Set<(u: AuthUser) => void>();

  constructor(
    private readonly sb: SupabaseClient,
    guestId: string,
  ) {
    this.user = { id: guestId, displayName: "Guest", isGuest: true };

    this.sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.user = {
          id: session.user.id,
          displayName: session.user.email ?? "User",
          isGuest: false,
        };
      } else {
        this.user = { id: guestId, displayName: "Guest", isGuest: true };
      }
      this.emit();
    });
  }

  current(): AuthUser {
    return this.user;
  }

  /** Sign in with email + password. */
  async signIn(email?: string, password?: string): Promise<AuthUser> {
    if (!email || !password) throw new Error("Email and password required");
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return this.user;
  }

  /** Register a new account into a group (called from /organizations/:id/register).
   *  The group id rides along as signup metadata; the handle_new_user() DB trigger
   *  reads it to place the new user in that group. */
  async register(email: string, password: string, groupId: string): Promise<void> {
    const { error } = await this.sb.auth.signUp({
      email,
      password,
      options: { data: { group_id: groupId } },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  /** Send a password-reset email via Supabase Auth. */
  async resetPasswordForEmail(email: string): Promise<void> {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  /** Update password for the session that was established via the reset link. */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  onChange(listener: (u: AuthUser) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.user);
  }
}
