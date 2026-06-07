/**
 * World definition: areas, NPCs, and their dialogue.
 *
 * Each Area is a town bound to a CEFR level. NPC Spanish is always shown plainly
 * — no garbling. Difficulty comes from the language itself + how much scaffolding
 * a town offers (Spanish subtitles / English hints), driven by its
 * englishAvailability (see domain/scaffolding.ts).
 */

import type { CefrLevel } from "../domain/cefr.js";
import type { Good } from "../domain/trade.js";
import type { TownInfo } from "../domain/town.js";

export interface DialogueLine {
  /** CEFR level this line is written at (informational / future use). */
  level: CefrLevel;
  es: string;
  /** English translation, shown as a hint where the town offers English help. */
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
  /** If set, this NPC gives (and receives the recap for) the named quest. */
  givesQuest?: string;
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
      {
        id: "ana",
        name: "Ana",
        tileX: 7,
        tileY: 8,
        color: 0xe9c46a,
        teachesObjectiveId: "a1.introductions",
        voice: "shimmer",
        lessonSlug: "greeting-a-friend",
        conversation: { opener: "¡Ey! ¿Qué onda? ¡Cuánto tiempo!" },
        lines: [
          { level: "A1", es: "¡Hola! Practiquemos saludar entre amigos.", en: "Hi! Let's practice greeting as friends." },
        ],
      },
      {
        id: "marisol",
        name: "Marisol",
        tileX: 3,
        tileY: 12,
        color: 0x2a9d8f,
        teachesObjectiveId: "b1.weekend_plans",
        voice: "nova",
        givesQuest: "market-errands",
        lines: [
          { level: "A2", es: "¿Qué vas a hacer hoy? Cuéntame tus planes.", en: "What are you going to do today? Tell me your plans." },
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
      {
        id: "recepcionista",
        name: "La Recepcionista",
        tileX: 2,
        tileY: AREA_H + 9,
        color: 0x457b9d,
        teachesObjectiveId: "a2.market.food",
        voice: "nova",
        lessonSlug: "at-what-time",
        conversation: { opener: "Buenas. ¿En qué le puedo ayudar?" },
        lines: [
          { level: "A2", es: "¿A qué hora necesita su cita?", en: "What time do you need your appointment?" },
        ],
      },
      {
        id: "tendero",
        name: "El Tendero",
        tileX: 13,
        tileY: AREA_H + 13,
        color: 0xe76f51,
        teachesObjectiveId: "a2.market.quantities",
        voice: "echo",
        lessonSlug: "this-vs-that",
        conversation: { opener: "¿Le gusta éste o prefiere aquél?" },
        lines: [
          { level: "A2", es: "Tenemos de todo. ¿Cuál prefiere?", en: "We have everything. Which do you prefer?" },
        ],
      },
    ],
  },
  {
    id: "pueblo",
    name: "El Pueblo",
    level: "B1",
    groundColor: 0x344e41,
    accentColor: 0x588157,
    bounds: { x: 0, y: 2 * AREA_H * TILE, width: AREA_W * TILE, height: AREA_H * TILE },
    // The remotest town: almost no English, strict. Reach it by beating El
    // Mercado's gatekeeper. Locals practice family/week/weekend talk; Don Refugio
    // gatekeeps the campesinos (producers) with the richest goods.
    depth: 2,
    englishAvailability: 0.15,
    gatekeeper: {
      npcId: "refugio",
      lessonSlug: "talking-about-your-family",
      passQuality: 0.75,
    },
    npcs: [
      {
        id: "lupita",
        name: "Lupita",
        tileX: 4,
        tileY: 2 * AREA_H + 4,
        color: 0xa3b18a,
        teachesObjectiveId: "b1.past_week",
        voice: "nova",
        lessonSlug: "this-week",
        conversation: { opener: "¡Qué bueno verte! ¿Cómo te fue esta semana?" },
        lines: [
          { level: "B1", es: "Cuéntame, ¿qué hiciste esta semana?", en: "Tell me, what did you do this week?" },
        ],
      },
      {
        id: "joaquin",
        name: "Joaquín",
        tileX: 11,
        tileY: 2 * AREA_H + 6,
        color: 0xdda15e,
        teachesObjectiveId: "b1.weekend_plans",
        voice: "onyx",
        lessonSlug: "weekend-plans",
        conversation: { opener: "Oye, ¿qué vas a hacer este fin de semana?" },
        lines: [
          { level: "B1", es: "¿Tienes planes para el fin?", en: "Do you have plans for the weekend?" },
        ],
      },
      {
        id: "refugio",
        name: "Don Refugio",
        tileX: 7,
        tileY: 2 * AREA_H + 3,
        color: 0x6a040f,
        role: "gatekeeper",
        teachesObjectiveId: "b1.family",
        voice: "fable",
        lessonSlug: "talking-about-your-family",
        conversation: {
          opener:
            "Aquí cuidamos a los nuestros. Háblame de tu familia y veré si eres de confiar.",
        },
        lines: [
          { level: "B1", es: "Primero, cuéntame de tu familia.", en: "First, tell me about your family." },
        ],
      },
      {
        id: "campesina",
        name: "La Campesina",
        tileX: 7,
        tileY: 2 * AREA_H + 12,
        color: 0x283618,
        role: "producer",
        teachesObjectiveId: "b1.weekend_plans",
        trades: [
          { id: "frijol", name: "Frijol de la milpa", baseValue: 7, requiresTier: "stranger" },
          { id: "calabaza", name: "Calabaza", baseValue: 11, requiresTier: "stranger" },
          { id: "mezcal", name: "Mezcal artesanal", baseValue: 150, requiresTier: "acquaintance" },
          { id: "vainilla", name: "Vainilla", baseValue: 260, requiresTier: "friend" },
        ],
        lines: [
          { level: "B1", es: "Don Refugio te recomendó. Mira lo que cosechamos.", en: "Don Refugio recommended you. Look what we harvest." },
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

/** Project an Area onto the domain TownInfo shape (for difficulty rules). */
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
