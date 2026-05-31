/**
 * World definition: areas, NPCs, and their dialogue.
 *
 * Each Area is bound to a CEFR level. NPC dialogue is authored at that level,
 * so when the player wanders into an over-level area the comprehension model
 * garbles it — the soft gate.
 */

import type { CefrLevel } from "../domain/cefr.js";
import type { Good } from "../domain/trade.js";

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
  /**
   * If set, this NPC runs a SCRIPTED role-play from the named lesson's lab
   * (NPC plays role A, player plays role B). Takes priority over `conversation`.
   */
  lessonSlug?: string;
  /**
   * Goods this NPC trades. Tier-gated: better friendship unlocks more goods and
   * better prices. Presence of `trades` makes the NPC a merchant.
   */
  trades?: Good[];
  /**
   * Role in the town economy:
   *  - "middleman": always accessible, but marks goods up (steep markup).
   *  - "producer": a farmer/maker — accessible ONLY after the town's gatekeeper
   *    is beaten; far better prices + exclusive goods.
   *  - "gatekeeper": runs the capstone role-play that unlocks the producers.
   *  - undefined: a regular townsperson (practice/friendship only).
   */
  role?: "middleman" | "producer" | "gatekeeper";
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
  /**
   * Journey metadata. An Area IS a town. depth 0 = metropolis; englishAvailability
   * 1 = lots of English help, 0 = remote. `gatekeeper` names the capstone NPC.
   */
  depth: number;
  englishAvailability: number;
  gatekeeper?: { npcId: string; lessonSlug: string; passQuality: number };
}

export const TILE = 32;

/**
 * Portrait world: areas are tall and STACKED VERTICALLY so the map fills a phone
 * screen. Plaza del Saludo (A1) is on top; you walk DOWN through the threshold
 * into El Mercado (A2). Each area is 15 tiles wide (480px) × 16 tiles tall
 * (512px); the world is 480×1024 — taller than the 540×960 viewport.
 *
 * NPC tileX/tileY are in WORLD tile coordinates (not area-local).
 */
const AREA_W = 15; // tiles
const AREA_H = 16; // tiles

export const AREAS: Area[] = [
  {
    id: "plaza",
    name: "Plaza del Saludo",
    level: "A1",
    groundColor: 0x4a7c59,
    accentColor: 0x9bc995,
    bounds: { x: 0, y: 0, width: AREA_W * TILE, height: AREA_H * TILE },
    // The metropolis: lots of English help, forgiving. No gatekeeper — it's the
    // friendly starting town where you learn the ropes.
    depth: 0,
    englishAvailability: 1,
    npcs: [
      {
        id: "rosa",
        name: "Rosa",
        tileX: 4,
        tileY: 4,
        color: 0xe07a5f,
        teachesObjectiveId: "a1.greetings",
        voice: "nova",
        lessonSlug: "greetings",
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
        tileX: 11,
        tileY: 5,
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
        tileX: 4,
        tileY: 11,
        color: 0xf2cc8f,
        teachesObjectiveId: "a1.numbers",
        lines: [
          { level: "A1", es: "¿Sabes contar? Uno, dos, tres…", en: "Can you count? One, two, three…" },
        ],
      },
      {
        id: "don_pablo",
        name: "Don Pablo",
        tileX: 11,
        tileY: 12,
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
    bounds: { x: 0, y: AREA_H * TILE, width: AREA_W * TILE, height: AREA_H * TILE },
    // A remoter market town: less English, stricter. La Vendedora & El Panadero
    // are MIDDLEMEN (marked-up). Beat the gatekeeper (Doña Carmen) to reach the
    // direct producer, El Granjero.
    depth: 1,
    englishAvailability: 0.5,
    gatekeeper: {
      npcId: "carmen",
      lessonSlug: "asking-for-directions",
      passQuality: 0.7,
    },
    npcs: [
      {
        id: "vendedora",
        name: "La Vendedora",
        tileX: 4,
        tileY: AREA_H + 4,
        color: 0xeaac8b,
        role: "middleman",
        teachesObjectiveId: "a2.market.quantities",
        trades: [
          { id: "manzanas", name: "Manzanas", baseValue: 8, requiresTier: "stranger" },
          { id: "tomates", name: "Tomates", baseValue: 12, requiresTier: "acquaintance" },
          { id: "chiles", name: "Chiles secos", baseValue: 30, requiresTier: "friend" },
          { id: "mole", name: "Mole casero", baseValue: 90, requiresTier: "compadre" },
        ],
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
        tileX: 11,
        tileY: AREA_H + 10,
        color: 0xd4a373,
        role: "middleman",
        teachesObjectiveId: "a2.market.food",
        trades: [
          { id: "pan", name: "Pan dulce", baseValue: 6, requiresTier: "stranger" },
          { id: "concha", name: "Conchas", baseValue: 14, requiresTier: "acquaintance" },
          { id: "rosca", name: "Rosca de reyes", baseValue: 40, requiresTier: "friend" },
        ],
        lines: [
          {
            level: "A2",
            es: "El pan recién hecho huele increíble, ¿no le parece?",
            en: "The freshly baked bread smells incredible, don't you think?",
          },
        ],
      },
      {
        id: "mesero",
        name: "El Mesero",
        tileX: 7,
        tileY: AREA_H + 7,
        color: 0x83c5be,
        teachesObjectiveId: "a2.market.bargaining",
        voice: "onyx",
        lessonSlug: "restaurant",
        conversation: { opener: "¡Buenas tardes! Bienvenido." },
        lines: [
          {
            level: "A2",
            es: "Bienvenido. ¿Mesa para cuántos?",
            en: "Welcome. Table for how many?",
          },
        ],
      },
      {
        id: "carmen",
        name: "Doña Carmen",
        tileX: 12,
        tileY: AREA_H + 3,
        color: 0x9b2226,
        role: "gatekeeper",
        teachesObjectiveId: "a2.market.food",
        voice: "shimmer",
        lessonSlug: "asking-for-directions",
        conversation: {
          opener:
            "Soy Doña Carmen. Si quieres conocer a nuestra gente, primero muéstrame que hablas bien.",
        },
        lines: [
          {
            level: "A2",
            es: "Para llegar con los productores, primero habla conmigo.",
            en: "To reach the producers, first you talk with me.",
          },
        ],
      },
      {
        id: "granjero",
        name: "El Granjero",
        tileX: 7,
        tileY: AREA_H + 12,
        color: 0x386641,
        role: "producer",
        teachesObjectiveId: "a2.market.quantities",
        trades: [
          // Direct-from-farm: cheaper base + goods middlemen never carry.
          { id: "maiz", name: "Maíz criollo", baseValue: 5, requiresTier: "stranger" },
          { id: "aguacate", name: "Aguacates", baseValue: 9, requiresTier: "stranger" },
          { id: "miel", name: "Miel de abeja", baseValue: 35, requiresTier: "acquaintance" },
          { id: "cafe", name: "Café de altura", baseValue: 120, requiresTier: "friend" },
        ],
        lines: [
          {
            level: "A2",
            es: "Doña Carmen me dijo que eres de confianza. Pasa, pasa.",
            en: "Doña Carmen told me you're trustworthy. Come in, come in.",
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

/** The town (Area) an NPC belongs to. */
export function townOfNpc(npcId: string): Area | undefined {
  return AREAS.find((a) => a.npcs.some((n) => n.id === npcId));
}

/** Map of every tradeable good id -> display name, across all NPCs. */
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
