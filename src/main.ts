/**
 * Entry point — routes between:
 *  - /register/<secret>  → invite-only registration page
 *  - /                   → login wall → game
 */

import { composeApp } from "./app/composition";
import { GameController } from "./app/GameController";
import { HtmlLoginView } from "./ui/html/HtmlLoginView";
import { HtmlRegisterView } from "./ui/html/HtmlRegisterView";
import { getSupabase } from "./net/supabaseClient";
import { SupabaseAuthGateway } from "./net/SupabaseAuthGateway";

const REGISTRATION_SECRET = import.meta.env.VITE_REGISTRATION_SECRET ?? "";

async function main() {
  const path = window.location.pathname;

  // --- Secret registration route ---
  if (path.startsWith("/register/")) {
    const secret = path.split("/register/")[1]?.replace(/\/$/, "");
    if (!REGISTRATION_SECRET || secret !== REGISTRATION_SECRET) {
      document.body.innerHTML = '<div style="color:#f4ecd8;font-family:sans-serif;padding:40px;text-align:center"><h2>Not found</h2></div>';
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      document.body.innerHTML = '<div style="color:#f4ecd8;font-family:sans-serif;padding:40px;text-align:center"><h2>Registration unavailable</h2></div>';
      return;
    }
    const auth = new SupabaseAuthGateway(sb, "reg");
    const view = new HtmlRegisterView(async (email, password) => {
      try {
        await auth.register(email, password);
        view.showSuccess();
      } catch (err) {
        view.showError(err instanceof Error ? err.message : "Registration failed");
      }
    });
    return;
  }

  // --- Main app: login wall → game ---
  const app = await composeApp();
  const auth = app.adapters.auth;

  // If already signed in (session persisted), skip the login wall.
  if (!auth.current().isGuest) {
    startGame(app);
    return;
  }

  // Show login wall.
  const loginView = new HtmlLoginView(async (email, password) => {
    try {
      await auth.signIn(email, password);
      loginView.destroy();
      startGame(app);
    } catch (err) {
      loginView.showError(err instanceof Error ? err.message : "Sign in failed");
    }
  });
}

function startGame(app: Awaited<ReturnType<typeof composeApp>>) {
  const controller = new GameController(app.player, app.adapters);
  controller.start();
}

main().catch((err) => {
  console.error("[main] fatal error:", err);
  document.body.innerHTML =
    '<div style="color:#f4ecd8;font-family:sans-serif;padding:24px;text-align:center;max-width:480px">' +
    "<h2>Something went wrong</h2>" +
    `<p style="color:#b56576">${err instanceof Error ? err.message : err}</p></div>`;
});
