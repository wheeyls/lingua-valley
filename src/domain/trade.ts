/**
 * Trade — how friendship turns into "better trades for more resources".
 *
 * A higher friendship tier with an NPC multiplies the value you get from
 * trading with them AND unlocks goods they'll only share with friends. Pure
 * domain: rates and unlock rules only.
 */

import type { FriendTier } from "./friendship";
import { tierRank } from "./friendship";

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
