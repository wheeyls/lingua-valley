/**
 * The Spanish curriculum, organized by CEFR level.
 *
 * Area 1 (the "Plaza del Saludo") teaches A1 objectives.
 * Area 2 (the "Mercado") is written at A2 — comprehensible only once A1 is done.
 *
 * Each objective is a granular "can-do" with vocab that the learning
 * mini-games draw on.
 */

import type { CefrLevel, LearningObjective } from "../domain/cefr";

export const CURRICULUM: LearningObjective[] = [
  // ---------------------------------------------------------------- A1 -------
  {
    id: "a1.greetings",
    level: "A1",
    label: "Greetings",
    canDo: "Greet people and say goodbye.",
    vocab: [
      { es: "hola", en: "hello" },
      { es: "buenos días", en: "good morning" },
      { es: "buenas tardes", en: "good afternoon" },
      { es: "adiós", en: "goodbye" },
      { es: "hasta luego", en: "see you later" },
    ],
  },
  {
    id: "a1.introductions",
    level: "A1",
    label: "Introductions",
    canDo: "Say your name and ask someone theirs.",
    vocab: [
      { es: "me llamo…", en: "my name is…", example: "Me llamo Ana." },
      { es: "¿cómo te llamas?", en: "what's your name?" },
      { es: "mucho gusto", en: "nice to meet you" },
      { es: "soy", en: "I am", example: "Soy de México." },
    ],
  },
  {
    id: "a1.numbers",
    level: "A1",
    label: "Numbers 1–10",
    canDo: "Count from one to ten.",
    vocab: [
      { es: "uno", en: "one" },
      { es: "dos", en: "two" },
      { es: "tres", en: "three" },
      { es: "cuatro", en: "four" },
      { es: "cinco", en: "five" },
      { es: "seis", en: "six" },
      { es: "siete", en: "seven" },
      { es: "ocho", en: "eight" },
      { es: "nueve", en: "nine" },
      { es: "diez", en: "ten" },
    ],
  },
  {
    id: "a1.courtesy",
    level: "A1",
    label: "Courtesy",
    canDo: "Be polite: please, thank you, excuse me.",
    vocab: [
      { es: "por favor", en: "please" },
      { es: "gracias", en: "thank you" },
      { es: "de nada", en: "you're welcome" },
      { es: "perdón", en: "excuse me / sorry" },
      { es: "sí", en: "yes" },
      { es: "no", en: "no" },
    ],
  },

  // ---------------------------------------------------------------- A2 -------
  {
    id: "a2.market.quantities",
    level: "A2",
    label: "Quantities",
    canDo: "Ask for amounts of food at a market.",
    vocab: [
      { es: "un kilo de…", en: "a kilo of…", example: "Un kilo de manzanas." },
      { es: "medio kilo", en: "half a kilo" },
      { es: "una docena", en: "a dozen" },
      { es: "¿cuánto cuesta?", en: "how much does it cost?" },
      { es: "demasiado caro", en: "too expensive" },
    ],
  },
  {
    id: "a2.market.food",
    level: "A2",
    label: "Food vocabulary",
    canDo: "Name common fruits and vegetables.",
    vocab: [
      { es: "la manzana", en: "apple" },
      { es: "el tomate", en: "tomato" },
      { es: "la cebolla", en: "onion" },
      { es: "el pan", en: "bread" },
      { es: "el queso", en: "cheese" },
    ],
  },
  {
    id: "a2.market.bargaining",
    level: "A2",
    label: "Bargaining",
    canDo: "Negotiate a price politely.",
    vocab: [
      { es: "¿me hace un descuento?", en: "can you give me a discount?" },
      { es: "le doy…", en: "I'll give you…", example: "Le doy cinco pesos." },
      { es: "está bien", en: "that's fine / okay" },
      { es: "me lo llevo", en: "I'll take it" },
    ],
  },
];

/** Group curriculum objectives by level for fast lookup. */
export function curriculumByLevel(): Map<CefrLevel, LearningObjective[]> {
  const map = new Map<CefrLevel, LearningObjective[]>();
  for (const obj of CURRICULUM) {
    const list = map.get(obj.level) ?? [];
    list.push(obj);
    map.set(obj.level, list);
  }
  return map;
}

export function objectiveById(id: string): LearningObjective | undefined {
  return CURRICULUM.find((o) => o.id === id);
}

/**
 * Stable word ids for an objective's vocab (the Spanish phrase is the id).
 * Used by the domain economy reducer to advance/score SRS cards.
 */
export function objectiveWordIds(objectiveId: string): string[] {
  return objectiveById(objectiveId)?.vocab.map((v) => v.es) ?? [];
}
