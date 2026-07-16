/**
 * VoiceConversationChannel — the real conversation I/O: microphone in, TTS out.
 *
 * Owns the press-to-talk mic button and the speech services: a recorded turn is
 * transcribed and cleaned into text before it reaches the domain, and NPC lines
 * are voiced with TTS. This is the guest/cloud channel; the manual channel is
 * its no-language-service counterpart.
 */

import { MicRecorder, playAudioBytes, unlockAudio } from "./voice.js";
import { transcribe, cleanTranscription, speak } from "./api.js";
import type { ConversationChannel, ConversationChannelUi } from "./ConversationChannel.js";

type Phase = "idle" | "recording" | "busy";

export class VoiceConversationChannel implements ConversationChannel {
  private readonly recorder = new MicRecorder();
  private ui: ConversationChannelUi | null = null;
  private onTurn: ((utterance: string) => void) | null = null;
  private micBtn: HTMLButtonElement | null = null;
  private hint: HTMLElement | null = null;
  private phase: Phase = "idle";
  /** The NPC's last line, used as context to clean the next transcription. */
  private lastNpcLine = "";

  prepare(): void {
    unlockAudio();
    void this.recorder.acquire().catch(() => {});
  }

  mountInput(
    container: HTMLElement,
    ui: ConversationChannelUi,
    onTurn: (utterance: string) => void,
  ): void {
    this.ui = ui;
    this.onTurn = onTurn;
    this.phase = "idle";
    container.innerHTML = `
      <button class="mic-btn" type="button">🎤</button>
      <div class="mic-hint">Tap to speak · tap again to send</div>`;
    this.micBtn = container.querySelector(".mic-btn");
    this.hint = container.querySelector(".mic-hint");

    if (!MicRecorder.isSupported()) {
      if (this.micBtn) this.micBtn.style.display = "none";
      ui.setStatus("Microphone isn't available on this device.");
      return;
    }
    this.micBtn?.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      unlockAudio();
      void this.handleTap();
    });
  }

  private async handleTap(): Promise<void> {
    const ui = this.ui;
    if (!ui || !this.onTurn) return;

    if (this.phase === "idle") {
      this.phase = "recording";
      this.setRecording(true);
      ui.setStatus("🔴 Recording… tap to send.", "#b56576");
      ui.setTranscript("");
      try {
        await this.recorder.start();
      } catch {
        ui.setStatus("Microphone permission denied.");
        this.setRecording(false);
        this.phase = "idle";
      }
      return;
    }

    if (this.phase === "recording") {
      this.setRecording(false);
      ui.setStatus("Transcribing…");
      try {
        const { audioBase64, mimeType } = await this.recorder.stop();
        const utterance = await transcribe(audioBase64, mimeType);
        if (!utterance.trim()) {
          ui.setStatus("I didn't catch that — tap the mic to try again.");
          this.phase = "idle";
          return;
        }
        ui.setStatus("Processing…");
        const { cleaned, corrected } = await cleanTranscription(utterance, this.lastNpcLine);
        ui.setTranscript(
          corrected && cleaned !== utterance
            ? `Heard: "${utterance}" → You meant: "${cleaned}"`
            : `You: "${cleaned}"`,
        );
        this.phase = "busy";
        this.onTurn(cleaned);
      } catch {
        ui.setStatus("Could not reach the language service.");
        this.phase = "idle";
      }
    }
  }

  setBusy(busy: boolean): void {
    this.phase = busy ? "busy" : "idle";
    if (this.micBtn) this.micBtn.disabled = busy;
  }

  async speak(text: string, voice?: string): Promise<void> {
    this.lastNpcLine = text;
    try {
      this.recorder.mute();
      const bytes = await speak(text, voice);
      await playAudioBytes(bytes);
    } catch {
      // Voice output is a bonus; a failure must not block the conversation.
    } finally {
      this.recorder.unmute();
    }
  }

  dispose(): void {
    this.recorder.release();
    this.ui = null;
    this.onTurn = null;
    this.micBtn = null;
    this.hint = null;
  }

  private setRecording(recording: boolean): void {
    this.micBtn?.classList.toggle("recording", recording);
    if (this.hint) {
      this.hint.textContent = recording
        ? "Recording… tap to send"
        : "Tap to speak · tap again to send";
    }
  }
}
