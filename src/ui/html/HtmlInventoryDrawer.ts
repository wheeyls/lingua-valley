/**
 * HtmlInventoryDrawer — bottom-sheet panel for the campaign's growable
 * resources (garden/foliage/ribbons — "Your Balloons"/"Your Confetti"/etc,
 * campaign-themed via ResourceTheme). These used to sit inline below the
 * map, always visible; a campaign can define more than three, and on
 * mobile they crowded out the map. Now they live behind a trigger button
 * (owned by HtmlWorldView) and are closed by default.
 *
 * Card rendering/behavior (grid cells, hint text, onTap) is unchanged from
 * the old inline row — this is a relocation, not a redesign.
 */

import "./inventoryDrawer.css";

/** A live, state-driven card injected by the controller (the garden, etc). */
export interface ExtraCard {
  id: string;
  icon: string;
  label: string;
  hint: string;
  grid?: string[][];
  onTap: () => void;
}

export class HtmlInventoryDrawer {
  private backdropEl: HTMLDivElement;
  private sheetEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private cards: ExtraCard[] = [];
  private isOpen = false;

  constructor() {
    this.backdropEl = document.createElement("div");
    this.backdropEl.className = "drawer-backdrop";
    this.backdropEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.close();
    });

    this.sheetEl = document.createElement("div");
    this.sheetEl.className = "drawer-sheet";
    this.sheetEl.innerHTML = `
      <div class="drawer-handle"></div>
      <div class="drawer-header">
        <span class="drawer-title">Your Things</span>
        <button class="drawer-close-btn" type="button">✕</button>
      </div>
      <div class="drawer-body"></div>
    `;
    // Taps inside the sheet shouldn't bubble to the backdrop and close it.
    this.sheetEl.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.sheetEl.querySelector(".drawer-close-btn")!.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.close();
    });

    this.bodyEl = this.sheetEl.querySelector(".drawer-body")!;

    document.body.appendChild(this.backdropEl);
    document.body.appendChild(this.sheetEl);
  }

  setCards(cards: ExtraCard[]): void {
    this.cards = cards;
    this.renderCards();
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.show();
  }

  show(): void {
    this.isOpen = true;
    this.backdropEl.classList.add("drawer-backdrop-open");
    this.sheetEl.classList.add("drawer-sheet-open");
  }

  close(): void {
    this.isOpen = false;
    this.backdropEl.classList.remove("drawer-backdrop-open");
    this.sheetEl.classList.remove("drawer-sheet-open");
  }

  destroy(): void {
    this.backdropEl.remove();
    this.sheetEl.remove();
  }

  private renderCards(): void {
    this.bodyEl.innerHTML = "";
    for (const card of this.cards) {
      const el = document.createElement("div");
      el.className = card.grid ? "card card-item card-garden" : "card card-item";
      const visual = card.grid
        ? `<div class="garden-grid">${card.grid
            .map(
              (row) =>
                `<div class="garden-row">${row
                  .map((cell) => `<span class="garden-cell">${cell}</span>`)
                  .join("")}</div>`,
            )
            .join("")}</div>`
        : `<div class="card-icon-text">${card.icon}</div>`;
      el.innerHTML = `
        ${visual}
        <div class="card-label">${card.label}</div>
        <div class="card-hint">${card.hint}</div>
      `;
      el.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        card.onTap();
      });
      this.bodyEl.appendChild(el);
    }
  }
}
