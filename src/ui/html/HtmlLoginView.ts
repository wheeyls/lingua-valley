/**
 * HtmlLoginView — login wall shown before the game starts.
 * Email + password form. No link to registration (invite-only).
 */

import "./auth.css";

export class HtmlLoginView {
  private root: HTMLDivElement;

  constructor(private readonly onLogin: (email: string, password: string) => void) {
    this.root = document.createElement("div");
    this.root.className = "auth-screen";
    this.root.innerHTML = `
      <div class="auth-card">
        <h1>Lingua Valley</h1>
        <div class="subtitle">Learn Spanish by talking</div>
        <input type="email" placeholder="Email" autocomplete="email" />
        <input type="password" placeholder="Password" autocomplete="current-password" />
        <button class="btn-login" type="button">Sign in</button>
        <div class="error"></div>
      </div>
    `;

    const emailInput = this.root.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = this.root.querySelector('input[type="password"]') as HTMLInputElement;
    const btn = this.root.querySelector(".btn-login")!;
    const errorEl = this.root.querySelector(".error")!;

    const submit = () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        errorEl.textContent = "Enter your email and password.";
        return;
      }
      errorEl.textContent = "";
      btn.textContent = "Signing in…";
      (btn as HTMLButtonElement).disabled = true;
      this.onLogin(email, password);
    };

    btn.addEventListener("pointerdown", (e) => { e.stopPropagation(); submit(); });
    passwordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    document.body.appendChild(this.root);
    emailInput.focus();
  }

  showError(msg: string) {
    const errorEl = this.root.querySelector(".error")!;
    errorEl.textContent = msg;
    const btn = this.root.querySelector(".btn-login") as HTMLButtonElement;
    btn.textContent = "Sign in";
    btn.disabled = false;
  }

  destroy() {
    this.root.remove();
  }
}
