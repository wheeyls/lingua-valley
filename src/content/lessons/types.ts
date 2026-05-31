/**
 * Lesson content types — mirrored from the spanish-lessons repo so the .lesson
 * authoring format is the single source of truth across both apps.
 *
 * Pure types + a pure parser (no framework). The role-plays here become NPC
 * conversations (NPC plays role A, player plays role B).
 */

export interface VocabularyItem {
  spanish: string;
  english: string;
  pronunciation?: string;
  example?: string;
}

export interface GrammarPoint {
  title: string;
  explanation: string;
  examples: { spanish: string; english: string }[];
}

export interface ConceptSection {
  type: "vocabulary" | "grammar" | "phrases";
  title: string;
  items?: VocabularyItem[];
  points?: GrammarPoint[];
}

export interface TurnPrompt {
  role: "A" | "B";
  goal: string;
  goalEnglish?: string;
  phrases: { spanish: string; english: string }[];
  hint?: string;
}

export interface LabRole {
  id: "A" | "B";
  name: string;
  description: string;
}

export interface Lab {
  id: string;
  title: string;
  scenario: string;
  roles: LabRole[];
  turns: TurnPrompt[];
  tips?: string[];
}

export type LessonLevel =
  | "starter"
  | "elementary"
  | "beginner"
  | "conversational"
  | "confident";

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: LessonLevel;
  estimatedMinutes: number;
  concepts: ConceptSection[];
  lab: Lab;
}

export interface ParseError {
  line: number;
  message: string;
  suggestion?: string;
}

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors: ParseError[];
}
