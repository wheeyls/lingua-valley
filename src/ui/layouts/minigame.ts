/**
 * Pure layouts for the vocab mini-game: the question screen (prompt + answer
 * buttons) and the result screen. Portrait-first, big tap targets.
 */

import { VIEW_WIDTH, VIEW_HEIGHT, TYPE, COLOR, TOUCH_TARGET } from "../tokens";
import type { UINode } from "../nodes";

const px = (s: string) => parseInt(s, 10);
const SAFE = 24;

export interface QuestionVM {
  lessonLabel: string;
  canDo: string;
  index: number;
  total: number;
  prompt: string;
  options: string[];
}

export function questionLayout(vm: QuestionVM): UINode[] {
  const w = VIEW_WIDTH;
  const h = VIEW_HEIGHT;
  const contentW = w - SAFE * 2;
  const nodes: UINode[] = [];

  nodes.push({
    kind: "panel",
    id: "backdrop",
    origin: "topleft",
    x: 0,
    y: 0,
    width: w,
    height: h,
    fill: COLOR.ink,
    alpha: 0.92,
    depth: 60,
  });

  nodes.push({
    kind: "text",
    id: "lesson",
    x: w / 2,
    y: h * 0.12,
    text: `Lesson · ${vm.lessonLabel}`,
    fontSize: px(TYPE.title),
    color: COLOR.gold,
    align: "center",
    wrapWidth: contentW,
    depth: 61,
  });
  nodes.push({
    kind: "text",
    id: "canDo",
    x: w / 2,
    y: h * 0.12 + 40,
    text: vm.canDo,
    fontSize: px(TYPE.label),
    color: COLOR.green,
    italic: true,
    align: "center",
    wrapWidth: contentW,
    depth: 61,
  });
  nodes.push({
    kind: "text",
    id: "progress",
    x: w / 2,
    y: h * 0.12 + 76,
    text: `${vm.index + 1} / ${vm.total}`,
    fontSize: px(TYPE.small),
    color: COLOR.goldText,
    align: "center",
    depth: 61,
  });

  nodes.push({
    kind: "text",
    id: "prompt",
    x: w / 2,
    y: h * 0.32,
    text: `How do you say…\n“${vm.prompt}”`,
    fontSize: px(TYPE.heading),
    color: COLOR.parchment,
    align: "center",
    wrapWidth: contentW,
    lineSpacing: 8,
    depth: 61,
  });

  const btnW = contentW;
  const gap = TOUCH_TARGET + 18;
  const startY = h * 0.46;
  vm.options.forEach((opt, i) => {
    nodes.push({
      kind: "button",
      id: `option-${i}`,
      x: w / 2,
      y: startY + i * gap,
      width: btnW,
      height: TOUCH_TARGET,
      text: opt,
      fill: COLOR.blue,
      textColor: "#ffffff",
      fontSize: px(TYPE.body),
      action: `answer-${i}`,
      depth: 61,
    });
  });

  return nodes;
}

export interface ResultVM {
  passed: boolean;
  correct: number;
  total: number;
}

export function resultLayout(vm: ResultVM): UINode[] {
  const w = VIEW_WIDTH;
  const h = VIEW_HEIGHT;
  const nodes: UINode[] = [];

  nodes.push({
    kind: "panel",
    id: "backdrop",
    origin: "topleft",
    x: 0,
    y: 0,
    width: w,
    height: h,
    fill: COLOR.ink,
    alpha: 0.92,
    depth: 60,
  });

  nodes.push({
    kind: "text",
    id: "headline",
    x: w / 2,
    y: h / 2 - 80,
    text: vm.passed ? "¡Muy bien!" : "Casi…",
    fontSize: px(TYPE.display),
    color: vm.passed ? COLOR.green : COLOR.rose,
    align: "center",
    depth: 61,
  });
  nodes.push({
    kind: "text",
    id: "sub",
    x: w / 2,
    y: h / 2 - 36,
    text: vm.passed ? "Objective mastered." : "Try again when ready.",
    fontSize: px(TYPE.body),
    color: COLOR.parchment,
    align: "center",
    depth: 61,
  });
  nodes.push({
    kind: "text",
    id: "score",
    x: w / 2,
    y: h / 2 + 4,
    text: `Score: ${vm.correct}/${vm.total}`,
    fontSize: px(TYPE.label),
    color: COLOR.goldText,
    align: "center",
    depth: 61,
  });
  nodes.push({
    kind: "button",
    id: "return",
    x: w / 2,
    y: h / 2 + 80,
    width: 280,
    height: TOUCH_TARGET,
    text: "Return to the valley",
    fill: COLOR.blue,
    textColor: COLOR.parchment,
    fontSize: px(TYPE.body),
    action: "return",
    depth: 61,
  });

  return nodes;
}
