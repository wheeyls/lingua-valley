/**
 * Pure UI design tokens — NO framework imports. Safe to use in the pure layout
 * abstraction and its tests. The Phaser widget helpers live in ui/widgets.ts.
 */

/** Landscape base canvas (~16:9). Scale.FIT scales this to fill phones held sideways. */
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;

/** Minimum comfortable touch target (px). */
export const TOUCH_TARGET = 56;

/** Outer screen margin used consistently across panels. */
export const MARGIN = 16;

/**
 * Height of the reserved HUD band at the top of the screen. The world camera
 * fills the screen BELOW this, so the HUD never overlaps NPCs.
 */
export const HUD_BAND_HEIGHT = 70;

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Type scale, sized for legibility at phone arm's length. */
export const TYPE = {
  display: "34px",
  title: "26px",
  heading: "22px",
  body: "19px",
  label: "16px",
  small: "13px",
} as const;

/** Palette (matches the world art + index.html theme). */
export const COLOR = {
  ink: 0x1a1423,
  inkText: "#1a1423",
  parchment: "#f4ecd8",
  gold: "#ffe08a",
  goldNum: 0xd9b08c,
  goldText: "#d9b08c",
  green: "#9bc995",
  greenFill: 0x4a7c59,
  blue: 0x3d5a80,
  blueLight: "#9ec5ff",
  rose: "#b56576",
  roseFill: 0xb56576,
  muted: "#8a8290",
  panel: 0x1a1423,
} as const;

/** Coarse touch detection (additive — keyboard/mouse still work everywhere). */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
  );
}
