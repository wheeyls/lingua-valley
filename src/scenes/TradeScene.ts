import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { GameState, REGISTRY_KEY } from "../game/state";
import { tradeLayout, type TradeRowVM } from "../ui/layouts/trade";
import { renderNodes, type RenderedUI } from "../ui/PhaserRenderer";
import {
  buy,
  sell,
  buyPrice,
  sellPrice,
  tierWith,
  type Good,
} from "../domain/trade";
import { tierRank, tierLabel, type FriendTier } from "../domain/friendship";

function findNpc(id: string): Npc | undefined {
  for (const a of AREAS) {
    const n = a.npcs.find((n) => n.id === id);
    if (n) return n;
  }
  return undefined;
}

/**
 * TradeScene — the shop. Prices reflect the player's friendship tier with this
 * NPC; goods stay locked until rapport is high enough. Thin renderer over the
 * tested trade layout; all rules live in domain/trade.ts.
 */
export class TradeScene extends Phaser.Scene {
  private state!: GameState;
  private npc!: Npc;
  private ui?: RenderedUI;
  private status = "";

  constructor() {
    super("TradeScene");
  }

  create(data: { npcId: string }) {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.npc = findNpc(data.npcId)!;
    this.status = "";
    this.render();
    this.input.keyboard!.on("keydown-ESC", () => this.close());
  }

  private render() {
    this.ui?.destroy();

    const ps = this.state.player.getState();
    const tier = tierWith(ps, this.npc.id);
    const goods = this.npc.trades ?? [];

    const rows: TradeRowVM[] = goods.map((g) => {
      const locked = tierRank(tier) < tierRank(g.requiresTier);
      return {
        goodId: g.id,
        name: g.name,
        buyPrice: locked ? null : buyPrice(g, tier),
        sellPrice: sellPrice(g, tier),
        owned: ps.goods[g.id] ?? 0,
        locked,
        requiresTierLabel: tierLabel(g.requiresTier as FriendTier),
      };
    });

    const handlers: Record<string, () => void> = {
      close: () => this.close(),
    };
    for (const g of goods) {
      handlers[`buy:${g.id}`] = () => void this.buy(g);
      handlers[`sell:${g.id}`] = () => void this.sell(g);
    }

    this.ui = renderNodes(
      this,
      tradeLayout({
        npcName: this.npc.name,
        friendshipLabel: tierLabel(tier),
        pesos: ps.pesos,
        rows,
        status: this.status || undefined,
      }),
      handlers,
    );
  }

  private async buy(good: Good) {
    const result = await this.state.player.applyTrade((s) => buy(s, this.npc.id, good));
    if (result.ok) {
      this.status = `Bought ${good.name}  ${result.pesosDelta} pesos`;
    } else if (result.error === "cannot-afford") {
      this.status = `Not enough pesos for ${good.name}.`;
    } else if (result.error === "locked") {
      this.status = `${good.name} unlocks with more friendship.`;
    }
    this.render();
  }

  private async sell(good: Good) {
    const result = await this.state.player.applyTrade((s) => sell(s, this.npc.id, good));
    if (result.ok) {
      this.status = `Sold ${good.name}  +${result.pesosDelta} pesos`;
    } else if (result.error === "none-to-sell") {
      this.status = `You have no ${good.name} to sell.`;
    }
    this.render();
  }

  private close() {
    this.scene.stop();
    this.scene.resume("WorldScene");
  }
}
