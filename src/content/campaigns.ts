/**
 * Campaigns — the addressable, versionable pairing of an Area (places/NPCs)
 * with the Lesson (learning content) it drills. Adding a new campaign later
 * (different place, different people, different lesson) is just a new entry
 * here — nothing in GameController/maps.ts needs to change.
 */

import type { Area } from "./world.js";
import type { Lesson } from "../domain/objectives/lesson.js";
import { PUEBLO_DEL_AYER } from "./world.js";
import { A2_PAST_TENSE } from "./lessons.js";

export interface Campaign {
  id: string;
  area: Area;
  lesson: Lesson;
}

export const CAMPAIGNS: Record<string, Campaign> = {
  "pueblo-del-ayer": { id: "pueblo-del-ayer", area: PUEBLO_DEL_AYER, lesson: A2_PAST_TENSE },
};

export const DEFAULT_CAMPAIGN_ID = "pueblo-del-ayer";

/** The campaign the app boots into today (single-campaign slice for now). */
export const DEFAULT_CAMPAIGN: Campaign = CAMPAIGNS[DEFAULT_CAMPAIGN_ID];

export function campaignById(id: string): Campaign | undefined {
  return CAMPAIGNS[id];
}
