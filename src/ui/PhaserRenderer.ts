/**
 * PhaserRenderer — DRIVING ADAPTER that turns the pure UI node tree into Phaser
 * game objects. The layout (ui/layouts/*) is the source of truth; this just
 * draws it. Button actions are dispatched to a handler map supplied by the scene.
 */

import Phaser from "phaser";
import { FONT } from "./tokens";
import type { UINode, TextNode } from "./nodes";

export type ActionHandlers = Record<string, () => void>;

export interface RenderedUI {
  container: Phaser.GameObjects.Container;
  /** Lookup a created object by node id (for later mutation/animation). */
  byId: Map<string, Phaser.GameObjects.GameObject>;
  destroy(): void;
}

export function renderNodes(
  scene: Phaser.Scene,
  nodes: UINode[],
  handlers: ActionHandlers = {},
): RenderedUI {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const byId = new Map<string, Phaser.GameObjects.GameObject>();

  for (const node of nodes) {
    const obj = createNode(scene, node, handlers);
    if (node.depth !== undefined) {
      (obj as unknown as Phaser.GameObjects.Components.Depth).setDepth(node.depth);
    }
    if (node.id) byId.set(node.id, obj);
    objects.push(obj);
  }

  const container = scene.add.container(0, 0, objects);
  return {
    container,
    byId,
    destroy: () => container.destroy(),
  };
}

function createNode(
  scene: Phaser.Scene,
  node: UINode,
  handlers: ActionHandlers,
): Phaser.GameObjects.GameObject {
  switch (node.kind) {
    case "panel": {
      // Rounded panels are drawn with Graphics for a softer, polished feel.
      if (node.radius && node.radius > 0) {
        const g = scene.add.graphics();
        const x = node.origin === "topleft" ? node.x : node.x - node.width / 2;
        const y = node.origin === "topleft" ? node.y : node.y - node.height / 2;
        g.fillStyle(node.fill, node.alpha ?? 1);
        g.fillRoundedRect(x, y, node.width, node.height, node.radius);
        if (node.stroke) {
          g.lineStyle(node.stroke.width, node.stroke.color, 1);
          g.strokeRoundedRect(x, y, node.width, node.height, node.radius);
        }
        return g;
      }
      const r = scene.add.rectangle(
        node.x,
        node.y,
        node.width,
        node.height,
        node.fill,
        node.alpha ?? 1,
      );
      if (node.origin === "topleft") r.setOrigin(0, 0);
      if (node.stroke) r.setStrokeStyle(node.stroke.width, node.stroke.color);
      return r;
    }
    case "circle": {
      const c = scene.add.circle(node.x, node.y, node.radius, node.fill);
      if (node.stroke) c.setStrokeStyle(node.stroke.width, node.stroke.color);
      return c;
    }
    case "text": {
      return makeText(scene, node);
    }
    case "button": {
      const { x, y, width: bw, height: bh } = node;
      const radius = Math.min(18, bh / 2);
      // Chunky, rounded, thick-bordered button drawn with Graphics.
      const g = scene.add.graphics();
      const draw = (fillColor: number) => {
        g.clear();
        // Soft drop shadow for a friendlier, raised look.
        g.fillStyle(0x000000, 0.25);
        g.fillRoundedRect(x - bw / 2, y - bh / 2 + 4, bw, bh, radius);
        g.fillStyle(fillColor, 1);
        g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, radius);
        g.lineStyle(3, 0xd9b08c, 1);
        g.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, radius);
      };
      draw(node.fill);

      const label = scene.add
        .text(x, y, node.text, {
          fontFamily: FONT,
          fontSize: `${node.fontSize}px`,
          color: node.textColor,
          align: "center",
        })
        .setOrigin(0.5);

      // Transparent interactive zone on top (Graphics hit areas are fiddly).
      const hit = scene.add
        .rectangle(x, y, bw, bh, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      const handler = handlers[node.action];
      hit.on(Phaser.Input.Events.POINTER_DOWN, () => draw(lighten(node.fill)));
      hit.on(Phaser.Input.Events.POINTER_OVER, () => draw(lighten(node.fill)));
      hit.on(Phaser.Input.Events.POINTER_OUT, () => draw(node.fill));
      hit.on(Phaser.Input.Events.POINTER_UP, () => {
        draw(node.fill);
        handler?.();
      });

      const container = scene.add.container(0, 0, [g, label, hit]);
      return container;
    }
  }
}

function makeText(scene: Phaser.Scene, node: TextNode): Phaser.GameObjects.Text {
  const t = scene.add.text(node.x, node.y, node.text, {
    fontFamily: FONT,
    fontSize: `${node.fontSize}px`,
    color: node.color,
    align: node.align ?? "left",
    fontStyle: node.italic ? "italic" : "normal",
    wordWrap: node.wrapWidth ? { width: node.wrapWidth } : undefined,
    ...(node.lineSpacing ? { lineSpacing: node.lineSpacing } : {}),
  });
  if ((node.origin ?? "center") === "center") {
    t.setOrigin(0.5);
  } else {
    t.setOrigin(0, 0);
    if (node.align === "right") t.setOrigin(1, 0);
  }
  return t;
}

function lighten(color: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(
    Math.min(255, c.red + 28),
    Math.min(255, c.green + 28),
    Math.min(255, c.blue + 28),
  );
}
