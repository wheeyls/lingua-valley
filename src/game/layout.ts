/**
 * Mobile-first UI design system. Portrait base resolution; Phaser's Scale.FIT
 * scales this canvas to any screen. Scenes read from `this.scale.width/height`
 * (equal to these at base size) so UI positioned relative to them adapts.
 *
 * This is a presentation/UI utility (a driving-adapter concern) — no game rules.
 * Everything here is sized for a phone held in portrait first.
 */

import Phaser from "phaser";

/** Portrait base canvas (9:16). Looks native on phones, letterboxes on desktop. */
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

/** Minimum comfortable touch target (px). All buttons meet or exceed this. */
export const TOUCH_TARGET = 56;

/** Outer screen margin used consistently across panels. */
export const MARGIN = 16;

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

export interface ButtonHandle {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  setLabel(text: string): void;
  setEnabled(on: boolean): void;
  destroy(): void;
}

export interface ButtonOptions {
  width?: number;
  height?: number;
  fill?: number;
  textColor?: string;
  fontSize?: string;
  depth?: number;
}

/**
 * Create a consistent, thumb-sized tappable button. Centered at (x, y).
 * Works with touch and mouse; includes press feedback.
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onTap: () => void,
  opts: ButtonOptions = {},
): ButtonHandle {
  const width = opts.width ?? 280;
  const height = Math.max(opts.height ?? TOUCH_TARGET, TOUCH_TARGET);
  const fill = opts.fill ?? COLOR.blue;

  const bg = scene.add
    .rectangle(0, 0, width, height, fill, 1)
    .setStrokeStyle(2, COLOR.goldNum)
    .setInteractive({ useHandCursor: true });

  const label = scene.add
    .text(0, 0, text, {
      fontFamily: FONT,
      fontSize: opts.fontSize ?? TYPE.body,
      color: opts.textColor ?? COLOR.parchment,
      align: "center",
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, label]);
  if (opts.depth !== undefined) container.setDepth(opts.depth);

  let enabled = true;
  const press = () => {
    if (enabled) bg.setFillStyle(lighten(fill));
  };
  const unpress = () => bg.setFillStyle(fill);

  bg.on(Phaser.Input.Events.POINTER_DOWN, press);
  bg.on(Phaser.Input.Events.POINTER_OVER, press);
  bg.on(Phaser.Input.Events.POINTER_OUT, unpress);
  bg.on(Phaser.Input.Events.POINTER_UP, () => {
    unpress();
    if (enabled) onTap();
  });

  return {
    container,
    bg,
    label,
    setLabel: (t) => label.setText(t),
    setEnabled: (on) => {
      enabled = on;
      container.setAlpha(on ? 1 : 0.4);
      if (on) bg.setInteractive({ useHandCursor: true });
      else bg.disableInteractive();
    },
    destroy: () => container.destroy(),
  };
}

function lighten(color: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(
    Math.min(255, c.red + 28),
    Math.min(255, c.green + 28),
    Math.min(255, c.blue + 28),
  );
}
