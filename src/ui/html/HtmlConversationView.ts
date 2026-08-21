/**
 * HtmlConversationView — renders the conversation UI as HTML overlaid on the
 * canvas. Uses real DOM text for readability (system fonts, subpixel AA,
 * accessibility, CSS line-height).
 *
 * The player's input control is NOT owned here: a ConversationChannel mounts it
 * into `inputArea()` (a mic button in voice mode, a text box in manual mode), so
 * this view stays a pure presenter.
 *
 * High-contrast, large text, solid backgrounds — optimized for older eyes.
 */

import "./overlay.css";
import { blockCanvas, unblockCanvas } from "./canvasBlock";
import { npcAvatarSvg } from "../../content/art";

export interface ConvoViewCallbacks {
  onLeave: () => void;
  /** Tapped the "Continue" button shown when the conversation has ended. */
  onContinue: () => void;
}

export class HtmlConversationView {
  private root: HTMLDivElement;
  private npcNameEl: HTMLElement;
  private friendshipEl: HTMLElement;
  private goalEl: HTMLElement;
  private peekBtnWrapEl: HTMLElement;
  private sceneOverlayEl: HTMLElement;
  private speechBubbleEl: HTMLElement;
  private speechPortraitEl: HTMLElement;
  private speechToggleEl: HTMLElement;
  private speechToggleLabelEl: HTMLElement;
  private speechTextEl: HTMLElement;
  private npcSpeechEl: HTMLElement;
  private transcriptEl: HTMLElement;
  private feedbackEl: HTMLElement;
  private statusEl: HTMLElement;
  private callbacks: ConvoViewCallbacks;
  private speechExpanded = false;

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
      <div class="convo-peek-btn-wrap" style="display:none">
        <button class="convo-peek-btn" type="button">👁 Hold to see the room</button>
      </div>
      <div class="convo-scene-overlay">
        <div class="scene-diagram"></div>
        <div class="scene-hint">Release to return to the chat</div>
      </div>
      <div class="convo-body">
        <div class="convo-speech-bubble">
          <button class="convo-speech-toggle" type="button" aria-expanded="false">
            <span class="convo-speech-toggle-label">🔊 Listen — tap for a hint</span>
            <span class="convo-speech-toggle-chevron">▾</span>
          </button>
          <div class="convo-speech-text" style="display:none">
            <div class="convo-npc-speech"></div>
          </div>
          <div class="convo-speech-tail"></div>
        </div>
        <div class="convo-speech-portrait"></div>
        <div class="convo-transcript"></div>
        <div class="convo-feedback"></div>
      </div>
      <div class="convo-status"></div>
      <div class="convo-input-area"></div>
      <div class="convo-actions"></div>
    `;

    this.npcNameEl = this.root.querySelector(".convo-npc-name")!;
    this.friendshipEl = this.root.querySelector(".convo-friendship")!;
    this.goalEl = this.root.querySelector(".convo-goal")!;
    this.peekBtnWrapEl = this.root.querySelector(".convo-peek-btn-wrap")!;
    this.sceneOverlayEl = this.root.querySelector(".convo-scene-overlay")!;
    this.speechBubbleEl = this.root.querySelector(".convo-speech-bubble")!;
    this.speechPortraitEl = this.root.querySelector(".convo-speech-portrait")!;
    this.speechToggleEl = this.root.querySelector(".convo-speech-toggle")!;
    this.speechToggleLabelEl = this.root.querySelector(".convo-speech-toggle-label")!;
    this.speechTextEl = this.root.querySelector(".convo-speech-text")!;
    this.npcSpeechEl = this.root.querySelector(".convo-npc-speech")!;
    this.transcriptEl = this.root.querySelector(".convo-transcript")!;
    this.feedbackEl = this.root.querySelector(".convo-feedback")!;
    this.statusEl = this.root.querySelector(".convo-status")!;

    this.callbacks = callbacks;
    const leaveBtn = this.root.querySelector(".convo-leave-btn")!;
    leaveBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      callbacks.onLeave();
    });

    this.speechToggleEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.setSpeechExpanded(!this.speechExpanded);
    });

    const peekBtn = this.root.querySelector(".convo-peek-btn")!;
    const showScene = (e: Event) => {
      e.stopPropagation();
      this.sceneOverlayEl.classList.add("visible");
    };
    const hideScene = () => this.sceneOverlayEl.classList.remove("visible");
    peekBtn.addEventListener("pointerdown", showScene);
    peekBtn.addEventListener("pointerup", hideScene);
    peekBtn.addEventListener("pointerleave", hideScene);
    peekBtn.addEventListener("pointercancel", hideScene);

    document.body.appendChild(this.root);
    blockCanvas(); // prevent the Phaser canvas from receiving taps while open
  }

  /**
   * The conversation has ended: hide the input, show the wrap-up message in the
   * body, and replace the action row with a clear "Continue ▶" button so
   * closing is obvious and intentional (no surprise close).
   */
  showEndState(message: string, color: string): void {
    // Hide the input control + Leave button (no bailing out after completing).
    const inputArea = this.root.querySelector(".convo-input-area") as HTMLElement;
    inputArea.style.display = "none";
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

  /**
   * The NPC's full-body portrait — always on screen, not tucked behind the
   * hint toggle. Call once, when the conversation opens.
   */
  setNpcAvatar(color: string, initial: string): void {
    this.speechPortraitEl.innerHTML = npcAvatarSvg(color, initial);
  }

  /**
   * Show (or hide, when absent) a "hold to peek" button that reveals `html`
   * — a picture the player can look at while answering — for as long as
   * it's held. `html` is trusted content built by the content layer (e.g.
   * `renderSceneHtml`), not user input.
   */
  setScenePeek(html: string | null): void {
    if (!html) {
      this.peekBtnWrapEl.style.display = "none";
      this.sceneOverlayEl.querySelector(".scene-diagram")!.innerHTML = "";
      return;
    }
    this.peekBtnWrapEl.style.display = "flex";
    this.sceneOverlayEl.querySelector(".scene-diagram")!.innerHTML = html;
  }

  /**
   * A new NPC line has arrived. The text is held ready to reveal, but the
   * overlay always re-collapses first — listening (the audio already plays
   * via TTS) is the default each turn, not reading; a hint is one tap away,
   * not a spoiler shown automatically.
   */
  setNpcSpeech(text: string): void {
    this.npcSpeechEl.textContent = text;
    this.setSpeechExpanded(false);
    this.speechBubbleEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  private setSpeechExpanded(expanded: boolean): void {
    this.speechExpanded = expanded;
    this.speechTextEl.style.display = expanded ? "block" : "none";
    this.speechBubbleEl.classList.toggle("convo-speech-bubble--expanded", expanded);
    this.speechToggleEl.setAttribute("aria-expanded", String(expanded));
    this.speechToggleLabelEl.textContent = expanded
      ? "Tap to hide"
      : "🔊 Listen — tap for a hint";
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

  inputArea(): HTMLElement {
    return this.root.querySelector(".convo-input-area")!;
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
