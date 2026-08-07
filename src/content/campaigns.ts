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
import { PUEBLO_DEL_AYER, FIESTA_DE_DAPHNE } from "./world.js";
import { A2_PAST_TENSE, A2_FIESTA_DAPHNE } from "./lessons.js";
import { buildDailyGraph } from "../domain/objectives/daily.js";
import { buildDaphnePartyGraph } from "../domain/objectives/daphneParty.js";

export interface Campaign {
  id: string;
  area: Area;
  lesson: Lesson;
  objectives: ObjectiveGraph;
}

export const CAMPAIGNS: Record<string, Campaign> = {
  "pueblo-del-ayer": {
    id: "pueblo-del-ayer",
    area: PUEBLO_DEL_AYER,
    lesson: A2_PAST_TENSE,
    objectives: buildDailyGraph(A2_PAST_TENSE),
  },
  "fiesta-de-daphne": {
    id: "fiesta-de-daphne",
    area: FIESTA_DE_DAPHNE,
    lesson: A2_FIESTA_DAPHNE,
    objectives: buildDaphnePartyGraph(A2_FIESTA_DAPHNE),
  },
};

// No in-game campaign switcher yet (single-campaign slice) — whichever id is
// DEFAULT_CAMPAIGN_ID is the one that actually boots.
export const DEFAULT_CAMPAIGN_ID = "fiesta-de-daphne";

/** The campaign the app boots into today (single-campaign slice for now). */
export const DEFAULT_CAMPAIGN: Campaign = CAMPAIGNS[DEFAULT_CAMPAIGN_ID];

export function campaignById(id: string): Campaign | undefined {
  return CAMPAIGNS[id];
}
