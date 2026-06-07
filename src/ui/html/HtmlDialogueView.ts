/**
 * HtmlDialogueView — renders the NPC dialogue bottom-sheet as HTML overlaid on
 * the canvas. High-contrast, large text, solid background.
 */

import "./overlay.css";

export interface DialogueViewCallbacks {
  onContinue: () => void;
  onLeave: () => void;
  onTrade?: () => void;
}

export interface DialogueViewData {
  npcName: string;
  spanish: string;
  showSpanish: boolean;
  englishHint: string;
  showEnglishHint: boolean;
  lineIndex: number;
  lineCount: number;
  continueLabel: string;
  lessonLabel?: string;
  canTrade?: boolean;
}

export class HtmlDialogueView {
  private root: HTMLDivElement;
  private nameEl: HTMLElement;
  private dotsEl: HTMLElement;
  private spanishEl: HTMLElement;
  private hintEl: HTMLElement;
  private lessonEl: HTMLElement;
  private actionsEl: HTMLElement;
  private callbacks: DialogueViewCallbacks;

  constructor(callbacks: DialogueViewCallbacks) {
    this.callbacks = callbacks;
    this.root = document.createElement("div");
    this.root.className = "overlay dialogue-overlay";
    this.root.innerHTML = `
      <div style="flex:1" data-tap="continue"></div>
      <div class="dialogue-sheet">
        <span class="dialogue-dots"></span>
        <div class="dialogue-name"></div>
        <div class="dialogue-spanish"></div>
        <div class="dialogue-hint"></div>
        <div class="dialogue-lesson"></div>
        <div class="dialogue-actions"></div>
      </div>
    `;

    this.nameEl = this.root.querySelector(".dialogue-name")!;
    this.dotsEl = this.root.querySelector(".dialogue-dots")!;
    this.spanishEl = this.root.querySelector(".dialogue-spanish")!;
    this.hintEl = this.root.querySelector(".dialogue-hint")!;
    this.lessonEl = this.root.querySelector(".dialogue-lesson")!;
    this.actionsEl = this.root.querySelector(".dialogue-actions")!;

    // Tap above the sheet to continue (like tapping a dialogue bubble).
    this.root.querySelector("[data-tap=continue]")!
      .addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        callbacks.onContinue();
      });

    document.body.appendChild(this.root);
  }

  update(data: DialogueViewData): void {
    this.nameEl.textContent = data.npcName;

    const dots = Array.from({ length: data.lineCount }, (_, i) =>
      i === data.lineIndex ? "●" : "○",
    ).join(" ");
    this.dotsEl.textContent = dots;

    if (data.showSpanish) {
      this.spanishEl.textContent = data.spanish;
      this.spanishEl.style.display = "block";
    } else {
      this.spanishEl.textContent = "🔊 (listen — no subtitles out here)";
      this.spanishEl.style.fontStyle = "italic";
      this.spanishEl.style.color = "#8a8290";
      this.spanishEl.style.display = "block";
    }

    if (data.showEnglishHint && data.englishHint) {
      this.hintEl.textContent = `"${data.englishHint}"`;
      this.hintEl.style.display = "block";
    } else {
      this.hintEl.style.display = "none";
    }

    if (data.lessonLabel) {
      this.lessonEl.textContent = `▶ Lesson: ${data.lessonLabel}`;
      this.lessonEl.style.display = "block";
    } else {
      this.lessonEl.style.display = "none";
    }

    // Build action buttons.
    let btns = "";
    if (data.canTrade) {
      btns += `<button class="btn btn-success" data-action="trade">Trade goods</button>`;
    }
    btns += `<button class="btn btn-danger" data-action="leave">Leave</button>`;
    btns += `<button class="btn btn-primary" data-action="continue">${escHtml(data.continueLabel)}</button>`;
    this.actionsEl.innerHTML = btns;

    // Wire action buttons.
    this.actionsEl.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        const action = (el as HTMLElement).dataset.action;
        if (action === "continue") this.callbacks.onContinue();
        else if (action === "leave") this.callbacks.onLeave();
        else if (action === "trade") this.callbacks.onTrade?.();
      });
    });
  }

  destroy(): void {
    this.root.remove();
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
