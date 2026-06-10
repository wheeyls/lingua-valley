/**
 * HtmlConversationView — renders the conversation UI as HTML overlaid on the
 * canvas. Uses real DOM text for readability (system fonts, subpixel AA,
 * accessibility, CSS line-height). Driven by the same data the old canvas
 * old canvas renderer used; the just calls update methods instead of setText.
 *
 * High-contrast, large text, solid backgrounds — optimized for older eyes.
 */

import "./overlay.css";
import { blockCanvas, unblockCanvas } from "./canvasBlock";

export interface ConvoViewCallbacks {
  onMicTap: () => void;
  onLeave: () => void;
  /** Tapped the "Continue" button shown when the conversation has ended. */
  onContinue: () => void;
}

export class HtmlConversationView {
  private root: HTMLDivElement;
  private npcNameEl: HTMLElement;
  private friendshipEl: HTMLElement;
  private goalEl: HTMLElement;
  private npcSpeechEl: HTMLElement;
  private transcriptEl: HTMLElement;
  private feedbackEl: HTMLElement;
  private statusEl: HTMLElement;
  private micBtn: HTMLButtonElement;
  private micHint: HTMLElement;
  private callbacks: ConvoViewCallbacks;

  constructor(callbacks: ConvoViewCallbacks) {
    this.root = document.createElement("div");
    this.root.className = "overlay convo-overlay";
    this.root.innerHTML = `
      <div class="convo-header">
        <div class="convo-header-main">
          <div class="convo-npc-name"></div>
          <div class="convo-friendship"></div>
          <div class="convo-goal"></div>
        </div>
        <button class="convo-leave-btn" type="button">Leave</button>
      </div>
      <div class="convo-body">
        <div class="convo-npc-speech"></div>
        <div class="convo-transcript"></div>
        <div class="convo-feedback"></div>
      </div>
      <div class="convo-status"></div>
      <div class="convo-mic-area">
        <button class="mic-btn" type="button">🎤</button>
        <div class="mic-hint">Tap to speak · tap again to send</div>
      </div>
      <div class="convo-actions"></div>
    `;

    this.npcNameEl = this.root.querySelector(".convo-npc-name")!;
    this.friendshipEl = this.root.querySelector(".convo-friendship")!;
    this.goalEl = this.root.querySelector(".convo-goal")!;
    this.npcSpeechEl = this.root.querySelector(".convo-npc-speech")!;
    this.transcriptEl = this.root.querySelector(".convo-transcript")!;
    this.feedbackEl = this.root.querySelector(".convo-feedback")!;
    this.statusEl = this.root.querySelector(".convo-status")!;
    this.micBtn = this.root.querySelector(".mic-btn")!;
    this.micHint = this.root.querySelector(".mic-hint")!;

    this.callbacks = callbacks;
    const leaveBtn = this.root.querySelector(".convo-leave-btn")!;
    leaveBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      callbacks.onLeave();
    });
    this.micBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      callbacks.onMicTap();
    });

    document.body.appendChild(this.root);
    blockCanvas(); // prevent the Phaser canvas from receiving taps while open
  }

  /**
   * The conversation has ended: hide the mic, show the wrap-up message in the
   * body, and replace the action row with a clear "Continue ▶" button so
   * closing is obvious and intentional (no surprise close).
   */
  showEndState(message: string, color: string): void {
    // Hide the mic and the Leave button (no bailing out after completing).
    const micArea = this.root.querySelector(".convo-mic-area") as HTMLElement;
    micArea.style.display = "none";
    const leaveBtn = this.root.querySelector(".convo-leave-btn") as HTMLElement | null;
    if (leaveBtn) leaveBtn.style.display = "none";

    // Show the wrap-up message prominently in the status line.
    this.statusEl.textContent = message;
    this.statusEl.style.color = color;
    this.statusEl.style.fontSize = "20px";
    this.statusEl.style.fontWeight = "bold";

    // Replace the actions row with a single, clear Continue button.
    const actions = this.root.querySelector(".convo-actions") as HTMLElement;
    actions.innerHTML =
      '<button class="btn btn-success" type="button">Continue ▶</button>';
    const continueBtn = actions.querySelector(".btn-success")!;
    continueBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onContinue();
    });
  }

  setHeader(npcName: string, friendship: string, goal: string): void {
    this.npcNameEl.textContent = npcName;
    this.friendshipEl.textContent = friendship ? `♥ ${friendship}` : "";
    this.goalEl.textContent = goal;
  }

  setNpcSpeech(text: string): void {
    this.npcSpeechEl.textContent = text;
    this.npcSpeechEl.style.display = text ? "block" : "none";
    // Scroll to the latest speech.
    this.npcSpeechEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  setTranscript(text: string): void {
    this.transcriptEl.textContent = text;
    this.transcriptEl.style.display = text ? "block" : "none";
  }

  setFeedback(feedback: string, corrections: string, earned: string): void {
    let html = escHtml(feedback);
    if (corrections) html += `<div class="corrections">${escHtml(corrections)}</div>`;
    if (earned) html += `<div class="earned">${escHtml(earned)}</div>`;
    this.feedbackEl.innerHTML = html;
    this.feedbackEl.style.display = feedback ? "block" : "none";
  }

  setStatus(text: string, color?: string): void {
    this.statusEl.textContent = text;
    this.statusEl.style.color = color ?? "#d9b08c";
  }

  setMicRecording(recording: boolean): void {
    this.micBtn.classList.toggle("recording", recording);
    this.micHint.textContent = recording
      ? "Recording… tap to send"
      : "Tap to speak · tap again to send";
  }

  setMicVisible(visible: boolean): void {
    const area = this.root.querySelector(".convo-mic-area") as HTMLElement;
    area.style.display = visible ? "flex" : "none";
  }

  destroy(): void {
    this.root.remove();
    unblockCanvas(); // restore Phaser canvas input after the closing tap clears
  }
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
