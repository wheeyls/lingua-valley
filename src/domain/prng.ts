/**
 * Deterministic, day-seeded pseudo-randomness — shared by any content module
 * that needs "the same YYYY-MM-DD always produces the same output" (e.g. a
 * daily scene layout) without persisting any state.
 *
 * PURE DOMAIN: no framework, no Date.now()/Math.random(). Fully testable.
 */

/** Deterministic 32-bit hash of a YYYY-MM-DD string. */
export function seedFromDay(day: string): number {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (Math.imul(h, 31) + day.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** mulberry32 PRNG — deterministic sequence of [0,1) floats given a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
