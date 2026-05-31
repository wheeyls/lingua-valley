/**
 * Pure UI scene-graph abstraction.
 *
 * Scenes describe their layout as a tree of typed UI nodes — NO Phaser. This is
 * the source of truth for "what the screen looks like". We can reason about and
 * test it (fits the safe area, no overlaps, touch targets big enough, text
 * wraps within bounds) deterministically with zero browser.
 *
 * The actual Phaser drawing is a DRIVING ADAPTER (see ui/PhaserRenderer) that
 * walks this tree. Treating the rendered output as an adapter keeps appearance
 * inspectable and the layout logic framework-free.
 *
 * Coordinate convention: x/y are the CENTER of a node (matches Phaser origin
 * 0.5 usage), with width/height giving its box. `rect`/`panel` may opt into
 * top-left origin via `origin: "topleft"`.
 */

export type Color = string; // text colors as hex strings; fills as 0xRRGGBB via number
export type Fill = number;

export interface BaseNode {
  /** Stable id for testing/debugging. */
  id?: string;
  /** Center x (or top-left x when origin is "topleft"). */
  x: number;
  y: number;
  /** Render order; higher is on top. */
  depth?: number;
  origin?: "center" | "topleft";
}

export interface PanelNode extends BaseNode {
  kind: "panel";
  width: number;
  height: number;
  fill: Fill;
  alpha?: number;
  stroke?: { color: Fill; width: number };
  /** Corner radius (visual only; renderer approximates). */
  radius?: number;
}

export interface TextNode extends BaseNode {
  kind: "text";
  text: string;
  fontSize: number; // px
  color: Color;
  align?: "left" | "center" | "right";
  italic?: boolean;
  /** Max width before wrapping; required for bound computation when set. */
  wrapWidth?: number;
  lineSpacing?: number;
  /** Estimated rendered width/height (set by layout, used for bounds). */
  measuredWidth?: number;
  measuredHeight?: number;
}

export interface ButtonNode extends BaseNode {
  kind: "button";
  text: string;
  width: number;
  height: number;
  fill: Fill;
  textColor: Color;
  fontSize: number;
  /** Action key the scene maps to a handler (keeps nodes data-only). */
  action: string;
}

export interface CircleNode extends BaseNode {
  kind: "circle";
  radius: number;
  fill: Fill;
  stroke?: { color: Fill; width: number };
}

export type UINode = PanelNode | TextNode | ButtonNode | CircleNode;

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Compute the axis-aligned bounding box of a node in screen space. */
export function boundsOf(node: UINode): Box {
  if (node.kind === "circle") {
    return {
      left: node.x - node.radius,
      top: node.y - node.radius,
      right: node.x + node.radius,
      bottom: node.y + node.radius,
    };
  }

  if (node.kind === "text") {
    const w = node.measuredWidth ?? estimateTextWidth(node);
    const h = node.measuredHeight ?? estimateTextHeight(node);
    // Text nodes default to center origin unless told otherwise.
    return originBox(node.x, node.y, w, h, node.origin ?? "center");
  }

  // panel / button
  return originBox(node.x, node.y, node.width, node.height, node.origin ?? (node.kind === "panel" ? "topleft" : "center"));
}

function originBox(
  x: number,
  y: number,
  w: number,
  h: number,
  origin: "center" | "topleft",
): Box {
  if (origin === "topleft") {
    return { left: x, top: y, right: x + w, bottom: y + h };
  }
  return { left: x - w / 2, top: y - h / 2, right: x + w / 2, bottom: y + h / 2 };
}

/**
 * Estimate text dimensions without a canvas. Uses an average glyph-width ratio;
 * good enough to assert "fits within bounds / wraps" in tests. Deterministic.
 */
const AVG_CHAR_RATIO = 0.55; // average glyph width as a fraction of font size

export function estimateTextWidth(node: TextNode): number {
  const lines = wrapText(node);
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  return Math.min(
    node.wrapWidth ?? Infinity,
    longest * node.fontSize * AVG_CHAR_RATIO,
  );
}

export function estimateTextHeight(node: TextNode): number {
  const lines = wrapText(node);
  const lineH = node.fontSize * 1.2 + (node.lineSpacing ?? 0);
  return lines.length * lineH;
}

/** Greedy word-wrap to wrapWidth (or single line if none). Pure. */
export function wrapText(node: TextNode): string[] {
  const explicit = node.text.split("\n");
  if (!node.wrapWidth) return explicit;
  const maxChars = Math.max(
    1,
    Math.floor(node.wrapWidth / (node.fontSize * AVG_CHAR_RATIO)),
  );
  const out: string[] = [];
  for (const para of explicit) {
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= maxChars) {
        line = candidate;
      } else {
        if (line) out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Two boxes overlap (with a small tolerance to allow touching edges). */
export function overlaps(a: Box, b: Box, tol = 0.5): boolean {
  return (
    a.left < b.right - tol &&
    a.right > b.left + tol &&
    a.top < b.bottom - tol &&
    a.bottom > b.top + tol
  );
}
