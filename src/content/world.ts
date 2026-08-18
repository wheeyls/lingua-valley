/**
 * World definition — the campaign you're currently playing.
 *
 * A campaign (one CEFR level / one week's lesson) is laid out as a HUB with a
 * handful of LOCATIONS you click into:
 *
 *   - Field        — your crops (rendered live from player state, not an NPC).
 *   - Seed farm    — Jackie tells her story and hands over this week's seed;
 *                    plants this week's crop.
 *   - Practice     — retell Jackie's story to Jorgito. Waters the field.
 *   - Store        — review conversation; sells the harvest for money.
 *   - Station      — buy a train ticket to the next campaign (live card).
 *
 * Each location maps to one farming ROLE (seeds / water / store). A location can
 * host more than one NPC; you talk to them in sequence to complete the role.
 */

import type { CefrLevel } from "../domain/cefr.js";
import type { DailyRole } from "../domain/dailyLoop.js";
import type { ObjectiveState } from "../domain/objective.js";
import { gooseLocationForDay, locationLabelEn } from "../domain/objectives/gooseMystery.js";
import { PARK_BG, PARK_BG_PORTRAIT, STREET_BG, STREET_BG_PORTRAIT } from "./art.js";

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
  /** Id of the anchor marker (a <circle id="..."> present in BOTH of the
   *  Area's backgrounds — landscape and portrait) this location's pin
   *  cluster is centered on. Resolved to actual coordinates per-orientation
   *  by buildHubMap — see maps.ts's resolveAnchor(). */
  anchor: string;
  /** Hidden locations are dropped from the UI (no hub door, no room) but kept in
   *  content, so re-enabling one is just a matter of removing this flag. */
  hidden?: boolean;
}

/** A background SVG plus the viewBox it was authored against — the anchor
 *  circles inside it are resolved in these units (see content/maps.ts). */
export interface MapBackground {
  svg: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
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
  /** Wide-viewport hub map. Every Location.anchor must resolve in this
   *  background too (not just backgroundPortrait). */
  backgroundLandscape: MapBackground;
  /** Narrow-viewport hub map — different art, same anchor ids, own viewBox. */
  backgroundPortrait: MapBackground;
  /** Optional per-day dynamic NPC placement — e.g. a character whose
   *  location (or visibility) isn't fixed content but computed from the
   *  calendar day (YYYY-MM-DD) and today's objective progress. Returns null
   *  if nothing dynamic applies today (including "not visible yet").
   *  Resolved by content/maps.ts's buildHubMap, on top of each Location's
   *  static npcIds — see the Silly Goose in FIESTA_DE_DAPHNE for the only
   *  current use. */
  dynamicNpc?: (
    today: string,
    objectiveState: ObjectiveState,
  ) => { locationId: string; npcId: string } | null;
}

