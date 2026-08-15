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
import { PARK_BG } from "./art.js";

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
  /** Id of the anchor marker (a <circle id="..."> in the Area's
   *  backgroundSvg) this location's pin cluster is centered on. Resolved to
   *  actual coordinates by buildHubMap — see maps.ts's resolveAnchor(). */
  anchor: string;
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
  /** Inline SVG for the hub background. Falls back to STREET_BG if unset. */
  backgroundSvg?: string;
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
  locations: [
    {
      id: "seed-farm",
      name: "La Granja de Semillas",
      role: "seeds",
      icon: "🌱",
      blurb: "Hear Jackie's story and take home this week's seed.",
      npcIds: ["jackie"],
      anchor: "seed-farm",
    },
    {
      id: "plaza",
      name: "La Plaza",
      role: "water",
      icon: "💧",
      blurb: "Retell Jackie's story to Jorgito. Waters your field.",
      npcIds: ["jorgito"],
      anchor: "plaza",
    },
    {
      id: "store",
      name: "La Tienda",
      role: "store",
      icon: "🛒",
      blurb: "Tell Doña Tienda about your day and sell your harvest.",
      npcIds: ["shopkeeper"],
      anchor: "store",
      hidden: true,
    },
    {
      id: "the-woods",
      name: "El Bosque",
      role: "foliage",
      icon: "🍃",
      blurb: "Gather greenery with Arlene for this week's bouquet.",
      npcIds: ["arlene"],
      anchor: "the-woods",
    },
    {
      id: "the-room",
      name: "La Sala",
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
        opener: "¡Hola! ¿Te cuento lo que hice hoy? Escucha bien…",
      },
      lines: [
        {
          level: "A2",
          es: "👂 Escucha la historia de Jackie",
          en: "Jackie will tell you what she did today. Listen and understand her story. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "jorgito",
      name: "Jorgito",
      color: 0x3d5a80,
      voice: "echo",
      conversation: {
        opener: "Oye, ¿qué hizo Jackie hoy? Cuéntame.",
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
    {
      id: "arlene",
      name: "Arlene",
      color: 0x6b8f47,
      voice: "alloy",
      conversation: {
        opener: "¡Hola! ¿Buscas verdor para el ramo? Cuéntame, ¿qué vas a hacer hoy?",
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
        opener: "¡Hola! Mira mi cuarto… ¿sabes dónde están las cosas hoy?",
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
 * birthday. The family is visiting from out of town, practicing Spanish
 * with Daphne's family. Same daily-loop mechanics as Pueblo del Ayer (paired
 * story/retell, near-future bonus plans, prepositions-of-place bonus with a
 * picture to peek at) — different story, different place, different people.
 */
export const FIESTA_DE_DAPHNE: Area = {
  id: "fiesta-de-daphne",
  name: "El Cumpleaños de Daphne",
  level: "A2",
  blurb:
    "Diciembre en Phoenix — hace sol pero no hace calor. La familia se " +
    "reúne en el parque para el primer cumpleaños de Daphne. Esta semana: " +
    "contar una historia en el pasado — entender, recontar, y compartir la tuya.",
  ticketPrice: 60,
  backgroundSvg: PARK_BG,
  locations: [
    {
      id: "la-ramada",
      name: "La Ramada",
      role: "seeds",
      icon: "🎂",
      blurb: "Escucha al abuelo Jorge contar cómo prepararon el parque, sentado bajo la ramada.",
      npcIds: ["jorge-abuelo"],
      anchor: "la-ramada",
    },
    {
      id: "el-chapoteadero",
      name: "El Chapoteadero",
      role: "water",
      icon: "💦",
      blurb: "Cuéntale a Jorgito lo que hizo el abuelo esa mañana, junto al chapoteadero.",
      npcIds: ["jorgito-tio"],
      anchor: "el-chapoteadero",
    },
    {
      id: "el-parque-infantil",
      name: "El Parque Infantil",
      role: "store",
      icon: "🛝",
      blurb: "Cuéntale al paletero sobre la fiesta cerca de los toboganes y compra una paleta.",
      npcIds: ["paletero"],
      anchor: "el-parque-infantil",
      hidden: true,
    },
    {
      id: "el-escenario",
      name: "El Escenario",
      role: "foliage",
      icon: "🎶",
      blurb: "Habla con tía Jackie junto al escenario sobre lo que va a pasar en la fiesta.",
      npcIds: ["jackie-tia"],
      anchor: "el-escenario",
    },
    {
      id: "el-estanque-de-los-patos",
      name: "El Estanque de los Patos",
      role: "ribbons",
      icon: "🦆",
      blurb: "Ayuda a la abuela a encontrar las cosas de picnic junto al estanque — cuidado con el ganso.",
      npcIds: ["maria-abuela", "ganso-tonto"],
      anchor: "el-estanque-de-los-patos",
    },
  ],
  npcs: [
    {
      id: "jorge-abuelo",
      name: "Jorge",
      color: 0xc0392b,
      voice: "onyx",
      conversation: {
        opener:
          "¡Hola! ¿Te cuento cómo preparamos el parque para la fiesta de Daphne? Escucha bien…",
      },
      lines: [
        {
          level: "A2",
          es: "👂 Escucha al abuelo Jorge",
          en: "Jorge will tell you how the family got the park ready for Daphne's party. Listen and understand his story. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "jorgito-tio",
      name: "Jorgito",
      color: 0x3d5a80,
      voice: "echo",
      conversation: {
        opener: "Oye, ¿qué hizo el abuelo esa mañana? Cuéntame.",
      },
      lines: [
        {
          level: "A2",
          es: "🗣️ Cuéntale a Jorgito la historia",
          en: "Retell what Jorge did that morning, in the past tense. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "paletero",
      name: "El Paletero",
      color: 0x3498db,
      voice: "onyx",
      conversation: {
        opener:
          "¡Paletas! ¡Paletas frías! Pero primero, cuéntame, ¿qué pasó hoy en la fiesta?",
      },
      lines: [
        {
          level: "A2",
          es: "🍧 Cuéntale al paletero sobre la fiesta",
          en: "Tell the paletero about the party day as a friendly review, then get a treat. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "jackie-tia",
      name: "Tía Jackie",
      color: 0x2a9d8f,
      voice: "nova",
      conversation: {
        opener: "¡Hola! ¿Ya viste el pastel? Cuéntame, ¿qué vamos a hacer ahora?",
      },
      lines: [
        {
          level: "A2",
          es: "🎉 Habla con tía Jackie sobre la fiesta",
          en: "Chat with tía Jackie about what's about to happen at the party — cake, games, presents. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "maria-abuela",
      name: "Abuela Maria",
      color: 0xd4a373,
      voice: "fable",
      conversation: {
        opener: "¡Hola! Mira la mesa de picnic… ¿sabes dónde están las cosas de la fiesta hoy?",
      },
      lines: [
        {
          level: "A2",
          es: "🧺 Adivina dónde están las cosas con la abuela Maria",
          en: "Maria will ask where things are on the picnic table — practice on top of / under, in front of / behind, left / right. Tap 'Talk' to begin.",
        },
      ],
    },
    {
      id: "ganso-tonto",
      name: "Silly Goose",
      color: 0xe8b923,
      voice: "shimmer",
      conversation: {
        opener: "¡HONK! ¿Tienes comida? ¡Dame, dame, dame!",
      },
      lines: [
        {
          level: "A2",
          es: "🦆 ¡Cuidado con el ganso!",
          en: "A silly goose has claimed the duck pond and honks at anyone holding snacks. Say hi if you dare. Tap 'Talk' to begin.",
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
