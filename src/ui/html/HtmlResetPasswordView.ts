/**
 * HtmlResetPasswordView — shown at /reset-password after the user clicks the
 * Supabase password-reset email link. Supabase exchanges the token for a
 * session automatically (via detectSessionInUrl), so we just need to collect
 * the new password and call updateUser.
 */

import "./auth.css";

export class HtmlResetPasswordView {
  private root: HTMLDivElement;

  constructor(private readonly onUpdate: (newPassword: string) => Promise<void>) {
    this.root = document.createElement("div");
    this.root.className = "auth-screen";
    this.root.innerHTML = `
      <div class="auth-card">
        <h1>New Password</h1>
        <div class="subtitle">Choose a new password for your account</div>
        <input type="password" placeholder="New password (min 6 characters)" autocomplete="new-password" />
        <input type="password" placeholder="Confirm new password" autocomplete="new-password" />
        <button class="btn-login" type="button">Update password</button>
        <div class="error"></div>
        <div class="success"></div>
      </div>
    `;

    const inputs = this.root.querySelectorAll('input[type="password"]') as NodeListOf<HTMLInputElement>;
    const [passwordInput, confirmInput] = Array.from(inputs);
    const btn = this.root.querySelector(".btn-login") as HTMLButtonElement;
    const errorEl = this.root.querySelector(".error")!;
    const successEl = this.root.querySelector(".success")!;

    const submit = async () => {
      const password = passwordInput.value;
      const confirm = confirmInput.value;
      if (!password || !confirm) {
        errorEl.textContent = "Please fill in both password fields.";
        return;
      }
      if (password.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters.";
        return;
      }
      if (password !== confirm) {
        errorEl.textContent = "Passwords do not match.";
        return;
      }
      errorEl.textContent = "";
      successEl.textContent = "";
      btn.textContent = "Updating…";
      btn.disabled = true;
      try {
        await this.onUpdate(password);
        successEl.textContent = "Password updated! Taking you to the game…";
        btn.textContent = "Done!";
      } catch (err) {
        errorEl.textContent = err instanceof Error ? err.message : "Could not update password.";
        btn.textContent = "Update password";
        btn.disabled = false;
      }
    };

    btn.addEventListener("pointerdown", (e) => { e.stopPropagation(); void submit(); });
    confirmInput.addEventListener("keydown", (e) => { if (e.key === "Enter") void submit(); });

    document.body.appendChild(this.root);
    passwordInput.focus();
  }

  destroy() {
    this.root.remove();
  }
}
