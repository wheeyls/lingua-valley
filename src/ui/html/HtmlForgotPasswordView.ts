/**
 * HtmlForgotPasswordView — shown when the user clicks "Forgot password?" on
 * the login wall. Accepts an email address, sends a Supabase reset link, then
 * shows a confirmation message.
 */

import "./auth.css";

export class HtmlForgotPasswordView {
  private root: HTMLDivElement;

  constructor(
    private readonly onSend: (email: string) => Promise<void>,
    private readonly onBack: () => void,
  ) {
    this.root = document.createElement("div");
    this.root.className = "auth-screen";
    this.root.innerHTML = `
      <div class="auth-card">
        <h1>Reset Password</h1>
        <div class="subtitle">We'll email you a reset link</div>
        <input type="email" placeholder="Email" autocomplete="email" />
        <button class="btn-login" type="button">Send reset link</button>
        <button class="btn-back" type="button">Back to sign in</button>
        <div class="error"></div>
        <div class="success"></div>
      </div>
    `;

    const emailInput = this.root.querySelector('input[type="email"]') as HTMLInputElement;
    const sendBtn = this.root.querySelector(".btn-login") as HTMLButtonElement;
    const backBtn = this.root.querySelector(".btn-back") as HTMLButtonElement;
    const errorEl = this.root.querySelector(".error")!;
    const successEl = this.root.querySelector(".success")!;

    const submit = async () => {
      const email = emailInput.value.trim();
      if (!email) {
        errorEl.textContent = "Enter your email address.";
        return;
      }
      errorEl.textContent = "";
      successEl.textContent = "";
      sendBtn.textContent = "Sending…";
      sendBtn.disabled = true;
      try {
        await this.onSend(email);
        successEl.textContent = "Check your email for a password reset link.";
        sendBtn.textContent = "Sent!";
      } catch (err) {
        errorEl.textContent = err instanceof Error ? err.message : "Could not send reset email.";
        sendBtn.textContent = "Send reset link";
        sendBtn.disabled = false;
      }
    };

    sendBtn.addEventListener("pointerdown", (e) => { e.stopPropagation(); void submit(); });
    backBtn.addEventListener("pointerdown", (e) => { e.stopPropagation(); this.onBack(); });
    emailInput.addEventListener("keydown", (e) => { if (e.key === "Enter") void submit(); });

    document.body.appendChild(this.root);
    emailInput.focus();
  }

  destroy() {
    this.root.remove();
  }
}
