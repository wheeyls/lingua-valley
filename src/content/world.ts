/**
 * World definition — the campaign you're currently playing.
 *
 * A campaign (one CEFR level / one week's lesson) is laid out as a HUB with a
 * handful of LOCATIONS you click into:
 *
 *   - Field        — your crops (rendered live from player state, not an NPC).
 *   - Seed farm    — intro conversation; plants this week's crop.
 *   - Practice     — the daily drill. May have TWO people (story-teller + the
 *                    one who quizzes you on it). Waters the field.
 *   - Store        — review conversation; sells the harvest for money.
 *   - Station      — buy a train ticket to the next campaign (live card).
 *
 * Each location maps to one farming ROLE (seeds / water / store). A location can
 * host more than one NPC; you talk to them in sequence to complete the role.
 */

import type { CefrLevel } from "../domain/cefr.js";
import type { DailyRole } from "../domain/dailyLoop.js";

export interface DialogueLine {
  level: CefrLevel;
  es: string;
  en: string;
}

export interface Npc {
  id: string;
  name: string;
  color: number;
  voice?: string;
  conversation: { opener: string };
  lines: DialogueLine[];
}

/** A clickable place in the campaign hub that hosts one or more NPCs. */
export interface Location {
  id: string;
  name: string;
  /** The farming role fulfilled here (seeds / water / store). */
  role: DailyRole;
  /** Emoji/icon for the hub card. */
  icon: string;
  /** One-line description shown on the hub card. */
  blurb: string;
  /** NPC ids hosted here, in the order you talk to them. */
  npcIds: string[];
  /** Hidden locations are dropped from the UI (no hub door, no room) but kept in
   *  content, so re-enabling one is just a matter of removing this flag. */
  hidden?: boolean;
}

export interface Area {
  id: string;
  name: string;
  level: CefrLevel;
  /** Short narrative framing for the campaign (shown in the hub). */
  blurb: string;
  /** The area this one's train ticket leads to (undefined for the last area). */
  nextAreaId?: string;
  /** Price of the train ticket to the next area, in money. */
  ticketPrice: number;
  /** Clickable locations in the hub. */
  locations: Location[];
  /** All NPCs in the campaign (referenced by locations). */
  npcs: Npc[];
}

export const AREAS: Area[] = [
  {
    id: "pueblo-del-ayer",
    name: "Pueblo del Ayer",
    level: "A2",
    blurb:
      "A sleepy village where everyone loves to recount their day. This week: " +
      "talking about the past — understand a story, retell it, share your own.",
    nextAreaId: "ciudad-manana",
    ticketPrice: 60,
    locations: [
      {
        id: "seed-farm",
        name: "La Granja de Semillas",
        role: "seeds",
        icon: "🌱",
        blurb: "Hear Marisol's story and take home this week's seed.",
        npcIds: ["marisol"],
      },
      {
        id: "plaza",
        name: "La Plaza",
        role: "water",
        icon: "💧",
        blurb: "Retell Marisol's story to Pablo. Waters your field.",
        npcIds: ["pablo"],
      },
      {
        id: "store",
        name: "La Tienda",
        role: "store",
        icon: "🛒",
        blurb: "Tell Doña Tienda about your day and sell your harvest.",
        npcIds: ["shopkeeper"],
        hidden: true,
      },
    ],
    npcs: [
      {
        id: "marisol",
        name: "Marisol",
        color: 0x2a9d8f,
        voice: "nova",
        conversation: {
          opener: "¡Hola! ¿Te cuento lo que hice hoy? Escucha bien…",
        },
        lines: [
          {
            level: "A2",
            es: "👂 Escucha la historia de Marisol",
            en: "Marisol will tell you what she did today. Listen and understand her story. Tap 'Talk' to begin.",
          },
        ],
      },
      {
        id: "pablo",
        name: "Pablo",
        color: 0x3d5a80,
        voice: "echo",
        conversation: {
          opener: "Oye, ¿qué hizo Marisol hoy? Cuéntame.",
        },
        lines: [
          {
            level: "A2",
            es: "🗣️ Cuéntale a Pablo la historia",
            en: "Retell what Marisol did, in the past tense. Finishing this waters your field. Tap 'Talk' to begin.",
          },
        ],
      },
      {
        id: "shopkeeper",
        name: "Doña Tienda",
        color: 0xb5793a,
        voice: "shimmer",
        conversation: {
          opener: "¡Bienvenido! ¿Qué me traes hoy? Cuéntame, ¿qué hiciste?",
        },
        lines: [
          {
            level: "A2",
            es: "🛒 Vende tu cosecha en la tienda",
            en: "Bring a grown crop, tell Doña Tienda about your day, and sell it for money toward a train ticket. Tap 'Talk' to begin.",
          },
        ],
      },
    ],
  },
];

export function findNpc(id: string): Npc | undefined {
  for (const a of AREAS) {
    const n = a.npcs.find((n) => n.id === id);
    if (n) return n;
  }
  return undefined;
}

export function areaOfNpc(npcId: string): Area | undefined {
  return AREAS.find((a) => a.npcs.some((n) => n.id === npcId));
}

/** The campaign the player is currently in (single-area slice for now). */
export const CURRENT_AREA: Area = AREAS[0];

/** Locations currently surfaced in the UI — hidden ones are dropped for now. */
export function visibleLocations(area: Area = CURRENT_AREA): Location[] {
  return area.locations.filter((l) => !l.hidden);
}

export function findLocation(areaId: string, locationId: string): Location | undefined {
  return AREAS.find((a) => a.id === areaId)?.locations.find((l) => l.id === locationId);
}
