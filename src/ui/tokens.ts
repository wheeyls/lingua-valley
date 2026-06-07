/**
 * Pure UI design tokens — NO framework imports. Safe to use in the pure layout
 * abstraction and its tests. The Phaser widget helpers live in ui/widgets.ts.
 */

/**
 * Portrait base canvas. The aspect ratio matches a modern phone (~9:19.5) so
 * Scale.FIT fills the screen edge-to-edge with no letterbox bars and centers
 * correctly. The virtual width is small (360) so everything renders LARGE on the
 * phone — text/buttons/NPCs are magnified by Scale.FIT. 360×780 ≈ 9:19.5.
 */
export const VIEW_WIDTH = 360;
export const VIEW_HEIGHT = 780;

/** Minimum comfortable touch target (px) — chunky, thumb-friendly. */
export const TOUCH_TARGET = 60;

/** Outer screen margin used consistently across panels. */
export const MARGIN = 16;

/** Standard corner radius for the rounded, cartoonish panel/button look. */
export const RADIUS = 16;

/**
 * Height of the reserved HUD band at the top of the screen. The world camera
 * fills the screen BELOW this, so the HUD never overlaps NPCs.
 */
export const HUD_BAND_HEIGHT = 96;

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/**
 * Type scale — big and bold for arm's-length phone reading. Sizes are in the
 * 360-wide virtual canvas, so Scale.FIT magnifies them further on screen.
 */
export const TYPE = {
  display: "38px",
  title: "30px",
  heading: "26px",
  body: "24px",
  label: "20px",
  small: "16px",
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
