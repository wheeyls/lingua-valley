/**
 * Pure layout for the transient "entering area" banner shown mid-screen.
 */

import { VIEW_WIDTH, VIEW_HEIGHT, TYPE, COLOR } from "../tokens";
import type { UINode } from "../nodes";

const px = (s: string) => parseInt(s, 10);
const SAFE = 24;

export interface BannerVM {
  message: string;
  overLevel: boolean;
}

export function bannerLayout(vm: BannerVM): UINode[] {
  const w = VIEW_WIDTH;
  const h = VIEW_HEIGHT;
  const panelW = w - SAFE * 2;
  const panelH = 64;
  const y = h * 0.4;

  return [
    {
      kind: "panel",
      id: "bannerBg",
      origin: "center",
      x: w / 2,
      y,
      width: panelW,
      height: panelH,
      fill: COLOR.ink,
      alpha: 0.9,
      stroke: { color: vm.overLevel ? COLOR.roseFill : COLOR.greenFill, width: 2 },
      radius: 14,
      depth: 45,
    },
    {
      kind: "text",
      id: "bannerText",
      x: w / 2,
      y,
      text: vm.message,
      fontSize: px(TYPE.label),
      color: vm.overLevel ? COLOR.rose : COLOR.green,
      align: "center",
      wrapWidth: panelW - 24,
      depth: 46,
    },
  ];
}
