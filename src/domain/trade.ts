/**
 * Trade — how friendship turns into "better trades for more resources".
 *
 * A higher friendship tier with an NPC multiplies the value you get from
 * trading with them AND unlocks goods they'll only share with friends. Pure
 * domain: rates and unlock rules only.
 */

import type { FriendTier } from "./friendship";
import { tierRank, tierFor } from "./friendship";
import type { PlayerState } from "./player";

/**
 * Trade rate multiplier by tier. Strangers get a poor deal (they speak over your
 * head / don't trust you); compadres give you their best prices.
 */
export const TRADE_RATE: Record<FriendTier, number> = {
  stranger: 0.6,
  acquaintance: 1.0,
  friend: 1.4,
  compadre: 1.8,
};

export function tradeMultiplier(tier: FriendTier): number {
  return TRADE_RATE[tier];
}

/** A tradeable good an NPC offers. */
export interface Good {
  id: string;
  name: string;
  /** Base peso value when sold deeper into the journey. */
  baseValue: number;
  /** Minimum friendship tier required before the NPC will trade this good. */
  requiresTier: FriendTier;
}

/** Which of an NPC's goods are unlocked at the player's current tier. */
export function unlockedGoods(goods: Good[], tier: FriendTier): Good[] {
  return goods.filter((g) => tierRank(tier) >= tierRank(g.requiresTier));
}

/**
 * The peso value of trading a good at a given tier (base value × tier rate).
 * Rounded. This is the "better trades" payoff of friendship.
 */
export function tradeValue(good: Good, tier: FriendTier): number {
  return Math.round(good.baseValue * tradeMultiplier(tier));
}

// --- Buying & selling -------------------------------------------------------
//
// The merchant fantasy: friends give you BETTER deals. As friendship rises the
// BUY price drops (a discount) and the SELL price rises (they pay you more), so
// the spread between buying low in one town and selling high in another widens
// with rapport.

/** What you pay to buy a good from this NPC at a given tier. */
export function buyPrice(good: Good, tier: FriendTier): number {
  // Buy at base, discounted by how generous the tier is (rate>1 => cheaper).
  return Math.max(1, Math.round(good.baseValue / tradeMultiplier(tier)));
}

/** What this NPC pays you to sell them a good at a given tier. */
export function sellPrice(good: Good, tier: FriendTier): number {
  return Math.round(good.baseValue * tradeMultiplier(tier));
}

export type TradeError = "locked" | "cannot-afford" | "none-to-sell";

export interface TradeResult {
  state: PlayerState;
  ok: boolean;
  error?: TradeError;
  /** Pesos delta (negative for buy, positive for sell). */
  pesosDelta: number;
}

/** Friendship tier the player currently has with an NPC. */
export function tierWith(state: PlayerState, npcId: string): FriendTier {
  return tierFor(state.rapport[npcId] ?? 0);
}

/**
 * Buy one unit of `good` from `npcId`. Pure: returns a new state. Fails if the
 * good is still locked at the player's tier or they can't afford it.
 */
export function buy(
  state: PlayerState,
  npcId: string,
  good: Good,
): TradeResult {
  const tier = tierWith(state, npcId);
  if (tierRank(tier) < tierRank(good.requiresTier)) {
    return { state, ok: false, error: "locked", pesosDelta: 0 };
  }
  const price = buyPrice(good, tier);
  if (state.pesos < price) {
    return { state, ok: false, error: "cannot-afford", pesosDelta: 0 };
  }
  return {
    state: {
      ...state,
      pesos: state.pesos - price,
      goods: { ...state.goods, [good.id]: (state.goods[good.id] ?? 0) + 1 },
    },
    ok: true,
    pesosDelta: -price,
  };
}

/**
 * Sell one unit of `good` to `npcId`. Pure. Fails if the player has none.
 */
export function sell(
  state: PlayerState,
  npcId: string,
  good: Good,
): TradeResult {
  const have = state.goods[good.id] ?? 0;
  if (have <= 0) {
    return { state, ok: false, error: "none-to-sell", pesosDelta: 0 };
  }
  const tier = tierWith(state, npcId);
  const price = sellPrice(good, tier);
  return {
    state: {
      ...state,
      pesos: state.pesos + price,
      goods: { ...state.goods, [good.id]: have - 1 },
    },
    ok: true,
    pesosDelta: price,
  };
}
