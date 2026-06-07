/**
 * Pure layout for the slim top HUD bar (and its expandable detail menu).
 *
 * The bar lives inside the reserved HUD band (HUD_BAND_HEIGHT) so it never
 * overlaps the world/NPCs. It shows the essentials — level, pesos, focus — plus
 * a menu button that expands skills, level breakdown, and account.
 */

import { VIEW_WIDTH, HUD_BAND_HEIGHT, TYPE, COLOR, TOUCH_TARGET } from "../tokens";
import type { UINode } from "../nodes";

export interface HudVM {
  authLabel: string;
  authAction: string;
  pesos: number;
  focus: number;
  focusMax: number;
  skills: { speaking: number; listening: number; vocab: number };
  effectiveLevel: string;
  levels: { level: string; pct: number }[];
  /** Goods the player is carrying (name + qty). */
  goods?: { name: string; qty: number }[];
  /** Active quest summary, if any. */
  quest?: {
    title: string;
    phase: string;
    steps: { label: string; done: boolean }[];
  };
  menuOpen: boolean;
}

const px = (s: string) => parseInt(s, 10);
const SAFE = 24;

export function hudLayout(vm: HudVM): UINode[] {
  const w = VIEW_WIDTH;
  const nodes: UINode[] = [];

  // Content sits below the top safe inset (notch) within the band.
  const barMid = SAFE + (HUD_BAND_HEIGHT - SAFE) / 2;

  // Bar background spans the band (edge surface anchored to the top).
  nodes.push({
    kind: "panel",
    id: "hudBar",
    origin: "topleft",
    x: 0,
    y: 0,
    width: w,
    height: HUD_BAND_HEIGHT,
    fill: COLOR.panel,
    alpha: 0.92,
    depth: 60,
  });

  // Menu button (right) — sized first so other elements avoid it.
  const menuW = TOUCH_TARGET;
  nodes.push({
    kind: "button",
    id: "menu",
    x: w - SAFE - menuW / 2,
    y: barMid,
    width: menuW,
    height: TOUCH_TARGET,
    text: vm.menuOpen ? "✕" : "☰",
    fill: COLOR.blue,
    textColor: COLOR.gold,
    fontSize: px(TYPE.heading),
    action: "menu",
    depth: 61,
  });

  // Level chip (left).
  nodes.push({
    kind: "text",
    id: "level",
    origin: "topleft",
    x: SAFE,
    y: barMid - 24,
    text: `Lv ${vm.effectiveLevel}`,
    fontSize: px(TYPE.heading),
    color: COLOR.gold,
    depth: 61,
  });
  // Focus mini-bar under the level.
  const fbW = 120;
  nodes.push({
    kind: "panel",
    id: "focusTrack",
    origin: "topleft",
    x: SAFE,
    y: barMid + 16,
    width: fbW,
    height: 12,
    fill: 0x3a2f42,
    radius: 6,
    depth: 61,
  });
  nodes.push({
    kind: "panel",
    id: "focusFill",
    origin: "topleft",
    x: SAFE,
    y: barMid + 16,
    width: Math.max(2, fbW * (vm.focus / vm.focusMax)),
    height: 12,
    fill: 0x6db1ff,
    radius: 6,
    depth: 62,
  });

  // Pesos (center-ish, between level block and menu button).
  nodes.push({
    kind: "text",
    id: "pesos",
    x: (SAFE + fbW + (w - SAFE - menuW)) / 2,
    y: barMid,
    text: `💰 ${vm.pesos}`,
    fontSize: px(TYPE.heading),
    color: COLOR.gold,
    align: "center",
    depth: 61,
  });

  if (vm.menuOpen) nodes.push(...menuNodes(vm));

  return nodes;
}

