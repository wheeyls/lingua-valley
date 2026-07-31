/**
 * HtmlCheckpointView — a group's weekly bloom checkpoint, shown at
 * /organizations/:id/checkpoints/<sunday>.
 *
 * Repurposes the leaderboard's full-screen card styling, but leads with the
 * GROUP's total blooms for the week and lists each member's contribution — a
 * team tally, not an individual ranking (no streaks, no money, no glory).
 *
 * Shows one Monday–Sunday week at a time; Previous/Next step the caller
 * through history (Next is hidden once back at the latest, in-progress week).
 */

export interface CheckpointData {
  groupName: string;
  start: string;
  end: string;
  totalBlooms: number;
  totalFoliage: number;
  rows: { displayName: string; avatarColor: number; blooms: number; foliage: number }[];
  /** True when this is the current (possibly still in-progress) week. */
  isLatest: boolean;
}

export interface CheckpointNav {
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onJumpToLatest: () => void;
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
    this.showLoading();
  }

  showLoading() {
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

  render(data: CheckpointData, nav: CheckpointNav) {
    const body = data.rows.map((r) => this.rowHtml(r)).join("");
    this.root.innerHTML = `
      <div style="max-width:760px;margin:0 auto">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">
          <h1 style="color:#ffe08a;font-size:clamp(22px,5vw,30px)">💐 ${escapeHtml(data.groupName)} checkpoint</h1>
          <a href="/" style="color:#9bc995;font-size:14px">← Back to the game</a>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px">
          <button class="checkpoint-nav-btn" data-nav="prev" style="${navBtnStyle}">← Previous week</button>
          <div style="color:#bcae93;font-size:13px;white-space:nowrap">Week of ${escapeHtml(data.start)} → ${escapeHtml(data.end)}</div>
          ${
            data.isLatest
              ? ""
              : `<button class="checkpoint-nav-btn" data-nav="next" style="${navBtnStyle}">Next week →</button>`
          }
        </div>
        ${
          data.isLatest
            ? '<div style="text-align:center;color:#9bc995;font-size:12px;margin-bottom:16px">This week is still in progress</div>'
            : `<div style="text-align:center;margin-bottom:16px">
                 <button class="checkpoint-nav-btn" data-nav="latest" style="${navBtnStyle}">Jump to latest week →</button>
               </div>`
        }
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div style="flex:1;background:rgba(155,201,149,0.12);border:2px solid #9bc995;border-radius:12px;
                      padding:16px;text-align:center">
            <div style="font-size:clamp(28px,8vw,44px);font-weight:bold;color:#9bc995">${data.totalBlooms}</div>
            <div style="color:#bcae93;font-size:13px">🌸 blooms as a group this week</div>
          </div>
          <div style="flex:1;background:rgba(107,143,71,0.12);border:2px solid #6b8f47;border-radius:12px;
                      padding:16px;text-align:center">
            <div style="font-size:clamp(28px,8vw,44px);font-weight:bold;color:#9bc995">${data.totalFoliage}</div>
            <div style="color:#bcae93;font-size:13px">🍃 foliage gathered this week</div>
          </div>
        </div>
        ${data.rows.length === 0 ? '<p style="color:#9bc995">No members in this group yet.</p>' : ""}
        <div style="display:flex;flex-direction:column;gap:8px">${body}</div>
      </div>`;

    this.root.querySelector('[data-nav="prev"]')?.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      nav.onPrevWeek();
    });
    this.root.querySelector('[data-nav="next"]')?.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      nav.onNextWeek();
    });
    this.root.querySelector('[data-nav="latest"]')?.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      nav.onJumpToLatest();
    });
  }

  private rowHtml(r: {
    displayName: string;
    avatarColor: number;
    blooms: number;
    foliage: number;
  }): string {
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
        <div style="color:#9bc995;font-weight:bold;font-size:15px;flex-shrink:0">🍃 ${r.foliage}</div>
      </div>`;
  }

  destroy() {
    this.root.remove();
  }
}

const navBtnStyle = `
  background:rgba(155,201,149,0.12); color:#9bc995; border:1px solid #9bc995;
  border-radius:8px; padding:6px 12px; font-family:inherit; font-size:13px;
  cursor:pointer; white-space:nowrap; -webkit-tap-highlight-color:transparent;
`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
