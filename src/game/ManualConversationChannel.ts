/**
 * ManualConversationChannel — the no-language-service conversation I/O.
 *
 * The "alternate rendering": instead of a mic + transcription + TTS, it mounts a
 * text box so a real conversation can be driven end-to-end by typing, with the
 * fake grader deciding the outcome. Used in the test/local-fakes profiles so the
 * whole turn loop (grading, rewards, daily-state, rendering) can be exercised in
 * the browser without hitting OpenAI or any /api endpoint.
 */

import type { ConversationChannel, ConversationChannelUi } from "./ConversationChannel.js";

export class ManualConversationChannel implements ConversationChannel {
  private onTurn: ((utterance: string) => void) | null = null;
  private input: HTMLInputElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;

  prepare(): void {}

  mountInput(
    container: HTMLElement,
    _ui: ConversationChannelUi,
    onTurn: (utterance: string) => void,
  ): void {
    this.onTurn = onTurn;
    container.innerHTML = `
      <div style="display:flex;gap:8px;width:100%;max-width:520px;margin:0 auto">
        <input class="manual-utterance" type="text" autocomplete="off"
          placeholder="Type your reply (dev mode — no mic/AI)…"
          style="flex:1;min-width:0;padding:10px 12px;font-size:16px;border-radius:8px;
                 border:2px solid #4a7c59;background:#141018;color:#f4ecd8" />
        <button class="manual-send btn" type="button"
          style="padding:10px 16px;border-radius:8px;border:2px solid #4a7c59;
                 background:#2d5a3d;color:#f4ecd8;font-weight:bold">Send</button>
      </div>`;
    this.input = container.querySelector(".manual-utterance");
    this.sendBtn = container.querySelector(".manual-send");

    const submit = () => {
      const text = this.input?.value.trim() ?? "";
      if (!text) return;
      if (this.input) this.input.value = "";
      this.onTurn?.(text);
    };
    this.sendBtn?.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      submit();
    });
    this.input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
    setTimeout(() => this.input?.focus(), 0);
  }

  setBusy(busy: boolean): void {
    if (this.input) this.input.disabled = busy;
    if (this.sendBtn) this.sendBtn.disabled = busy;
    if (!busy) setTimeout(() => this.input?.focus(), 0);
  }

  speak(): Promise<void> {
    return Promise.resolve();
  }

  dispose(): void {
    this.onTurn = null;
    this.input = null;
    this.sendBtn = null;
  }
}
