/**
 * Party scene art — renders the picnic table at Daphne's birthday party as a
 * text-free picture. Same approach as sceneArt.ts (Maria's room): real SVG
 * files under src/assets/partyScene/, composited by layering item art over
 * the park background at fixed slot points — no target-language text.
 *
 * See sceneArt.ts's header comment for the full rationale; this file mirrors
 * it exactly, just pointed at the picnic scene's assets/coordinates.
 */

import parkUrl from "../assets/partyScene/park.svg?url";
import pinataUrl from "../assets/partyScene/items/pinata.svg?url";
import pastelUrl from "../assets/partyScene/items/pastel.svg?url";
import regaloUrl from "../assets/partyScene/items/regalo.svg?url";
import globoUrl from "../assets/partyScene/items/globo.svg?url";
import velaUrl from "../assets/partyScene/items/vela.svg?url";
import type {
  DailyScene,
  ItemId,
  SlotAssignment,
  SlotId,
} from "../domain/objectives/partyScene.js";

const ITEM_SRC: Record<ItemId, string> = {
  pinata: pinataUrl,
  pastel: pastelUrl,
  regalo: regaloUrl,
  globo: globoUrl,
  vela: velaUrl,
};

/** One placement point, as a percentage of the park canvas. */
interface SlotPoint {
  left: number;
  top: number;
  /** Item is partly hidden behind/under the anchor at this point. */
  dim?: boolean;
}

/** [position 0 point, position 1 point] for each slot — tuned to park.svg. */
const SLOT_LAYOUT: Record<SlotId, [SlotPoint, SlotPoint]> = {
  cooler: [
    { left: 88, top: 93.75 }, // in front of the cooler
    { left: 88, top: 70.8, dim: true }, // behind the cooler
  ],
  table: [
    { left: 66.25, top: 58.75 }, // on top of the table
    { left: 66.25, top: 84.2, dim: true }, // under the table
  ],
  tree: [
    { left: 9, top: 64.6 }, // left of the tree
    { left: 37.5, top: 64.6 }, // right of the tree
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

/** Renders today's scene as a picture: the park canvas with items layered on top. */
export function renderPartySceneHtml(scene: DailyScene): string {
  const { cooler, table, tree } = bySlot(scene);
  return (
    `<img class="scene-bg" src="${parkUrl}" alt="" />` +
    itemLayer(cooler) +
    itemLayer(table) +
    itemLayer(tree)
  );
}
