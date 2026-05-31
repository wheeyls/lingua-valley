/**
 * Shared layout constants + helpers. Portrait-first base resolution; Phaser's
 * Scale.FIT scales this canvas to any screen while keeping aspect ratio.
 *
 * Scenes read from `this.scale.width/height` (which equal these at base size),
 * so UI positioned relative to scale dimensions adapts automatically.
 */

/** Portrait base canvas (9:16-ish). Looks native on phones, letterboxes on desktop. */
export const VIEW_WIDTH = 540;
export const VIEW_HEIGHT = 960;

/** Coarse touch detection (additive — keyboard/mouse still work everywhere). */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
  );
}

/** A comfortable minimum touch target (px) per accessibility guidance. */
export const TOUCH_TARGET = 48;
