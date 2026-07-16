/**
 * ConversationChannel — the swappable I/O for one conversation turn-loop.
 *
 * A conversation needs to (a) collect the player's utterance and (b) voice the
 * NPC's reply. Those are the only parts that differ by environment, so they live
 * behind this interface and are chosen at startup like every other adapter: the
 * real VoiceConversationChannel uses the mic + speech services, while the
 * ManualConversationChannel renders a text box so a conversation can be driven
 * end-to-end with no language service. GameController runs the loop identically
 * either way — no environment checks.
 */

/** The slice of the conversation view a channel narrates progress through. */
export interface ConversationChannelUi {
  setStatus(text: string, color?: string): void;
  setTranscript(text: string): void;
}

export interface ConversationChannel {
  /** Acquire resources for a conversation (e.g. mic permission, audio unlock). */
  prepare(): void;
  /**
   * Render the player's input control into `container` and call `onTurn` for each
   * submitted utterance. `ui` lets the channel narrate progress (status/transcript).
   */
  mountInput(
    container: HTMLElement,
    ui: ConversationChannelUi,
    onTurn: (utterance: string) => void,
  ): void;
  /** Enable/disable input while a turn is being processed. */
  setBusy(busy: boolean): void;
  /** Voice an NPC line. Real: TTS + playback. Manual: resolves immediately. */
  speak(text: string, voice?: string): Promise<void>;
  /** Release resources when the conversation closes. */
  dispose(): void;
}
