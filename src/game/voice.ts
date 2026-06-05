/**
 * Browser microphone capture and audio playback utilities.
 *
 * MicRecorder captures a short utterance as a base64 blob (sent to /api/transcribe).
 * playAudioBytes plays TTS audio returned from /api/speak.
 *
 * IMPORTANT (mobile): we acquire the mic stream ONCE (`acquire`) and keep it
 * alive for the whole conversation. Recording start/stop just toggles a
 * MediaRecorder on that persistent stream. This avoids re-prompting for the mic
 * permission on every turn / NPC, and keeps the permission request OUT of the
 * press-to-talk gesture (which otherwise gets interrupted by the OS dialog).
 */

export class MicRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /** True if the browser supports the APIs we need. */
  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    );
  }

  /** Best-supported mime type for recording (Safari prefers mp4). */
  private pickMimeType(): string {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return "";
  }

  /** Whether a live mic stream is already held (permission granted). */
  hasStream(): boolean {
    return !!this.stream && this.stream.getTracks().some((t) => t.readyState === "live");
  }

  /**
   * Acquire (and keep) the mic stream — this is what triggers the permission
   * prompt. Call it once up front (e.g. when the conversation opens), so the
   * dialog never interrupts the press-to-talk gesture. Idempotent.
   */
  async acquire(): Promise<void> {
    if (this.hasStream()) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  /**
   * Start recording on the persistent stream. Acquires first if needed (so it
   * still works if `acquire` wasn't pre-called). Does NOT release the stream.
   */
  async start(): Promise<void> {
    if (!this.hasStream()) await this.acquire();
    this.chunks = [];
    const mimeType = this.pickMimeType();
    this.mediaRecorder = new MediaRecorder(
      this.stream!,
      mimeType ? { mimeType } : undefined,
    );
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();
  }

  /**
   * Stop the current recording and resolve with the audio. The mic STREAM is
   * kept alive for the next turn (only the MediaRecorder is torn down).
   */
  async stop(): Promise<{ audioBase64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder;
      if (!recorder) return reject(new Error("Not recording"));
      const mimeType = recorder.mimeType || "audio/webm";
      recorder.onstop = async () => {
        try {
          const blob = new Blob(this.chunks, { type: mimeType });
          const audioBase64 = await blobToBase64(blob);
          this.mediaRecorder = null; // keep this.stream alive
          resolve({ audioBase64, mimeType });
        } catch (e) {
          reject(e);
        }
      };
      recorder.stop();
    });
  }

  /**
   * Fully release the mic (stops the stream tracks). Call ONCE when the
   * conversation closes, not between turns.
   */
  release(): void {
    this.mediaRecorder = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:...;base64," prefix.
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Play raw audio bytes (e.g. an mp3 ArrayBuffer from TTS). Resolves when done. */
export function playAudioBytes(bytes: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Audio playback failed"));
    };
    void audio.play().catch(reject);
  });
}
