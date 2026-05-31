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
      const bg = scene.add
        .rectangle(node.x, node.y, node.width, node.height, node.fill, 1)
        .setStrokeStyle(2, 0xd9b08c)
        .setInteractive({ useHandCursor: true });
      const label = scene.add
        .text(node.x, node.y, node.text, {
          fontFamily: FONT,
          fontSize: `${node.fontSize}px`,
          color: node.textColor,
          align: "center",
        })
        .setOrigin(0.5);
      const handler = handlers[node.action];
      bg.on(Phaser.Input.Events.POINTER_OVER, () => bg.setFillStyle(lighten(node.fill)));
      bg.on(Phaser.Input.Events.POINTER_OUT, () => bg.setFillStyle(node.fill));
      bg.on(Phaser.Input.Events.POINTER_UP, () => {
        bg.setFillStyle(node.fill);
        handler?.();
      });
      // Group bg+label so depth/lookup work on one object.
      const container = scene.add.container(0, 0, [bg, label]);
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
