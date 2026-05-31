/**
 * Layout assertions over the pure UI scene-graph. These encode what "good"
 * looks like for the phone-first UI and let tests catch regressions without a
 * browser: everything fits the safe area, interactive targets are big enough,
 * and important elements don't collide.
 */

import { VIEW_WIDTH, VIEW_HEIGHT, TOUCH_TARGET } from "./tokens";
import { boundsOf, overlaps, type UINode, type Box } from "./nodes";

/** Conservative safe-area inset (notch/home indicator) in base px. */
export const SAFE_INSET = 24;

export const SAFE_AREA: Box = {
  left: SAFE_INSET,
  top: SAFE_INSET,
  right: VIEW_WIDTH - SAFE_INSET,
  bottom: VIEW_HEIGHT - SAFE_INSET,
};

export interface LayoutIssue {
  rule: string;
  nodeId?: string;
  detail: string;
}

/**
 * Edge surfaces are panels intentionally anchored to a screen edge (full-bleed
 * backdrops, bottom sheets, top bars). Their content must respect the safe
 * area, but the surface itself may extend to the edge. Exempt from safe-area.
 */
function isEdgeSurface(node: UINode): boolean {
  if (node.kind !== "panel" || node.origin !== "topleft") return false;
  const touchesLeftTop = node.x <= 0 && node.y <= -0.0001 + node.y; // x at edge
  const spansWidth = node.x <= 0 && node.x + node.width >= VIEW_WIDTH;
  const touchesBottom = node.y + node.height >= VIEW_HEIGHT - 0.5;
  const touchesTop = node.y <= 0.5;
  void touchesLeftTop;
  return spansWidth && (touchesBottom || touchesTop);
}

/** Every non-edge-surface node must sit within the safe area. */
export function checkWithinSafeArea(nodes: UINode[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  for (const node of nodes) {
    if (isEdgeSurface(node)) continue;
    const b = boundsOf(node);
    if (
      b.left < SAFE_AREA.left - 0.5 ||
      b.top < SAFE_AREA.top - 0.5 ||
      b.right > SAFE_AREA.right + 0.5 ||
      b.bottom > SAFE_AREA.bottom + 0.5
    ) {
      issues.push({
        rule: "within-safe-area",
        nodeId: node.id,
        detail: `box ${fmt(b)} exits safe area ${fmt(SAFE_AREA)}`,
      });
    }
  }
  return issues;
}

/** Buttons (and the mic circle) must meet the minimum touch target. */
export function checkTouchTargets(nodes: UINode[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  for (const node of nodes) {
    if (node.kind === "button") {
      if (node.width < TOUCH_TARGET || node.height < TOUCH_TARGET) {
        issues.push({
          rule: "touch-target",
          nodeId: node.id,
          detail: `button ${node.width}x${node.height} < ${TOUCH_TARGET}`,
        });
      }
    }
    if (node.kind === "circle" && node.id?.includes("mic")) {
      if (node.radius * 2 < TOUCH_TARGET) {
        issues.push({
          rule: "touch-target",
          nodeId: node.id,
          detail: `mic d=${node.radius * 2} < ${TOUCH_TARGET}`,
        });
      }
    }
  }
  return issues;
}

/**
 * Interactive elements must not overlap each other (you can't reliably tap
 * stacked buttons). We only enforce non-overlap among buttons + mic, since
 * decorative text/panels intentionally layer.
 */
export function checkNoInteractiveOverlap(nodes: UINode[]): LayoutIssue[] {
  const interactive = nodes.filter(
    (n) => n.kind === "button" || (n.kind === "circle" && n.id?.includes("mic")),
  );
  const issues: LayoutIssue[] = [];
  for (let i = 0; i < interactive.length; i++) {
    for (let j = i + 1; j < interactive.length; j++) {
      if (overlaps(boundsOf(interactive[i]), boundsOf(interactive[j]))) {
        issues.push({
          rule: "no-interactive-overlap",
          detail: `${interactive[i].id ?? i} overlaps ${interactive[j].id ?? j}`,
        });
      }
    }
  }
  return issues;
}

/** Run all checks; returns a flat list of issues (empty = healthy layout). */
export function auditLayout(nodes: UINode[]): LayoutIssue[] {
  return [
    ...checkWithinSafeArea(nodes),
    ...checkTouchTargets(nodes),
    ...checkNoInteractiveOverlap(nodes),
  ];
}

function fmt(b: Box): string {
  return `[${b.left.toFixed(0)},${b.top.toFixed(0)} → ${b.right.toFixed(0)},${b.bottom.toFixed(0)}]`;
}
