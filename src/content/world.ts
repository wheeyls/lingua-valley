/**
 * World definition — the farming neighbourhood.
 *
 * One area with three people you talk to:
 *   - Seedsman   — the seed farm. Intro conversation; gives you seeds to plant.
 *   - Waterkeeper— the water tower. Daily practice; waters your field.
 *   - Shopkeeper — the store. Review conversation; buys your harvest for money.
 *
 * Money buys a train ticket to the next area.
 */

import type { CefrLevel } from "../domain/cefr.js";

export interface DialogueLine {
  level: CefrLevel;
  es: string;
  en: string;
}

export interface Npc {
  id: string;
  name: string;
  color: number;
  /** The daily-graph objective this NPC fulfills (seeds-intro/water-practice/store-review). */
  teachesObjectiveId: string;
  voice?: string;
  conversation: { opener: string };
  lines: DialogueLine[];
}

export interface Area {
  id: string;
  name: string;
  level: CefrLevel;
  /** The area this one's train ticket leads to (undefined for the last area). */
  nextAreaId?: string;
  /** Price of the train ticket to the next area, in money. */
  ticketPrice: number;
  npcs: Npc[];
}

export const AREAS: Area[] = [
  {
    id: "barrio",
    name: "El Barrio",
    level: "A1",
    nextAreaId: "mercado",
    ticketPrice: 50,
    npcs: [
      {
        id: "seedsman",
        name: "Don Semilla",
        color: 0x8a5a44,
        teachesObjectiveId: "seeds-intro",
        voice: "onyx",
        conversation: {
          opener: "¡Buenas! ¿Vienes por semillas? Te cuento qué cultivamos esta semana.",
        },
        lines: [
          {
            level: "A1",
            es: "🌱 Consigue semillas de Don Semilla",
            en: "Talk to the seed farmer to learn this week's lesson and get a batch of seeds to plant back home. Tap 'Talk' to begin.",
          },
        ],
      },
      {
        id: "waterkeeper",
        name: "Aguamarina",
        color: 0x3d7ea6,
        teachesObjectiveId: "water-practice",
        voice: "shimmer",
        conversation: {
          opener: "¡Hola! ¿Listo para regar? Practiquemos un poco primero.",
        },
        lines: [
          {
            level: "A1",
            es: "💧 Practica con Aguamarina",
            en: "Your daily practice. Have a conversation to earn water for your whole garden — your crops grow one step each day you water. Tap 'Talk' to begin.",
          },
        ],
      },
      {
        id: "shopkeeper",
        name: "Doña Tienda",
        color: 0xb5793a,
        teachesObjectiveId: "store-review",
        voice: "nova",
        conversation: {
          opener: "¡Bienvenido a la tienda! ¿Qué me traes hoy?",
        },
        lines: [
          {
            level: "A1",
            es: "🛒 Vende tu cosecha en la tienda",
            en: "Bring a grown crop here to review what you've learned and sell it for money. Save up for a train ticket to the next town! Tap 'Talk' to begin.",
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

/** The area the player currently lives in (single-area slice for now). */
export const CURRENT_AREA: Area = AREAS[0];
