/**
 * HtmlRegisterView — secret invite-only registration page.
 * Shown at /register/<UUID>. Creates a new account with email + password.
 */

import "./auth.css";

export class HtmlRegisterView {
  private root: HTMLDivElement;

  constructor(private readonly onRegister: (email: string, password: string) => void) {
    this.root = document.createElement("div");
    this.root.className = "auth-screen";
    this.root.innerHTML = `
      <div class="auth-card">
        <h1>Create Account</h1>
        <div class="subtitle">Invite-only registration</div>
        <input type="email" placeholder="Email" autocomplete="email" />
        <input type="password" placeholder="Password (min 6 characters)" autocomplete="new-password" />
        <button class="btn-register" type="button">Create account</button>
        <div class="error"></div>
        <div class="success"></div>
      </div>
    `;

    const emailInput = this.root.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = this.root.querySelector('input[type="password"]') as HTMLInputElement;
    const btn = this.root.querySelector(".btn-register")!;
    const errorEl = this.root.querySelector(".error")!;

    const submit = () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        errorEl.textContent = "Enter email and password.";
        return;
      }
      if (password.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters.";
        return;
      }
      errorEl.textContent = "";
      btn.textContent = "Creating…";
      (btn as HTMLButtonElement).disabled = true;
      this.onRegister(email, password);
    };

    btn.addEventListener("pointerdown", (e) => { e.stopPropagation(); submit(); });
    passwordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    document.body.appendChild(this.root);
    emailInput.focus();
  }

  showError(msg: string) {
    const errorEl = this.root.querySelector(".error")!;
    errorEl.textContent = msg;
    const successEl = this.root.querySelector(".success")!;
    successEl.textContent = "";
    const btn = this.root.querySelector(".btn-register") as HTMLButtonElement;
    btn.textContent = "Create account";
    btn.disabled = false;
  }

  showSuccess() {
    const successEl = this.root.querySelector(".success")!;
    successEl.textContent = "Account created! You can now sign in at the main page.";
    const errorEl = this.root.querySelector(".error")!;
    errorEl.textContent = "";
    const btn = this.root.querySelector(".btn-register") as HTMLButtonElement;
    btn.textContent = "Create account";
    btn.disabled = false;
  }

  destroy() {
    this.root.remove();
  }
}
