/**
 * World definition — stripped to the daily loop essentials.
 *
 * One area: your neighborhood. Walk south from Home past Rosa, to the
 * Restaurant (Marisol), and then to Pablo. Three NPCs, one path, one focused
 * daily practice loop.
 */

import type { CefrLevel } from "../domain/cefr.js";
import type { Good } from "../domain/trade.js";
import type { TownInfo } from "../domain/town.js";

export interface DialogueLine {
  level: CefrLevel;
  es: string;
  en: string;
}

export interface Npc {
  id: string;
  name: string;
  tileX: number;
  tileY: number;
  color: number;
  teachesObjectiveId?: string;
  voice?: string;
  conversation?: { opener: string };
  lessonSlug?: string;
  lines: DialogueLine[];
  trades?: Good[];
  role?: "middleman" | "producer" | "gatekeeper";
  givesQuest?: string;
  /** Which daily loop step this NPC fulfills. */
  dailyStep?: "rosa" | "marisol" | "pablo";
}

export interface Area {
  id: string;
  name: string;
  level: CefrLevel;
  groundColor: number;
  accentColor: number;
  bounds: { x: number; y: number; width: number; height: number };
  npcs: Npc[];
  depth: number;
  englishAvailability: number;
  gatekeeper?: { npcId: string; lessonSlug: string; passQuality: number };
}

export const TILE = 32;

const AREA_W = 15; // tiles
const AREA_H = 28; // tiles — a comfortable vertical walk

export const AREAS: Area[] = [
  {
    id: "neighborhood",
    name: "El Barrio",
    level: "A1",
    groundColor: 0x4a7c59,
    accentColor: 0x9bc995,
    bounds: { x: 0, y: 0, width: AREA_W * TILE, height: AREA_H * TILE },
    depth: 0,
    englishAvailability: 0.8,
    npcs: [
      {
        id: "rosa",
        name: "Rosa",
        tileX: 7,
        tileY: 6,
        color: 0xe07a5f,
        teachesObjectiveId: "a1.greetings",
        voice: "nova",
        dailyStep: "rosa",
        conversation: {
          opener: "¡Buenas! ¿Qué onda? ¿Cómo andas?",
        },
        lines: [
          { level: "A1", es: "¡Buenas! ¿Cómo andas?", en: "Hey! How's it going?" },
        ],
      },
      {
        id: "marisol",
        name: "Marisol",
        tileX: 7,
        tileY: 14,
        color: 0x2a9d8f,
        teachesObjectiveId: "a2.morning_story",
        voice: "shimmer",
        dailyStep: "marisol",
        conversation: {
          opener: "¡Hola! Siéntate. Te cuento lo que hice hoy…",
        },
        lines: [
          {
            level: "A2",
            es: "Te cuento lo que hice hoy. Escucha bien.",
            en: "Let me tell you what I did today. Listen carefully.",
          },
        ],
      },
      {
        id: "pablo",
        name: "Pablo",
        tileX: 7,
        tileY: 22,
        color: 0x3d5a80,
        teachesObjectiveId: "a2.retell",
        voice: "onyx",
        dailyStep: "pablo",
        conversation: {
          opener: "¡Ey! ¿Ya hablaste con Marisol, mi hermana? Cuéntame — ¿qué hizo hoy?",
        },
        lines: [
          {
            level: "A2",
            es: "Marisol es mi hermana. ¿Qué te contó? ¿Qué hizo hoy?",
            en: "Marisol is my sister. What did she tell you? What did she do today?",
          },
        ],
      },
    ],
  },
];

export function areaAt(x: number, y: number): Area | undefined {
  return AREAS.find(
    (a) =>
      x >= a.bounds.x &&
      x < a.bounds.x + a.bounds.width &&
      y >= a.bounds.y &&
      y < a.bounds.y + a.bounds.height,
  );
}

export function townOfNpc(npcId: string): Area | undefined {
  return AREAS.find((a) => a.npcs.some((n) => n.id === npcId));
}

export function townInfoOf(area: Area): TownInfo {
  return {
    id: area.id,
    name: area.name,
    depth: area.depth,
    level: area.level,
    englishAvailability: area.englishAvailability,
    gatekeeper: area.gatekeeper,
  };
}

export const GOOD_NAMES: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const area of AREAS) {
    for (const npc of area.npcs) {
      for (const g of npc.trades ?? []) out[g.id] = g.name;
    }
  }
  return out;
})();

export const WORLD_WIDTH = AREAS.reduce(
  (max, a) => Math.max(max, a.bounds.x + a.bounds.width),
  0,
);
export const WORLD_HEIGHT = AREAS.reduce(
  (max, a) => Math.max(max, a.bounds.y + a.bounds.height),
  0,
);
