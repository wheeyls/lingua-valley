/**
 * Scene art — renders Maria's daily scene as a text-free picture.
 *
 * Deliberately no Spanish (or English) vocabulary anywhere in the output:
 * the whole point is the player looks at a picture and produces the target
 * phrase themselves ("está encima de la mesa"), rather than reading it off
 * the screen. Only the room illustration and item art carry the meaning.
 *
 * Art assets live in `src/assets/scene/` as real, standalone SVG files —
 * `room.svg` is the background canvas, `items/*.svg` are the movable pieces.
 * They're plain vector files editable in any vector graphics editor
 * (Illustrator, Figma, Inkscape…), so a real artist can replace them without
 * touching this file. The only thing this file owns is where each item gets
 * placed on top of the room: `SLOT_LAYOUT` below maps each (slot, position)
 * pair to a point on the room's 400×240 viewBox, expressed as a percentage
 * so it stays correct at any render size. If `room.svg` is redrawn and the
 * door/table/vase move, update the matching entries here to match.
 */

import roomUrl from "../assets/scene/room.svg?url";
import catUrl from "../assets/scene/items/cat.svg?url";
import ballUrl from "../assets/scene/items/ball.svg?url";
import keyUrl from "../assets/scene/items/key.svg?url";
import hatUrl from "../assets/scene/items/hat.svg?url";
import bookUrl from "../assets/scene/items/book.svg?url";
import type { DailyScene, ItemId, SlotAssignment, SlotId } from "../domain/objectives/scene.js";

const ITEM_SRC: Record<ItemId, string> = {
  cat: catUrl,
  ball: ballUrl,
  key: keyUrl,
  hat: hatUrl,
  book: bookUrl,
};

/** One placement point, as a percentage of the room canvas. */
interface SlotPoint {
  left: number;
  top: number;
  /** Item is partly hidden behind/under the anchor at this point. */
  dim?: boolean;
}

/** [position 0 point, position 1 point] for each slot — tuned to room.svg. */
const SLOT_LAYOUT: Record<SlotId, [SlotPoint, SlotPoint]> = {
  door: [
    { left: 35, top: 50 }, // in front of the door, at eye level in the room
    { left: 11.25, top: 39.6, dim: true }, // behind the door, tucked against it
  ],
  table: [
    { left: 52.5, top: 59.2 }, // on top of the table
    { left: 52.5, top: 77.1, dim: true }, // under the table
  ],
  vase: [
    { left: 70, top: 32.5 }, // left of the vase
    { left: 90, top: 32.5 }, // right of the vase
  ],
};

const ITEM_WIDTH_PCT = 11;

function bySlot(scene: DailyScene): Partial<Record<SlotId, SlotAssignment>> {
  const map: Partial<Record<SlotId, SlotAssignment>> = {};
  for (const a of scene) map[a.slot] = a;
  return map;
}

function itemLayer(a: SlotAssignment | undefined): string {
  if (!a) return "";
  const point = SLOT_LAYOUT[a.slot][a.position];
  const cls = point.dim ? "scene-item-img scene-item-dim" : "scene-item-img";
  const style = `left:${point.left}%;top:${point.top}%;width:${ITEM_WIDTH_PCT}%`;
  return `<img class="${cls}" style="${style}" src="${ITEM_SRC[a.item]}" alt="" />`;
}

/** Renders today's scene as a picture: the room canvas with items layered on top. */
export function renderSceneHtml(scene: DailyScene): string {
  const { door, table, vase } = bySlot(scene);
  return (
    `<img class="scene-room-bg" src="${roomUrl}" alt="" />` +
    itemLayer(door) +
    itemLayer(table) +
    itemLayer(vase)
  );
}
