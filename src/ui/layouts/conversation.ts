/**
 * Pure layout for the voiced conversation screen. Mic-centric: the big
 * hold-to-talk button is the focal element, NPC speech above, status below.
 */

import { VIEW_WIDTH, VIEW_HEIGHT, MARGIN, TYPE, COLOR } from "../tokens";
import type { UINode } from "../nodes";

export interface ConversationVM {
  npcName: string;
  /** Friendship tier label with this NPC, e.g. "Acquaintance". */
  friendship?: string;
  goal: string;
  npcSpeech: string;
  transcript: string;
  feedback: string;
  status: string;
  statusColor: string;
  recording: boolean;
}

const px = (s: string) => parseInt(s, 10);

export function conversationLayout(vm: ConversationVM): UINode[] {
  const w = VIEW_WIDTH;
  const h = VIEW_HEIGHT;
  const contentW = w - MARGIN * 3;
  const nodes: UINode[] = [];

  // Full-bleed backdrop.
  nodes.push({
    kind: "panel",
    id: "backdrop",
    origin: "topleft",
    x: 0,
    y: 0,
    width: w,
    height: h,
    fill: 0x0d0a12,
    alpha: 0.95,
    depth: 70,
  });

  // Title + goal.
  nodes.push({
    kind: "text",
    id: "title",
    x: w / 2,
    y: h * 0.06,
    text: vm.npcName,
    fontSize: px(TYPE.title),
    color: COLOR.gold,
    align: "center",
    depth: 71,
  });
  if (vm.friendship) {
    nodes.push({
      kind: "text",
      id: "friendship",
      x: w / 2,
      y: h * 0.06 + 30,
      text: `♥ ${vm.friendship}`,
      fontSize: px(TYPE.small),
      color: COLOR.rose,
      align: "center",
      depth: 71,
    });
  }
  nodes.push({
    kind: "text",
    id: "goal",
    x: w / 2,
    y: h * 0.06 + 56,
    text: vm.goal,
    fontSize: px(TYPE.label),
    color: COLOR.green,
    italic: true,
    align: "center",
    wrapWidth: contentW,
    depth: 71,
  });

  // NPC speech (focal text block).
  nodes.push({
    kind: "text",
    id: "npcSpeech",
    x: w / 2,
    y: h * 0.3,
    text: vm.npcSpeech,
    fontSize: px(TYPE.title),
    color: COLOR.parchment,
    align: "center",
    wrapWidth: contentW,
    lineSpacing: 8,
    depth: 71,
  });

  // Transcript ("you said"). Always present so the scene can update it in place.
  nodes.push({
    kind: "text",
    id: "transcript",
    x: w / 2,
    y: h * 0.47,
    text: vm.transcript,
    fontSize: px(TYPE.body),
    color: COLOR.blueLight,
    italic: true,
    align: "center",
    wrapWidth: contentW,
    depth: 71,
  });

  // Feedback. Always present (may be empty) for in-place updates.
  nodes.push({
    kind: "text",
    id: "feedback",
    x: w / 2,
    y: h * 0.56,
    text: vm.feedback,
    fontSize: px(TYPE.label),
    color: "#f2cc8f",
    align: "center",
    wrapWidth: contentW,
    depth: 71,
  });

  // Status line above the mic.
  nodes.push({
    kind: "text",
    id: "status",
    x: w / 2,
    y: h * 0.66,
    text: vm.status,
    fontSize: px(TYPE.label),
    color: vm.statusColor,
    align: "center",
    wrapWidth: w - MARGIN * 2,
    depth: 71,
  });

  // The big mic button.
  const micY = h * 0.8;
  const micR = 76;
  nodes.push({
    kind: "circle",
    id: "micButton",
    x: w / 2,
    y: micY,
    radius: micR,
    fill: vm.recording ? COLOR.roseFill : COLOR.blue,
    stroke: { color: COLOR.goldNum, width: 5 },
    depth: 71,
  });
  nodes.push({
    kind: "text",
    id: "micIcon",
    x: w / 2,
    y: micY,
    text: "🎤",
    fontSize: 60,
    color: "#ffffff",
    align: "center",
    depth: 72,
  });
  nodes.push({
    kind: "text",
    id: "micHelp",
    x: w / 2,
    y: micY + micR + 22,
    text: "Hold the mic to speak · release to send",
    fontSize: px(TYPE.small),
    color: COLOR.muted,
    align: "center",
    wrapWidth: w - MARGIN * 2,
    depth: 71,
  });

  // Leave button (top-left, safe-area aligned).
  const SAFE = 24;
  const leaveH = 56;
  nodes.push({
    kind: "button",
    id: "leave",
    x: SAFE + 50,
    y: SAFE + leaveH / 2,
    text: "Leave",
    width: 100,
    height: leaveH,
    fill: COLOR.roseFill,
    textColor: COLOR.parchment,
    fontSize: px(TYPE.label),
    action: "leave",
    depth: 73,
  });

  return nodes;
}
