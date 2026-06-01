/**
 * Scaffolding model (replaces the old "comprehension"/garble model).
 *
 * Design change: we no longer garble or hide NPC Spanish, and there is no
 * comprehension gate. A fluent speaker blows right through; a learner gets the
 * natural "this is over my head" feeling from the actual language + spoken
 * audio. You don't pass by understanding a clarity score — you pass by
 * PERFORMING (the LLM grades your real Spanish). Boundaries (gatekeepers,
 * quests) still gate via pass quality elsewhere.
 *
 * What remains is honest difficulty: two independent "training wheels" that a
 * town can offer or remove based on how much English help it provides:
 *   - spanishSubtitles: show the NPC's Spanish text on screen at all (vs audio only)
 *   - englishHints:     show the English translation as scaffolding
 *
 * Easier (English-friendly) towns show both. Harder, remoter towns take the
 * training wheels off — Spanish-only, then audio-only.
 *
 * Pure domain: no framework, fully testable.
 */

export interface Scaffolding {
  /** Show the Spanish line as on-screen text (vs. relying on the spoken audio). */
  spanishSubtitles: boolean;
  /** Show the English translation as a hint. */
  englishHints: boolean;
}

/**
 * Scaffolding for a town, from its `englishAvailability` (0..1):
 *   >= 0.5  → metropolis-ish: Spanish subtitles + English hints (full help)
 *   >= 0.2  → remoter: Spanish subtitles, but NO English (read, don't translate)
 *   <  0.2  → remotest: audio only — no subtitles, no translation
 *
 * Tune the thresholds here in one place.
 */
export function scaffoldingFor(englishAvailability: number): Scaffolding {
  const e = clampUnit(englishAvailability);
  return {
    spanishSubtitles: e >= 0.2,
    englishHints: e >= 0.5,
  };
}

function clampUnit(n: number): number {
  return Math.max(0, Math.min(1, n));
}
