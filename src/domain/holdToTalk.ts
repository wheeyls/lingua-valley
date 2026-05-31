/**
 * Pure press-and-hold ("walkie-talkie") state machine for the mic button.
 *
 * Recording start is async (mic permission / MediaRecorder), so press and
 * release can race. This models the intent so the scene (a thin adapter) just
 * forwards events and acts on the decision. No Phaser, fully testable.
 *
 * Lifecycle: press() → [startResolved()] → release(), in any order. Each
 * transition returns an action the scene should perform.
 */

export type HoldAction =
  | "none"
  | "begin-recording" // start the mic
  | "send" // stop + send the utterance
  | "cancel"; // discard (hold too short / released before ready)

export interface HoldOptions {
  /** Minimum hold duration to count as a real utterance (ms). */
  minHoldMs: number;
  /** Monotonic clock in ms (e.g. performance.now / scene.time.now). */
  now: () => number;
}

export class HoldToTalk {
  private holding = false;
  private ready = false; // recorder.start() has resolved
  private startedAt = 0;
  private active = false; // a recording session is in progress

  constructor(private readonly opts: HoldOptions) {}

  /** User pressed down. */
  press(): HoldAction {
    if (this.active) return "none";
    this.holding = true;
    this.ready = false;
    this.active = true;
    this.startedAt = this.opts.now();
    return "begin-recording";
  }

  /** recorder.start() resolved. If already released, decide send/cancel now. */
  startResolved(): HoldAction {
    if (!this.active) return "none";
    this.ready = true;
    if (!this.holding) {
      return this.finish();
    }
    return "none";
  }

  /** User released. Send if ready, else defer to startResolved(). */
  release(): HoldAction {
    if (!this.active || !this.holding) return "none";
    this.holding = false;
    if (this.ready) {
      return this.finish();
    }
    // Recorder not ready yet; startResolved() will finish.
    return "none";
  }

  /** Recording aborted externally (error). */
  reset(): void {
    this.holding = false;
    this.ready = false;
    this.active = false;
  }

  private finish(): HoldAction {
    const heldLongEnough = this.opts.now() - this.startedAt >= this.opts.minHoldMs;
    this.active = false;
    this.ready = false;
    return heldLongEnough ? "send" : "cancel";
  }
}
