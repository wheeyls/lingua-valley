/**
 * Friendship / rapport — the heart of the merchant fantasy.
 *
 * You make friends by having the SAME practical Spanish conversation with an NPC
 * over and over. Each completed role-play adds rapport, scaled by how well you
 * did. Rapport crosses tier thresholds (Stranger → Acquaintance → Friend →
 * Compadre), and higher tiers unlock better trades (see trade.ts).
 *
 * Pure domain: formulas only, no storage/framework. Fully testable.
 */

export type FriendTier = "stranger" | "acquaintance" | "friend" | "compadre";

export const FRIEND_TIERS: FriendTier[] = [
  "stranger",
  "acquaintance",
  "friend",
  "compadre",
];

/** Rapport points required to ENTER each tier. */
export const TIER_THRESHOLDS: Record<FriendTier, number> = {
  stranger: 0,
  acquaintance: 30,
  friend: 90,
  compadre: 200,
};

/** Base rapport for completing a role-play once (before quality scaling). */
export const BASE_RAPPORT = 10;

/** The tier for a given rapport total. */
export function tierFor(rapport: number): FriendTier {
  let result: FriendTier = "stranger";
  for (const tier of FRIEND_TIERS) {
    if (rapport >= TIER_THRESHOLDS[tier]) result = tier;
  }
  return result;
}

export function tierRank(tier: FriendTier): number {
  return FRIEND_TIERS.indexOf(tier);
}

/**
 * Rapport earned for completing a role-play, scaled by performance quality
 * (0..1). A good conversation is worth more, but every completion counts — so
 * repetition reliably builds friendship. Always >= 1 on completion.
 */
export function rapportGain(quality: number): number {
  const q = clamp01(quality);
  return Math.max(1, Math.round(BASE_RAPPORT * (0.5 + q)));
}

/** Progress (0..1) toward the NEXT tier; 1 when at the max tier. */
export function progressToNextTier(rapport: number): number {
  const tier = tierFor(rapport);
  const rank = tierRank(tier);
  if (rank >= FRIEND_TIERS.length - 1) return 1;
  const current = TIER_THRESHOLDS[tier];
  const next = TIER_THRESHOLDS[FRIEND_TIERS[rank + 1]];
  return clamp01((rapport - current) / (next - current));
}

export function nextTier(tier: FriendTier): FriendTier | null {
  const rank = tierRank(tier);
  return rank < FRIEND_TIERS.length - 1 ? FRIEND_TIERS[rank + 1] : null;
}

/** Human label for the HUD. */
export function tierLabel(tier: FriendTier): string {
  switch (tier) {
    case "stranger":
      return "Stranger";
    case "acquaintance":
      return "Acquaintance";
    case "friend":
      return "Friend";
    case "compadre":
      return "Compadre";
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
