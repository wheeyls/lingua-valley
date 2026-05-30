/**
 * World definition: areas, NPCs, and their dialogue.
 *
 * Each Area is bound to a CEFR level. NPC dialogue is authored at that level,
 * so when the player wanders into an over-level area the comprehension model
 * garbles it — the soft gate.
 */

import type { CefrLevel } from "../domain/cefr";

export interface DialogueLine {
  /** CEFR level this line is written at (drives comprehension/garbling). */
  level: CefrLevel;
  es: string;
  /** English shown as a "hint" only when clarity is high enough. */
  en: string;
}

export interface Npc {
  id: string;
  name: string;
  /** Spawn tile (in tile units) within the area grid. */
  tileX: number;
  tileY: number;
  color: number;
  /** Objective this NPC's mini-game teaches, if any. */
  teachesObjectiveId?: string;
  lines: DialogueLine[];
  /** OpenAI TTS voice for this NPC (alloy, echo, fable, onyx, nova, shimmer). */
  voice?: string;
  /**
   * If set, this NPC runs a VOICED conversation gate instead of the
   * multiple-choice mini-game. `opener` is the NPC's first spoken line.
   */
  conversation?: { opener: string };
}

export interface Area {
  id: string;
  name: string;
  level: CefrLevel;
  /** Background tint to make areas visually distinct. */
  groundColor: number;
  accentColor: number;
  /** Pixel bounds of this area within the shared world. */
  bounds: { x: number; y: number; width: number; height: number };
  npcs: Npc[];
}

export const TILE = 32;

/**
 * The vertical slice: two areas side by side, separated by a visible threshold.
 * Plaza (A1) on the left, Mercado (A2) on the right.
 */
export const AREAS: Area[] = [
  {
    id: "plaza",
    name: "Plaza del Saludo",
    level: "A1",
    groundColor: 0x4a7c59,
    accentColor: 0x9bc995,
    bounds: { x: 0, y: 0, width: 20 * TILE, height: 18 * TILE },
    npcs: [
      {
        id: "rosa",
        name: "Rosa",
        tileX: 4,
        tileY: 5,
        color: 0xe07a5f,
        teachesObjectiveId: "a1.greetings",
        voice: "nova",
        conversation: {
          opener: "¡Hola! Buenos días. ¿Cómo estás hoy?",
        },
        lines: [
          { level: "A1", es: "¡Hola! Buenos días.", en: "Hello! Good morning." },
          {
            level: "A1",
            es: "Practica los saludos conmigo.",
            en: "Practice greetings with me.",
          },
        ],
      },
      {
        id: "mateo",
        name: "Mateo",
        tileX: 12,
        tileY: 4,
        color: 0x3d5a80,
        teachesObjectiveId: "a1.introductions",
        lines: [
          { level: "A1", es: "¿Cómo te llamas?", en: "What's your name?" },
          { level: "A1", es: "Mucho gusto.", en: "Nice to meet you." },
        ],
      },
      {
        id: "lucia",
        name: "Lucía",
        tileX: 7,
        tileY: 12,
        color: 0xf2cc8f,
        teachesObjectiveId: "a1.numbers",
        lines: [
          { level: "A1", es: "¿Sabes contar? Uno, dos, tres…", en: "Can you count? One, two, three…" },
        ],
      },
      {
        id: "don_pablo",
        name: "Don Pablo",
        tileX: 15,
        tileY: 13,
        color: 0x81b29a,
        teachesObjectiveId: "a1.courtesy",
        lines: [
          { level: "A1", es: "Por favor y gracias. La cortesía importa.", en: "Please and thank you. Courtesy matters." },
        ],
      },
    ],
  },
  {
    id: "mercado",
    name: "El Mercado",
    level: "A2",
    groundColor: 0x6d597a,
    accentColor: 0xb56576,
    bounds: { x: 20 * TILE, y: 0, width: 20 * TILE, height: 18 * TILE },
    npcs: [
      {
        id: "vendedora",
        name: "La Vendedora",
        tileX: 24,
        tileY: 6,
        color: 0xeaac8b,
        teachesObjectiveId: "a2.market.quantities",
        lines: [
          {
            level: "A2",
            es: "¿Cuánto quiere? Tengo manzanas frescas a buen precio hoy.",
            en: "How much do you want? I have fresh apples at a good price today.",
          },
          {
            level: "A2",
            es: "Un kilo cuesta diez pesos, pero le hago un descuento.",
            en: "A kilo costs ten pesos, but I'll give you a discount.",
          },
        ],
      },
      {
        id: "panadero",
        name: "El Panadero",
        tileX: 32,
        tileY: 10,
        color: 0xd4a373,
        teachesObjectiveId: "a2.market.food",
        lines: [
          {
            level: "A2",
            es: "El pan recién hecho huele increíble, ¿no le parece?",
            en: "The freshly baked bread smells incredible, don't you think?",
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

export const WORLD_WIDTH = AREAS.reduce(
  (max, a) => Math.max(max, a.bounds.x + a.bounds.width),
  0,
);
export const WORLD_HEIGHT = AREAS.reduce(
  (max, a) => Math.max(max, a.bounds.y + a.bounds.height),
  0,
);
