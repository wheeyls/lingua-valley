/**
 * HtmlDevPanel — a dev-only control panel shown ONLY under the fakes profile
 * (?dev=fakes). It drives the farming loop straight through the domain
 * (PlayerService.completeActivity) so you can prove plant / bloom / wither /
 * row-rollover without a voice conversation or any /api call, and advance the
 * fake clock to jump days. Never constructed in guest/cloud builds.
 */

export interface DevPanelCallbacks {
  onSeeds: () => void;
  onWater: () => void;
  onStore: () => void;
  onAdvanceDay: (days: number) => void;
}

export class HtmlDevPanel {
  private root: HTMLDivElement;
  private statusEl: HTMLDivElement;

  constructor(cb: DevPanelCallbacks) {
    this.root = document.createElement("div");
    this.root.className = "dev-panel";
    this.root.style.cssText = `
      position:fixed; left:12px; bottom:max(12px,env(safe-area-inset-bottom,0px));
      z-index:40; background:rgba(20,16,28,0.94); color:#f4ecd8;
      border:1px solid #4a7c59; border-radius:12px; padding:10px 12px;
      font-family:"Trebuchet MS",sans-serif; font-size:13px;
      box-shadow:0 6px 24px rgba(0,0,0,0.4); max-width:min(92vw,340px);
    `;

    const title = document.createElement("div");
    title.textContent = "🛠 dev harness (fakes)";
    title.style.cssText = "font-weight:bold;color:#ffe08a;margin-bottom:6px;font-size:12px;";
    this.root.appendChild(title);

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;";
    actions.append(
      this.button("🌱 Seeds", cb.onSeeds),
      this.button("💧 Water", cb.onWater),
      this.button("🛒 Store", cb.onStore),
    );
    this.root.appendChild(actions);

    const days = document.createElement("div");
    days.style.cssText = "display:flex;gap:6px;margin-bottom:6px;";
    days.append(
      this.button("＋ Day", () => cb.onAdvanceDay(1)),
      this.button("－ Day", () => cb.onAdvanceDay(-1)),
    );
    this.root.appendChild(days);

    this.statusEl = document.createElement("div");
    this.statusEl.style.cssText = "color:#9bc995;font-size:11px;line-height:1.4;";
    this.root.appendChild(this.statusEl);

    document.body.appendChild(this.root);
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  destroy(): void {
    this.root.remove();
  }

  private button(label: string, onTap: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = `
      background:#3a2f1e; color:#f4ecd8; border:1px solid #d9b08c; border-radius:8px;
      padding:6px 10px; font-family:inherit; font-size:12px; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    `;
    b.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      onTap();
    });
    return b;
  }
}
