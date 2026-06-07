/**
 * Pure UI design tokens — NO framework imports. Safe to use in the pure layout
 * abstraction and its tests. The Phaser widget helpers live in ui/widgets.ts.
 */

/**
 * Portrait base canvas (1:2). Phaser's Scale.FIT magnifies this to fill the
 * phone — a SMALLER virtual canvas means everything (text, buttons, NPCs)
 * renders BIGGER on screen. We intentionally use a compact 420×840 so the game
 * reads large and friendly on a phone.
 */
export const VIEW_WIDTH = 420;
export const VIEW_HEIGHT = 840;

/** Minimum comfortable touch target (px) — chunky, thumb-friendly. */
export const TOUCH_TARGET = 64;

/** Outer screen margin used consistently across panels. */
export const MARGIN = 18;

/** Standard corner radius for the rounded, cartoonish panel/button look. */
export const RADIUS = 18;

/**
 * Height of the reserved HUD band at the top of the screen. The world camera
 * fills the screen BELOW this, so the HUD never overlaps NPCs.
 */
export const HUD_BAND_HEIGHT = 104;

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/**
 * Type scale — big and bold for arm's-length phone reading. Sizes are in the
 * 420-wide virtual canvas, so they magnify further via Scale.FIT.
 */
export const TYPE = {
  display: "40px",
  title: "30px",
  heading: "25px",
  body: "21px",
  label: "18px",
  small: "15px",
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
