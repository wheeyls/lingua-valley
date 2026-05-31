/**
 * Pure layout for the persistent HUD: top auth header, resource strip
 * (pesos/focus/skills), and the level-progress panel. Portrait-first.
 */

import { VIEW_WIDTH, TYPE, COLOR } from "../tokens";
import type { UINode } from "../nodes";

export interface HudVM {
  authLabel: string;
  authAction: string; // "Sign in" | "Sign out"
  pesos: number;
  focus: number;
  focusMax: number;
  skills: { speaking: number; listening: number; vocab: number };
  effectiveLevel: string;
  levels: { level: string; pct: number }[];
}

const px = (s: string) => parseInt(s, 10);
const SAFE = 24;

export function hudLayout(vm: HudVM): UINode[] {
  const w = VIEW_WIDTH;
  const nodes: UINode[] = [];

  // --- Auth header (top, centered) ---
  // Tall enough to host a 56px touch-target button without overflowing.
  const headerH = 56;
  const headerY = SAFE;
  nodes.push({
    kind: "panel",
    id: "authBar",
    origin: "topleft",
    x: SAFE,
    y: headerY,
    width: w - SAFE * 2,
    height: headerH,
    fill: COLOR.panel,
    alpha: 0.82,
    stroke: { color: COLOR.goldNum, width: 1 },
    depth: 60,
  });
  nodes.push({
    kind: "text",
    id: "authLabel",
    origin: "topleft",
    x: SAFE + 12,
    y: headerY + 19,
    text: vm.authLabel,
    fontSize: px(TYPE.small),
    color: COLOR.parchment,
    depth: 61,
  });
  nodes.push({
    kind: "button",
    id: "authBtn",
    x: w - SAFE - 70,
    y: headerY + headerH / 2,
    text: vm.authAction,
    width: 110,
    height: 56,
    fill: COLOR.blue,
    textColor: COLOR.gold,
    fontSize: px(TYPE.small),
    action: "auth",
    depth: 61,
  });

  // --- Resource strip ---
  const stripY = headerY + headerH + 8;
  const stripH = 64;
  nodes.push({
    kind: "panel",
    id: "resourceStrip",
    origin: "topleft",
    x: SAFE,
    y: stripY,
    width: w - SAFE * 2,
    height: stripH,
    fill: COLOR.panel,
    alpha: 0.82,
    stroke: { color: COLOR.goldNum, width: 2 },
    depth: 41,
  });
  nodes.push({
    kind: "text",
    id: "pesos",
    origin: "topleft",
    x: SAFE + 12,
    y: stripY + 10,
    text: `💰 ${vm.pesos}`,
    fontSize: px(TYPE.body),
    color: COLOR.gold,
    depth: 42,
  });
  nodes.push({
    kind: "text",
    id: "skills",
    origin: "topleft",
    x: SAFE + 12,
    y: stripY + 40,
    text: `🗣 ${vm.skills.speaking}   👂 ${vm.skills.listening}   📖 ${vm.skills.vocab}`,
    fontSize: px(TYPE.label),
    color: COLOR.green,
    depth: 42,
  });
  nodes.push({
    kind: "text",
    id: "focusLabel",
    origin: "topleft",
    x: SAFE + 120,
    y: stripY + 8,
    text: `Focus ${vm.focus}/${vm.focusMax}`,
    fontSize: px(TYPE.small),
    color: COLOR.blueLight,
    depth: 42,
  });

  // --- Level progress panel ---
  const lvlTop = stripY + stripH + 8;
  const lvlH = 30 + vm.levels.length * 24;
  const lvlW = 200;
  nodes.push({
    kind: "panel",
    id: "levelPanel",
    origin: "topleft",
    x: SAFE,
    y: lvlTop,
    width: lvlW,
    height: lvlH,
    fill: COLOR.panel,
    alpha: 0.82,
    stroke: { color: COLOR.goldNum, width: 2 },
    depth: 40,
  });
  nodes.push({
    kind: "text",
    id: "levelTitle",
    origin: "topleft",
    x: SAFE + 10,
    y: lvlTop + 8,
    text: `Level: ${vm.effectiveLevel}`,
    fontSize: px(TYPE.small),
    color: COLOR.gold,
    depth: 41,
  });
  vm.levels.forEach((lv, i) => {
    nodes.push({
      kind: "text",
      id: `lvl-${lv.level}`,
      origin: "topleft",
      x: SAFE + 10,
      y: lvlTop + 30 + i * 24,
      text: `${lv.level}  ${lv.pct}%`,
      fontSize: px(TYPE.small),
      color: COLOR.green,
      depth: 41,
    });
  });

  return nodes;
}