/** Expandable detail panel below the bar. */
function menuNodes(vm: HudVM): UINode[] {
  const w = VIEW_WIDTH;
  const nodes: UINode[] = [];
  const top = HUD_BAND_HEIGHT + 8;
  const margin = 24;
  const panelW = w - margin * 2;
  const goodsRows = vm.goods && vm.goods.length > 0 ? 2 : 0;
  const questRows = vm.quest ? 1 + vm.quest.steps.length : 0;
  const rows = 2 + vm.levels.length + goodsRows + questRows + 2;
  const panelH = 24 + rows * 26;

  nodes.push({
    kind: "panel",
    id: "menuPanel",
    origin: "topleft",
    x: margin,
    y: top,
    width: panelW,
    height: panelH,
    fill: COLOR.panel,
    alpha: 0.96,
    stroke: { color: COLOR.goldNum, width: 2 },
    radius: 12,
    depth: 65,
  });

  let y = top + 14;
  nodes.push({
    kind: "text",
    id: "menuSkillsTitle",
    origin: "topleft",
    x: margin + 14,
    y,
    text: "Skills",
    fontSize: px(TYPE.small),
    color: COLOR.muted,
    depth: 66,
  });
  y += 24;
  nodes.push({
    kind: "text",
    id: "menuSkills",
    origin: "topleft",
    x: margin + 14,
    y,
    text: `🗣 ${vm.skills.speaking}    👂 ${vm.skills.listening}    📖 ${vm.skills.vocab}`,
    fontSize: px(TYPE.label),
    color: COLOR.green,
    depth: 66,
  });
  y += 32;

  for (const lv of vm.levels) {
    nodes.push({
      kind: "text",
      id: `menu-lvl-${lv.level}`,
      origin: "topleft",
      x: margin + 14,
      y,
      text: `${lv.level}   ${lv.pct}%`,
      fontSize: px(TYPE.label),
      color: COLOR.parchment,
      depth: 66,
    });
    y += 26;
  }

  // Goods inventory (the merchant's stock).
  if (vm.goods && vm.goods.length > 0) {
    nodes.push({
      kind: "text",
      id: "menuGoodsTitle",
      origin: "topleft",
      x: margin + 14,
      y: y + 6,
      text: "Goods",
      fontSize: px(TYPE.small),
      color: COLOR.muted,
      depth: 66,
    });
    y += 30;
    nodes.push({
      kind: "text",
      id: "menuGoods",
      origin: "topleft",
      x: margin + 14,
      y,
      text: vm.goods.map((g) => `${g.name} ×${g.qty}`).join("   "),
      fontSize: px(TYPE.label),
      color: COLOR.gold,
      wrapWidth: panelW - 28,
      depth: 66,
    });
    y += 26;
  }

  // Active quest tracker.
  if (vm.quest) {
    nodes.push({
      kind: "text",
      id: "menuQuestTitle",
      origin: "topleft",
      x: margin + 14,
      y: y + 6,
      text: `Quest: ${vm.quest.title}`,
      fontSize: px(TYPE.small),
      color: COLOR.muted,
      depth: 66,
    });
    y += 28;
    for (const step of vm.quest.steps) {
      nodes.push({
        kind: "text",
        id: `menuQuestStep-${step.label}`,
        origin: "topleft",
        x: margin + 14,
        y,
        text: `${step.done ? "✓" : "○"} ${step.label}`,
        fontSize: px(TYPE.label),
        color: step.done ? COLOR.green : COLOR.parchment,
        wrapWidth: panelW - 28,
        depth: 66,
      });
      y += 26;
    }
  }

  // Account row + auth button.
  nodes.push({
    kind: "text",
    id: "menuAuthLabel",
    origin: "topleft",
    x: margin + 14,
    y: y + 18,
    text: vm.authLabel,
    fontSize: px(TYPE.small),
    color: COLOR.muted,
    wrapWidth: panelW - 140,
    depth: 66,
  });
  nodes.push({
    kind: "button",
    id: "authBtn",
    x: w - margin - 14 - 55,
    y: y + 20,
    width: 110,
    height: TOUCH_TARGET,
    text: vm.authAction,
    fill: COLOR.blue,
    textColor: COLOR.gold,
    fontSize: px(TYPE.small),
    action: "auth",
    depth: 66,
  });

  return nodes;
}
