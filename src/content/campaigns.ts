/**
 * Campaigns — the addressable, versionable pairing of an Area (places/NPCs)
 * with the Lesson (learning content) it drills, plus the daily objective
 * graph that wires the two together. Adding a new campaign later (different
 * place, different people, different lesson) is just a new entry here —
 * nothing in GameController/maps.ts needs to change.
 */

import type { Area } from "./world.js";
import type { Lesson } from "../domain/objectives/lesson.js";
import type { ObjectiveGraph } from "../domain/objective.js";
import type { DailyRole } from "../domain/dailyLoop.js";
import { PUEBLO_DEL_AYER, FIESTA_DE_DAPHNE } from "./world.js";
import { A2_PAST_TENSE, A2_FIESTA_DAPHNE } from "./lessons.js";
import { buildDailyGraph } from "../domain/objectives/daily.js";
import { buildGooseMysteryGraph } from "../domain/objectives/daphneParty.js";

/**
 * Display flavor for one of a campaign's three growable resources (the main
 * seeds+water loop, or one of the two bonus roles). Deliberately independent
 * from a `Location`'s hub-door `icon` in world.ts — that's "what door to
 * tap", this is "what grew" — they happen to coincide sometimes but aren't
 * derived from each other.
 */
export interface ResourceTheme {
  /** Bloom-cell + card icon, e.g. 🌸 / 🎈. */
  icon: string;
  /** Card title, e.g. "Your garden" / "Your balloons". */
  label: string;
  /** e.g. "plant" / "balloon" — for "Your ___ bloomed!" toasts. */
  itemSingular: string;
  /** e.g. "plants" / "balloons" — for count-based hints. */
  itemPlural: string;
  /** Past-tense growth verb: "bloomed" / "inflated" / "gathered" / "tied". */
  grownVerb: string;
  /** Gerund for "start ___ing" — only set for the two self-planting bonus roles. */
  startVerb?: string;
}

/** A campaign's full reward flavor: the three resources + what the bonus two build toward. */
export interface RewardTheme {
  /** The "seeds"+"water" role — the main story/practice loop. */
  primary: ResourceTheme;
  /** The "foliage" role. */
  bonusA: ResourceTheme;
  /** The "ribbons" role. */
  bonusB: ResourceTheme;
  /** What bonusA + bonusB build together, e.g. "bouquet" / "party". */
  collectionName: string;
  /** Icon for the group checkpoint header, e.g. 💐 / 🎉. */
  collectionIcon: string;
}

/** Resolve a DailyRole to its resource theme. Undefined for "store" — money has no flavor. */
export function themeForRole(theme: RewardTheme, role: DailyRole): ResourceTheme | undefined {
  switch (role) {
    case "seeds":
    case "water":
      return theme.primary;
    case "foliage":
      return theme.bonusA;
    case "ribbons":
      return theme.bonusB;
    default:
      return undefined;
  }
}

const PUEBLO_REWARD_THEME: RewardTheme = {
  primary: {
    icon: "🌸",
    label: "Your garden",
    itemSingular: "plant",
    itemPlural: "plants",
    grownVerb: "bloomed",
  },
  bonusA: {
    icon: "🍃",
    label: "Your foliage",
    itemSingular: "foliage",
    itemPlural: "foliage",
    grownVerb: "gathered",
    startVerb: "gathering",
  },
  bonusB: {
    icon: "🎀",
    label: "Your ribbons",
    itemSingular: "ribbon",
    itemPlural: "ribbons",
    grownVerb: "tied",
    startVerb: "tying",
  },
  collectionName: "bouquet",
  collectionIcon: "💐",
};

const DAPHNE_REWARD_THEME: RewardTheme = {
  primary: {
    icon: "🎈",
    label: "Your balloons",
    itemSingular: "balloon",
    itemPlural: "balloons",
    grownVerb: "inflated",
  },
  bonusA: {
    icon: "🎊",
    label: "Your confetti",
    itemSingular: "confetti",
    itemPlural: "confetti",
    grownVerb: "tossed",
    startVerb: "tossing",
  },
  bonusB: {
    icon: "🍬",
    label: "Your treats",
    itemSingular: "treat",
    itemPlural: "treats",
    grownVerb: "packed",
    startVerb: "packing",
  },
  collectionName: "party",
  collectionIcon: "🎉",
};

export interface Campaign {
  id: string;
  area: Area;
  lesson: Lesson;
  objectives: ObjectiveGraph;
  rewardTheme: RewardTheme;
}

export const CAMPAIGNS: Record<string, Campaign> = {
  "pueblo-del-ayer": {
    id: "pueblo-del-ayer",
    area: PUEBLO_DEL_AYER,
    lesson: A2_PAST_TENSE,
    objectives: buildDailyGraph(A2_PAST_TENSE),
    rewardTheme: PUEBLO_REWARD_THEME,
  },
  "fiesta-de-daphne": {
    id: "fiesta-de-daphne",
    area: FIESTA_DE_DAPHNE,
    lesson: A2_FIESTA_DAPHNE,
    objectives: buildGooseMysteryGraph(A2_FIESTA_DAPHNE),
    rewardTheme: DAPHNE_REWARD_THEME,
  },
};

// No in-game campaign switcher yet (single-campaign slice) — whichever id is
// DEFAULT_CAMPAIGN_ID is the one that actually boots. The leaderboard and
// checkpoint routes (main.ts) always theme against DEFAULT_CAMPAIGN too —
// fine for now, but checkpoint's aggregated group total in particular can't
// be split by theme, so this'll need real per-user/per-group campaign
// resolution once a switcher exists.
export const DEFAULT_CAMPAIGN_ID = "fiesta-de-daphne";

/** The campaign the app boots into today (single-campaign slice for now). */
export const DEFAULT_CAMPAIGN: Campaign = CAMPAIGNS[DEFAULT_CAMPAIGN_ID];

export function campaignById(id: string): Campaign | undefined {
  return CAMPAIGNS[id];
}
