/**
 * Entry point — routes between:
 *  - /organizations/:id/register  → group-scoped registration page
 *  - /                            → login wall → game
 */

import { composeApp } from "./app/composition";
import { GameController } from "./app/GameController";
import { HtmlLoginView } from "./ui/html/HtmlLoginView";
import { HtmlRegisterView } from "./ui/html/HtmlRegisterView";
import { HtmlLeaderboardView } from "./ui/html/HtmlLeaderboardView";
import { HtmlCheckpointView } from "./ui/html/HtmlCheckpointView";
import { HtmlForgotPasswordView } from "./ui/html/HtmlForgotPasswordView";
import { HtmlResetPasswordView } from "./ui/html/HtmlResetPasswordView";
import { getSupabase, getAccessToken } from "./net/supabaseClient";
import { SupabaseAuthGateway } from "./net/SupabaseAuthGateway";
import { isCheckpointSunday } from "./domain/checkpoint";

async function main() {
  const path = window.location.pathname;

  // --- Password reset landing page (user clicked the link in the reset email) ---
  if (path.replace(/\/$/, "") === "/reset-password") {
    const sb = getSupabase();
    if (!sb) {
      document.body.innerHTML = '<div style="color:#f4ecd8;font-family:sans-serif;padding:40px;text-align:center"><h2>Password reset unavailable</h2></div>';
      return;
    }
    // SupabaseAuthGateway constructor hooks onAuthStateChange, which handles
    // the token exchange from the URL fragment automatically (detectSessionInUrl).
    const auth = new SupabaseAuthGateway(sb, "reset");
    const resetView = new HtmlResetPasswordView(async (newPassword) => {
      await auth.updatePassword(newPassword);
      // Brief pause so the user sees the success message, then go to the game.
      setTimeout(() => { window.location.href = "/"; }, 1500);
    });
    // Keep resetView in scope so it isn't GC'd before the user submits.
    void resetView;
    return;
  }

  // --- Group-scoped registration route: /organizations/:id/register ---
  const orgMatch = path.match(/^\/organizations\/([^/]+)\/register\/?$/);
  if (orgMatch) {
    const groupId = decodeURIComponent(orgMatch[1]);
    const sb = getSupabase();
    if (!sb) {
      document.body.innerHTML = '<div style="color:#f4ecd8;font-family:sans-serif;padding:40px;text-align:center"><h2>Registration unavailable</h2></div>';
      return;
    }
    const { data } = await sb.from("groups").select("id,name").eq("id", groupId).maybeSingle();
    const group = data as { id: string; name: string } | null;
    if (!group) {
      document.body.innerHTML = '<div style="color:#f4ecd8;font-family:sans-serif;padding:40px;text-align:center"><h2>Not found</h2></div>';
      return;
    }
    const auth = new SupabaseAuthGateway(sb, "reg");
    new HtmlRegisterView(group.name, async (email, password) => {
      try {
        await auth.register(email, password, group.id);
        window.location.href = "/";
      } catch (err) {
        const errEl = document.querySelector(".error");
        if (errEl) errEl.textContent = err instanceof Error ? err.message : "Registration failed";
        const btn = document.querySelector(".btn-register") as HTMLButtonElement | null;
        if (btn) { btn.textContent = "Create account"; btn.disabled = false; }
      }
    });
    return;
  }

  // --- Group weekly checkpoint: /organizations/:id/checkpoints/:date ---
  const checkpointMatch = path.match(/^\/organizations\/([^/]+)\/checkpoints\/([^/]+)\/?$/);
  if (checkpointMatch) {
    const groupId = decodeURIComponent(checkpointMatch[1]);
    const date = decodeURIComponent(checkpointMatch[2]);
    if (!isCheckpointSunday(date)) {
      document.body.innerHTML = '<div style="color:#f4ecd8;font-family:sans-serif;padding:40px;text-align:center"><h2>Not found</h2></div>';
      return;
    }
    const app = await composeApp();
    const auth = app.adapters.auth;
    const open = () => showCheckpoint(groupId, date);
    if (!auth.current().isGuest) {
      void open();
      return;
    }
    // Gate behind the login wall like the leaderboard.
    const loginView = new HtmlLoginView(
      async (email, password) => {
        try {
          await auth.signIn(email, password);
          loginView.destroy();
          void open();
        } catch (err) {
          loginView.showError(err instanceof Error ? err.message : "Sign in failed");
        }
      },
      () => showForgotPassword(auth, loginView),
    );
    return;
  }

  // --- Hidden leaderboard route (no UI link; reach it by URL) ---
  if (path.replace(/\/$/, "") === "/leaderboard") {
    const app = await composeApp();
    const auth = app.adapters.auth;
    if (!auth.current().isGuest) {
      void showLeaderboard();
      return;
    }
    // Gate behind the login wall like the game.
    const loginView = new HtmlLoginView(
      async (email, password) => {
        try {
          await auth.signIn(email, password);
          loginView.destroy();
          void showLeaderboard();
        } catch (err) {
          loginView.showError(err instanceof Error ? err.message : "Sign in failed");
        }
      },
      () => showForgotPassword(auth, loginView),
    );
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
  const loginView = new HtmlLoginView(
    async (email, password) => {
      try {
        await auth.signIn(email, password);
        loginView.destroy();
        startGame(app);
      } catch (err) {
        loginView.showError(err instanceof Error ? err.message : "Sign in failed");
      }
    },
    () => showForgotPassword(auth, loginView),
  );
}

/**
 * Show the "Forgot password?" flow over the existing login view.
 * The login view is hidden (not destroyed) while the forgot-password card is up,
 * and restored if the user presses Back.
 */
function showForgotPassword(
  auth: { resetPasswordForEmail(email: string): Promise<void> },
  loginView: HtmlLoginView,
): void {
  loginView.hide();
  const forgotView = new HtmlForgotPasswordView(
    (email) => auth.resetPasswordForEmail(email),
    () => {
      forgotView.destroy();
      loginView.show();
    },
  );
}

/** Fetch + render the leaderboard (assumes a signed-in session). */
async function showLeaderboard() {
  const view = new HtmlLeaderboardView();
  try {
    const token = await getAccessToken();
    const res = await fetch("/api/leaderboard", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Leaderboard unavailable (${res.status})`);
    const data = (await res.json()) as { rows: Parameters<typeof view.render>[0] };
    view.render(data.rows);
  } catch (err) {
    view.showError(err instanceof Error ? err.message : "Could not load leaderboard");
  }
}

/** Fetch + render a group's weekly checkpoint (assumes a signed-in session). */
async function showCheckpoint(groupId: string, date: string) {
  const view = new HtmlCheckpointView();
  try {
    const token = await getAccessToken();
    const res = await fetch(
      `/api/checkpoint?group=${encodeURIComponent(groupId)}&date=${encodeURIComponent(date)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (res.status === 404) {
      view.showError("No checkpoint here.");
      return;
    }
    if (!res.ok) throw new Error(`Checkpoint unavailable (${res.status})`);
    const raw = (await res.json()) as {
      group: { id: string; name: string };
      start: string;
      end: string;
      totalBlooms: number;
      rows: { displayName: string; avatarColor: number; blooms: number }[];
    };
    view.render({
      groupName: raw.group.name,
      start: raw.start,
      end: raw.end,
      totalBlooms: raw.totalBlooms,
      rows: raw.rows,
    });
  } catch (err) {
    view.showError(err instanceof Error ? err.message : "Could not load checkpoint");
  }
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
