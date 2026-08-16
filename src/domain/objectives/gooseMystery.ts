/**
 * The Silly Goose mystery — Daphne's birthday campaign.
 *
 * The Goose stole the car keys and is hiding somewhere in the park. Which
 * of the 5 park locations he's actually in is picked deterministically per
 * calendar day (same mechanism WhereAreThingsParty already uses for "which
 * items go where today" — see prng.ts). Family members each know one
 * true/false fact about wherever he actually is; the player uses those
 * facts to guess with Marichuy.
 *
 * {wet, playArea, food} alone already uniquely identify all 5 locations —
 * verified by this file's test — so those three are the REQUIRED clues
 * (GooseStakes/GooseClue×2 in the objective graph); `animals` is a bonus
 * 4th confirming fact. `covered`/`gathering` from the original property
 * brainstorm are deliberately not modeled here — nothing would ever read
 * them.
 *
 * PURE DOMAIN: no framework. Fully testable.
 */

import { mulberry32, seedFromDay } from "../prng.js";

export interface GooseLocation {
  /** Matches a Location.id in content/world.ts (FIESTA_DE_DAPHNE). */
  id: string;
  /** Spanish, for dialogue interpolation. */
  name: string;
  wet: boolean;
  playArea: boolean;
  food: boolean;
  animals: boolean;
}

const LOCATIONS: GooseLocation[] = [
  { id: "el-chapoteadero", name: "el chapoteadero", wet: true, playArea: true, food: false, animals: false },
  { id: "el-parque-infantil", name: "el parque infantil", wet: false, playArea: true, food: false, animals: false },
  { id: "la-ramada", name: "la ramada", wet: false, playArea: false, food: true, animals: false },
  { id: "el-escenario", name: "el anfiteatro", wet: false, playArea: false, food: false, animals: false },
  { id: "el-estanque-de-los-patos", name: "el estanque", wet: true, playArea: false, food: false, animals: true },
];

/** Deterministic per calendar day — the same day always picks the same
 *  spot; different days (usually) pick differently. Salted so this doesn't
 *  correlate with other day-seeded content (item-placement scenes, etc). */
export function gooseLocationForDay(today: string): GooseLocation {
  const rand = mulberry32(seedFromDay(`${today}:goose`));
  return LOCATIONS[Math.floor(rand() * LOCATIONS.length)];
}
