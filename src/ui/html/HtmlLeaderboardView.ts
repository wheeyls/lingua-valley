/**
 * HtmlLeaderboardView — full-screen leaderboard at /leaderboard.
 *
 * Hidden route: there's no link to it anywhere in the game UI; you reach it by
 * typing the URL. Requires a signed-in session (the API enforces auth too).
 * Renders every player's status ranked by overall progress.
 */

import type { LeaderboardRow } from "../../domain/leaderboard";

export class HtmlLeaderboardView {
  private root: HTMLDivElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.style.cssText = `
      position:fixed; inset:0; overflow:auto; z-index:10;
      background:#1a1423; color:#f4ecd8;
      font-family:"Trebuchet MS","Segoe UI",system-ui,sans-serif;
      padding:24px max(16px,env(safe-area-inset-left)) 48px;
    `;
    document.body.appendChild(this.root);
    this.renderLoading();
  }

  private renderLoading() {
    this.root.innerHTML = `
      <div style="max-width:760px;margin:0 auto;text-align:center;padding-top:60px;color:#9bc995">
        Loading leaderboard…
      </div>`;
  }

  showError(message: string) {
    this.root.innerHTML = `
      <div style="max-width:760px;margin:0 auto;text-align:center;padding-top:60px">
        <h2 style="color:#ffe08a;margin-bottom:8px">Leaderboard</h2>
        <p style="color:#b56576">${escapeHtml(message)}</p>
        <a href="/" style="color:#9bc995">← Back to the game</a>
      </div>`;
  }

  render(rows: LeaderboardRow[]) {
    const body = rows.map((r, i) => this.rowHtml(r, i + 1)).join("");
    this.root.innerHTML = `
      <div style="max-width:760px;margin:0 auto">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px">
          <h1 style="color:#ffe08a;font-size:clamp(22px,5vw,30px)">🏆 Leaderboard</h1>
          <a href="/" style="color:#9bc995;font-size:14px">← Back to the game</a>
        </div>
        ${rows.length === 0 ? '<p style="color:#9bc995">No players yet.</p>' : ""}
        <div style="display:flex;flex-direction:column;gap:8px">${body}</div>
      </div>`;
  }

  private rowHtml(r: LeaderboardRow, rank: number): string {
    const color = `#${(r.avatarColor >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
    const initial = (r.displayName[0] ?? "?").toUpperCase();
    const pct = Math.round(r.growthPct * 100);
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;

    return `
      <div style="display:flex;align-items:center;gap:12px;background:rgba(26,20,35,0.82);
                  border:2px solid ${r.ticket ? "#9bc995" : "#3a2f1e"};border-radius:12px;
                  padding:12px 14px">
        <div style="width:28px;text-align:center;font-weight:bold;color:#ffe08a;flex-shrink:0">${medal}</div>
        <div style="width:34px;height:34px;border-radius:50%;background:${color};
                    display:flex;align-items:center;justify-content:center;font-weight:bold;
                    color:#1a1423;flex-shrink:0">${escapeHtml(initial)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:bold;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${escapeHtml(r.displayName)} ${r.ticket ? "🚂" : ""}
          </div>
          <div style="font-size:12px;color:#bcae93;display:flex;gap:10px;flex-wrap:wrap;margin-top:2px">
            <span>💰 ${r.money}</span>
            <span>🌸 ${r.growth} blooms (${pct}%)</span>
            <span>📅 today ${r.doneToday}/${r.totalToday}</span>
            <span>🔥 ${r.streak}d streak</span>
            <span>${lastActiveLabel(r.lastActive)}</span>
          </div>
        </div>
      </div>`;
  }

  destroy() {
    this.root.remove();
  }
}

function lastActiveLabel(iso: string): string {
  if (!iso) return "never played";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "active now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
