/**
 * HtmlCheckpointView — a group's weekly bloom checkpoint, shown at
 * /organizations/:id/checkpoints/<sunday>.
 *
 * Repurposes the leaderboard's full-screen card styling, but leads with the
 * GROUP's total blooms for the week and lists each member's contribution — a
 * team tally, not an individual ranking (no streaks, no money, no glory).
 */

export interface CheckpointData {
  groupName: string;
  start: string;
  end: string;
  totalBlooms: number;
  rows: { displayName: string; avatarColor: number; blooms: number }[];
}

export class HtmlCheckpointView {
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
        Loading checkpoint…
      </div>`;
  }

  showError(message: string) {
    this.root.innerHTML = `
      <div style="max-width:760px;margin:0 auto;text-align:center;padding-top:60px">
        <h2 style="color:#ffe08a;margin-bottom:8px">Checkpoint</h2>
        <p style="color:#b56576">${escapeHtml(message)}</p>
        <a href="/" style="color:#9bc995">← Back to the game</a>
      </div>`;
  }

  render(data: CheckpointData) {
    const body = data.rows.map((r) => this.rowHtml(r)).join("");
    this.root.innerHTML = `
      <div style="max-width:760px;margin:0 auto">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">
          <h1 style="color:#ffe08a;font-size:clamp(22px,5vw,30px)">🌸 ${escapeHtml(data.groupName)} checkpoint</h1>
          <a href="/" style="color:#9bc995;font-size:14px">← Back to the game</a>
        </div>
        <div style="color:#bcae93;font-size:13px;margin-bottom:16px">Week of ${escapeHtml(data.start)} → ${escapeHtml(data.end)}</div>
        <div style="background:rgba(155,201,149,0.12);border:2px solid #9bc995;border-radius:12px;
                    padding:16px;margin-bottom:16px;text-align:center">
          <div style="font-size:clamp(28px,8vw,44px);font-weight:bold;color:#9bc995">${data.totalBlooms}</div>
          <div style="color:#bcae93;font-size:13px">blooms as a group this week</div>
        </div>
        ${data.rows.length === 0 ? '<p style="color:#9bc995">No members in this group yet.</p>' : ""}
        <div style="display:flex;flex-direction:column;gap:8px">${body}</div>
      </div>`;
  }

  private rowHtml(r: { displayName: string; avatarColor: number; blooms: number }): string {
    const color = `#${(r.avatarColor >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
    const initial = (r.displayName[0] ?? "?").toUpperCase();
    return `
      <div style="display:flex;align-items:center;gap:12px;background:rgba(26,20,35,0.82);
                  border:2px solid #3a2f1e;border-radius:12px;padding:12px 14px">
        <div style="width:34px;height:34px;border-radius:50%;background:${color};
                    display:flex;align-items:center;justify-content:center;font-weight:bold;
                    color:#1a1423;flex-shrink:0">${escapeHtml(initial)}</div>
        <div style="flex:1;min-width:0;font-weight:bold;font-size:16px;overflow:hidden;
                    text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.displayName)}</div>
        <div style="color:#9bc995;font-weight:bold;font-size:15px;flex-shrink:0">🌸 ${r.blooms}</div>
      </div>`;
  }

  destroy() {
    this.root.remove();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
