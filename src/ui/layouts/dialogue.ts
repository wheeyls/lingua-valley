/**
 * Pure layout for the dialogue bottom-sheet. Returns a UI node tree the
 * DialogueScene renders. No Phaser — fully testable.
 */

import { VIEW_WIDTH, VIEW_HEIGHT, MARGIN, TYPE, COLOR } from "../tokens";
import type { UINode } from "../nodes";
import { estimateTextHeight } from "../nodes";

export interface DialogueVM {
  npcName: string;
  /** The NPC's Spanish line — always plain, never garbled. */
  spanish: string;
  /** Whether to render the Spanish as on-screen text (vs. audio-only towns). */
  showSpanish?: boolean;
  englishHint: string;
  /** Whether the town offers English help (hidden in remote towns). */
  showEnglishHint?: boolean;
  /** Progress dots. */
  lineIndex: number;
  lineCount: number;
  /** Continue button label + whether a lesson tease shows. */
  continueLabel: string;
  lessonLabel?: string;
  /** Whether to show the "Trade goods" button (merchant NPCs). */
  canTrade?: boolean;
}

const px = (s: string) => parseInt(s, 10);

export function dialogueLayout(vm: DialogueVM): UINode[] {
  const w = VIEW_WIDTH;
  const h = VIEW_HEIGHT;
  const panelH = 340;
  const top = h - panelH;
  const pad = MARGIN + 8;
  const contentW = w - pad * 2;

  const nodes: UINode[] = [];

  nodes.push({
    kind: "panel",
    id: "sheet",
    origin: "topleft",
    x: 0,
    y: top,
    width: w,
    height: panelH,
    fill: COLOR.panel,
    alpha: 0.96,
    stroke: { color: COLOR.goldNum, width: 3 },
    radius: 18,
    depth: 50,
  });

  nodes.push({
    kind: "text",
    id: "name",
    origin: "topleft",
    x: pad,
    y: top + 20,
    text: vm.npcName,
    fontSize: px(TYPE.heading),
    color: COLOR.gold,
    depth: 51,
  });

  nodes.push({
    kind: "text",
    id: "dots",
    origin: "topleft",
    x: pad,
    y: top + 20,
    // right-aligned visually; for bounds we keep it small near the right edge
    text: Array.from({ length: vm.lineCount }, (_, i) =>
      i === vm.lineIndex ? "●" : "○",
    ).join(" "),
    fontSize: px(TYPE.small),
    color: COLOR.muted,
    align: "right",
    depth: 51,
  });

  // Spanish line — always plain (never garbled). In audio-only towns the
  // subtitle is hidden; we show a small "listen" prompt instead.
  const showSpanish = vm.showSpanish ?? true;
  const spanish: UINode = {
    kind: "text",
    id: "spanish",
    origin: "topleft",
    x: pad,
    y: top + 60,
    text: showSpanish ? vm.spanish : "🔊 (listen — no subtitles out here)",
    fontSize: px(TYPE.heading),
    color: showSpanish ? COLOR.parchment : COLOR.muted,
    italic: !showSpanish,
    wrapWidth: contentW,
    lineSpacing: 6,
    depth: 51,
  };
  nodes.push(spanish);

  // English translation hint — only where the town offers that help.
  const showEnglish = vm.showEnglishHint ?? true;
  const hintY = top + 60 + estimateTextHeight(spanish) + 14;
  if (showEnglish) {
    nodes.push({
      kind: "text",
      id: "hint",
      origin: "topleft",
      x: pad,
      y: hintY,
      text: `“${vm.englishHint}”`,
      fontSize: px(TYPE.label),
      color: COLOR.green,
      italic: true,
      wrapWidth: contentW,
      depth: 51,
    });
  }

  if (vm.lessonLabel) {
    nodes.push({
      kind: "text",
      id: "lesson",
      origin: "topleft",
      x: pad,
      y: (showEnglish ? hintY + 30 : hintY),
      text: `▶ Lesson: ${vm.lessonLabel}`,
      fontSize: px(TYPE.label),
      color: COLOR.gold,
      depth: 51,
    });
  }

  // Action buttons along the bottom of the sheet, inside the safe area.
  const SAFE = 24;
  const btnH = 56;
  const btnY = h - SAFE - btnH / 2; // bottom edge sits on the safe line
  const leaveW = 120;
  const continueW = 200;

  // Optional Trade button (merchant NPCs), sits a row above the main actions.
  if (vm.canTrade) {
    nodes.push({
      kind: "button",
      id: "trade",
      x: w / 2,
      y: btnY - btnH - 12,
      text: "Trade goods",
      width: w - SAFE * 2,
      height: btnH,
      fill: COLOR.greenFill,
      textColor: COLOR.parchment,
      fontSize: px(TYPE.body),
      action: "trade",
      depth: 51,
    });
  }

  nodes.push({
    kind: "button",
    id: "leave",
    x: SAFE + leaveW / 2,
    y: btnY,
    text: "Leave",
    width: leaveW,
    height: btnH,
    fill: COLOR.roseFill,
    textColor: COLOR.parchment,
    fontSize: px(TYPE.body),
    action: "leave",
    depth: 51,
  });
  nodes.push({
    kind: "button",
    id: "continue",
    x: w - SAFE - continueW / 2,
    y: btnY,
    text: vm.continueLabel,
    width: continueW,
    height: btnH,
    fill: COLOR.blue,
    textColor: COLOR.parchment,
    fontSize: px(TYPE.body),
    action: "continue",
    depth: 51,
  });

  return nodes;
}
