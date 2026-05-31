/**
 * Phaser UI widgets (driving-adapter layer). Depends on Phaser + pure tokens.
 * Keep framework-coupled helpers here so the layout abstraction stays pure.
 */

import Phaser from "phaser";
import { FONT, TYPE, COLOR, TOUCH_TARGET } from "./tokens";

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
