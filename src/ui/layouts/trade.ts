/**
 * Pure layout for the trade/shop screen. Shows the NPC's goods with prices that
 * reflect the player's friendship tier; locked goods show their required tier.
 * Buy/Sell are tappable per row. No Phaser — fully testable.
 */

import { VIEW_WIDTH, VIEW_HEIGHT, TYPE, COLOR, TOUCH_TARGET } from "../tokens";
import type { UINode } from "../nodes";

export interface TradeRowVM {
  goodId: string;
  name: string;
  /** Buy price at the current tier (null if locked). */
  buyPrice: number | null;
  sellPrice: number;
  owned: number;
  locked: boolean;
  /** Tier needed to unlock, shown when locked. */
  requiresTierLabel?: string;
}

export interface TradeVM {
  npcName: string;
  friendshipLabel: string;
  pesos: number;
  rows: TradeRowVM[];
  /** Transient status line (e.g. "Bought Manzanas  -6 pesos"). */
  status?: string;
}

const px = (s: string) => parseInt(s, 10);
const SAFE = 24;

export function tradeLayout(vm: TradeVM): UINode[] {
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
    alpha: 0.95,
    depth: 80,
  });

  // Header: NPC + friendship + pesos.
  nodes.push({
    kind: "text",
    id: "title",
    x: w / 2,
    y: SAFE + 42,
    text: `${vm.npcName} — Trade`,
    fontSize: px(TYPE.title),
    color: COLOR.gold,
    align: "center",
    wrapWidth: w - SAFE * 2,
    depth: 81,
  });
  nodes.push({
    kind: "text",
    id: "friendship",
    x: w / 2,
    y: SAFE + 80,
    text: `♥ ${vm.friendshipLabel}     💰 ${vm.pesos}`,
    fontSize: px(TYPE.label),
    color: COLOR.rose,
    align: "center",
    depth: 81,
  });

  // Goods rows.
  const rowH = 64;
  const startY = SAFE + 108;
  const rowW = w - SAFE * 2;
  vm.rows.forEach((row, i) => {
    const y = startY + i * (rowH + 10);

    nodes.push({
      kind: "panel",
      id: `row-${row.goodId}`,
      origin: "topleft",
      x: SAFE,
      y,
      width: rowW,
      height: rowH,
      fill: COLOR.panel,
      alpha: 0.9,
      stroke: { color: COLOR.goldNum, width: 1 },
      radius: 10,
      depth: 81,
    });

    nodes.push({
      kind: "text",
      id: `name-${row.goodId}`,
      origin: "topleft",
      x: SAFE + 14,
      y: y + 10,
      text: row.locked ? `🔒 ${row.name}` : row.name,
      fontSize: px(TYPE.body),
      color: row.locked ? COLOR.muted : COLOR.parchment,
      depth: 82,
    });

    nodes.push({
      kind: "text",
      id: `sub-${row.goodId}`,
      origin: "topleft",
      x: SAFE + 14,
      y: y + 38,
      text: row.locked
        ? `Unlocks at ${row.requiresTierLabel}`
        : `buy ${row.buyPrice} · sell ${row.sellPrice} · own ${row.owned}`,
      fontSize: px(TYPE.small),
      color: COLOR.muted,
      depth: 82,
    });

    if (!row.locked) {
      // Buy + Sell buttons on the right.
      nodes.push({
        kind: "button",
        id: `buy-${row.goodId}`,
        x: w - SAFE - 14 - 56 - 70,
        y: y + rowH / 2,
        width: 64,
        height: TOUCH_TARGET,
        text: "Buy",
        fill: COLOR.greenFill,
        textColor: COLOR.parchment,
        fontSize: px(TYPE.label),
        action: `buy:${row.goodId}`,
        depth: 82,
      });
      nodes.push({
        kind: "button",
        id: `sell-${row.goodId}`,
        x: w - SAFE - 14 - 28,
        y: y + rowH / 2,
        width: 64,
        height: TOUCH_TARGET,
        text: "Sell",
        fill: COLOR.blue,
        textColor: COLOR.parchment,
        fontSize: px(TYPE.label),
        action: `sell:${row.goodId}`,
        depth: 82,
      });
    }
  });

  // Status line.
  if (vm.status) {
    nodes.push({
      kind: "text",
      id: "status",
      x: w / 2,
      y: h - SAFE - 90,
      text: vm.status,
      fontSize: px(TYPE.label),
      color: COLOR.green,
      align: "center",
      wrapWidth: w - SAFE * 2,
      depth: 82,
    });
  }

  // Close button.
  nodes.push({
    kind: "button",
    id: "close",
    x: w / 2,
    y: h - SAFE - TOUCH_TARGET / 2,
    width: 220,
    height: TOUCH_TARGET,
    text: "Done trading",
    fill: COLOR.roseFill,
    textColor: COLOR.parchment,
    fontSize: px(TYPE.body),
    action: "close",
    depth: 82,
  });

  return nodes;
}