export const PUEBLO_DEL_AYER: Area = {
  id: "pueblo-del-ayer",
  name: "Pueblo del Ayer",
  level: "A2",
  blurb:
    "A sleepy village where everyone loves to recount their day. This week: " +
    "talking about the past — understand a story, retell it, share your own.",
  nextAreaId: "ciudad-manana",
  ticketPrice: 60,
  backgroundLandscape: { svg: STREET_BG, viewBoxWidth: 400, viewBoxHeight: 220 },
  backgroundPortrait: { svg: STREET_BG_PORTRAIT, viewBoxWidth: 240, viewBoxHeight: 460 },
  locations: [
    {
      id: "seed-farm",
      name: "Seed Farm",
      role: "seeds",
      icon: "🌱",
      blurb: "Hear Jackie's story and take home this week's seed.",
      npcIds: ["jackie"],
      anchor: "seed-farm",
    },
    {
      id: "plaza",
      name: "Plaza",
      role: "water",
      icon: "💧",
      blurb: "Retell Jackie's story to Jorgito. Waters your field.",
      npcIds: ["jorgito"],
      anchor: "plaza",
    },
    {
      id: "store",
      name: "Store",
      role: "store",
      icon: "🛒",
      blurb: "Tell Doña Tienda about your day and sell your harvest.",
      npcIds: ["shopkeeper"],
      anchor: "store",
      hidden: true,
    },
    {
      id: "the-woods",
      name: "The Woods",
      role: "foliage",
      icon: "🍃",
      blurb: "Gather greenery with Arlene for this week's bouquet.",
      npcIds: ["arlene"],
      anchor: "the-woods",
    },
    {
      id: "the-room",
      name: "Living Room",
      role: "ribbons",
      icon: "🪑",
      blurb: "Help Maria find where things are — and finish off the bouquet.",
      npcIds: ["maria"],
      anchor: "the-room",
    },
  ],
  npcs: [
    {
      id: "jackie",
      name: "Jackie",
      color: 0x2a9d8f,
      voice: "nova",
      conversation: {
        opener: "¡Hola! ¿Cómo estás?",
      },
      lines: [
        {
          level: "A2",
          es: "👂 Escucha la historia de Jackie",
          en: "Jackie will greet you and tell you about her day. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "jorgito",
      name: "Jorgito",
      color: 0x3d5a80,
      voice: "echo",
      conversation: {
        opener: "Oye, ¿qué tal?",
      },
      lines: [
        {
          level: "A2",
          es: "🗣️ Cuéntale a Jorgito la historia",
          en: "Retell what Jackie did, in the past tense. Finishing this waters your field. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "shopkeeper",
      name: "Doña Tienda",
      color: 0xb5793a,
      voice: "shimmer",
      conversation: {
        opener: "¡Bienvenido! ¿Cómo estás?",
      },
      lines: [
        {
          level: "A2",
          es: "🛒 Vende tu cosecha en la tienda",
          en: "Bring a grown crop, tell Doña Tienda about your day, and sell it for money toward a train ticket. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "arlene",
      name: "Arlene",
      color: 0x6b8f47,
      voice: "alloy",
      conversation: {
        opener: "¡Hola! ¿Qué tal?",
      },
      lines: [
        {
          level: "A2",
          es: "🍃 Reúne follaje con Arlene",
          en: "Chat with Arlene about your plans — today, this week, or the weekend. Gathers greenery for this week's bouquet. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "maria",
      name: "Maria",
      color: 0xd4a373,
      voice: "fable",
      conversation: {
        opener: "¡Hola! ¿Cómo estás?",
      },
      lines: [
        {
          level: "A2",
          es: "🪑 Adivina dónde están las cosas con Maria",
          en: "Maria will ask where things are in her room — practice on top of / under, in front of / behind, left / right. Adds ribbons to this week's bouquet. Tap 'Talk' to begin.",
        },
      ],
    },
  ],
};

/**
 * El Cumpleaños de Daphne — a park in Phoenix, December, Daphne's first
 * birthday. The Silly Goose stole the car keys and is hiding somewhere in
 * the park — the cake and presents are locked in the car until he's found.
 * Family members (real people, kept simple — they teach a name and share
 * one fact, not much personality) each know one true/false clue about
 * wherever he actually is today (see domain/objectives/gooseMystery.ts for
 * the day-seeded ground truth); the player deduces the spot and guesses
 * with Marichuy. The Goose himself stays off the map entirely until the
 * player guesses correctly (`dynamicNpc` below checks find-the-goose's
 * outputs) — he doesn't appear as a shortcut around the deduction, only as
 * the payoff once you've actually solved it, at that same true location.
 */
export const FIESTA_DE_DAPHNE: Area = {
  id: "fiesta-de-daphne",
  name: "El Cumpleaños de Daphne",
  level: "A2",
  blurb:
    "Diciembre en Phoenix — hace sol pero no hace calor. Es el primer " +
    "cumpleaños de Daphne, ¡pero el ganso travieso se robó las llaves del " +
    "carro! Esta semana: escuchar pistas sobre dónde se escondió, y " +
    "adivinar el lugar correcto.",
  ticketPrice: 60,
  backgroundLandscape: { svg: PARK_BG, viewBoxWidth: 400, viewBoxHeight: 220 },
  backgroundPortrait: { svg: PARK_BG_PORTRAIT, viewBoxWidth: 240, viewBoxHeight: 460 },
  dynamicNpc: (today, objectiveState) => {
    if (objectiveState["find-the-goose"]?.outputs?.result !== "correcto") return null;
    const loc = gooseLocationForDay(today);
    return { locationId: loc.id, npcId: "ganso-tonto" };
  },
  locations: [
    {
      id: "la-ramada",
      name: locationLabelEn("la-ramada"),
      role: "seeds",
      icon: "🎂",
      blurb: "Papachulo te espera bajo la ramada — el ganso se llevó las llaves y solo él sabe una pista.",
      npcIds: ["jorge-abuelo"],
      anchor: "la-ramada",
    },
    {
      id: "el-chapoteadero",
      name: locationLabelEn("el-chapoteadero"),
      role: "water",
      icon: "💦",
      blurb: "Jorgito está junto al chapoteadero — tiene otra pista sobre el ganso.",
      npcIds: ["jorgito-tio"],
      anchor: "el-chapoteadero",
    },
    {
      id: "el-parque-infantil",
      name: locationLabelEn("el-parque-infantil"),
      role: "store",
      icon: "🛝",
      blurb: "Marichuy te espera en el parque infantil — dile dónde crees que está el ganso.",
      npcIds: ["maria-abuela"],
      anchor: "el-parque-infantil",
    },
    {
      id: "el-escenario",
      name: locationLabelEn("el-escenario"),
      role: "foliage",
      icon: "🎶",
      blurb: "Tía Jackie está junto al anfiteatro — tiene una pista sobre el ganso.",
      npcIds: ["jackie-tia"],
      anchor: "el-escenario",
    },
    {
      id: "el-estanque-de-los-patos",
      name: locationLabelEn("el-estanque-de-los-patos"),
      role: "ribbons",
      icon: "🦆",
      blurb: "Tía Anet está junto al estanque — tiene una pista extra, si la quieres.",
      npcIds: ["anette-tia"],
      anchor: "el-estanque-de-los-patos",
    },
  ],
  npcs: [
    {
      id: "jorge-abuelo",
      name: "Papachulo",
      color: 0xc0392b,
      voice: "onyx",
      conversation: {
        opener: "¡Hola! ¿Cómo estás?",
      },
      lines: [
        {
          level: "A2",
          es: "🔑 Escucha a Papachulo — ¡el ganso se llevó las llaves!",
          en: "Papachulo will explain what happened — the Silly Goose ran off with the car keys! He knows one clue about where the goose went. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "jorgito-tio",
      name: "Jorgito",
      color: 0x3d5a80,
      voice: "echo",
      conversation: {
        opener: "Oye, ¿qué tal?",
      },
      lines: [
        {
          level: "A2",
          es: "🔍 Pregúntale a Jorgito lo que sabe",
          en: "Jorgito has his own clue about where the goose is hiding. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "jackie-tia",
      name: "Tía Jackie",
      color: 0x2a9d8f,
      voice: "nova",
      conversation: {
        opener: "¡Hola! ¿Cómo estás?",
      },
      lines: [
        {
          level: "A2",
          es: "🔍 Pregúntale a tía Jackie lo que sabe",
          en: "Tía Jackie has another clue about where the goose is hiding. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "anette-tia",
      name: "Tía Anet",
      color: 0x6b8f47,
      voice: "alloy",
      conversation: {
        opener: "¡Hola! ¿Qué tal?",
      },
      lines: [
        {
          level: "A2",
          es: "🔍 Pregúntale a tía Anet lo que sabe (pista extra)",
          en: "Tía Anet has a bonus clue, if you want extra confidence before you guess. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "maria-abuela",
      name: "Marichuy",
      color: 0xd4a373,
      voice: "fable",
      conversation: {
        opener: "¡Hola! ¿Qué tal?",
      },
      lines: [
        {
          level: "A2",
          es: "🔑 Dile a Marichuy dónde crees que está el ganso",
          en: "Time to guess! Tell Marichuy where you think the Silly Goose is hiding. Guess right and you'll get the keys back. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "ganso-tonto",
      name: "Silly Goose",
      color: 0xe8b923,
      voice: "shimmer",
      conversation: {
        opener: "¡HONK! Me... me encontraste.",
      },
      lines: [
        {
          level: "A2",
          es: "🔑 ¡Encontraste al ganso travieso!",
          en: "You guessed right and found him! He's shy about being caught red-handed (well, orange-billed) with the keys — say hi and celebrate. Tap 'Talk' to begin.",
        },
      ],
    },
  ],
};

/** All areas in the game. */
export const AREAS: Area[] = [PUEBLO_DEL_AYER, FIESTA_DE_DAPHNE];

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

/** Locations currently surfaced in the UI — hidden ones are dropped for now. */
export function visibleLocations(area: Area): Location[] {
  return area.locations.filter((l) => !l.hidden);
}

export function findLocation(areaId: string, locationId: string): Location | undefined {
  return AREAS.find((a) => a.id === areaId)?.locations.find((l) => l.id === locationId);
}
