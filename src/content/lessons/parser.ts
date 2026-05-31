/**
 * Pure parser for the `.lesson` authoring format. Ported faithfully from the
 * spanish-lessons repo so both apps read the same files. No framework imports.
 */

import type {
  Lesson,
  VocabularyItem,
  GrammarPoint,
  ConceptSection,
  Lab,
  TurnPrompt,
  LabRole,
  LessonLevel,
  ParseError,
  ParseResult,
} from "./types";

interface Frontmatter {
  title: string;
  description: string;
  level: LessonLevel;
  time: number;
}

interface ParseContext {
  lines: string[];
  currentLine: number;
  filename: string;
}

function createError(
  ctx: ParseContext,
  message: string,
  suggestion?: string,
): ParseError {
  return { line: ctx.currentLine + 1, message, suggestion };
}

const LEVELS: LessonLevel[] = [
  "starter",
  "elementary",
  "beginner",
  "conversational",
  "confident",
];

export function parseLesson(content: string, filename: string): ParseResult<Lesson> {
  const ctx: ParseContext = { lines: content.split("\n"), currentLine: 0, filename };
  const errors: ParseError[] = [];

  const frontmatter = parseFrontmatter(ctx, errors);
  if (!frontmatter) return { success: false, errors };

  const concepts: ConceptSection[] = [];
  let lab: Lab | null = null;

  while (ctx.currentLine < ctx.lines.length) {
    const line = ctx.lines[ctx.currentLine].trim();

    if (line === "---") {
      ctx.currentLine++;
      continue;
    }
    if (line.startsWith("# Vocabulary:") || line.startsWith("# Phrases:")) {
      const section = parseVocabularySection(ctx, errors);
      if (section) concepts.push(section);
      continue;
    }
    if (line.startsWith("# Grammar:")) {
      const section = parseGrammarSection(ctx, errors);
      if (section) concepts.push(section);
      continue;
    }
    if (line.startsWith("# Lab:")) {
      lab = parseLabSection(ctx, errors);
      continue;
    }
    ctx.currentLine++;
  }

  if (!lab) {
    errors.push({
      line: ctx.lines.length,
      message: "Missing lab section",
      suggestion: "Add a '# Lab: Title' section at the end of your lesson",
    });
    return { success: false, errors };
  }
  if (errors.length > 0) return { success: false, errors };

  const slug = filename.replace(/\.lesson$/, "").replace(/^\d+-/, "");
  const lesson: Lesson = {
    id: filename.match(/^(\d+)/)?.[1] || "00",
    slug,
    title: frontmatter.title,
    description: frontmatter.description,
    level: frontmatter.level,
    estimatedMinutes: frontmatter.time,
    concepts,
    lab,
  };
  return { success: true, data: lesson, errors: [] };
}

function parseFrontmatter(ctx: ParseContext, errors: ParseError[]): Frontmatter | null {
  while (ctx.currentLine < ctx.lines.length && ctx.lines[ctx.currentLine].trim() === "") {
    ctx.currentLine++;
  }
  if (ctx.lines[ctx.currentLine]?.trim() !== "---") {
    errors.push(createError(ctx, "Lesson must start with frontmatter (---)"));
    return null;
  }
  ctx.currentLine++;

  const fm: Partial<Frontmatter> = {};
  const startLine = ctx.currentLine;

  while (ctx.currentLine < ctx.lines.length) {
    const line = ctx.lines[ctx.currentLine].trim();
    if (line === "---") {
      ctx.currentLine++;
      break;
    }
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      switch (key) {
        case "title":
          fm.title = value;
          break;
        case "description":
          fm.description = value;
          break;
        case "level":
          if (LEVELS.includes(value as LessonLevel)) fm.level = value as LessonLevel;
          else errors.push(createError(ctx, `Invalid level: ${value}`));
          break;
        case "time":
          fm.time = parseInt(value.replace(/\s*minutes?/i, ""), 10);
          break;
      }
    }
    ctx.currentLine++;
  }

  const missing: string[] = [];
  if (!fm.title) missing.push("title");
  if (!fm.description) missing.push("description");
  if (!fm.level) missing.push("level");
  if (!fm.time) missing.push("time");
  if (missing.length > 0) {
    errors.push({ line: startLine + 1, message: `Missing fields: ${missing.join(", ")}` });
    return null;
  }
  return fm as Frontmatter;
}

function parseVocabularySection(ctx: ParseContext, errors: ParseError[]): ConceptSection | null {
  const headerMatch = ctx.lines[ctx.currentLine].match(/^#\s+(Vocabulary|Phrases):\s*(.+)$/);
  if (!headerMatch) {
    ctx.currentLine++;
    return null;
  }
  const type = headerMatch[1].toLowerCase() as "vocabulary" | "phrases";
  const title = headerMatch[2];
  ctx.currentLine++;

  const items: VocabularyItem[] = [];
  while (ctx.currentLine < ctx.lines.length) {
    const line = ctx.lines[ctx.currentLine];
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "---") break;
    if (trimmed === "") {
      ctx.currentLine++;
      continue;
    }
    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      const item = parseVocabCard(ctx, errors);
      if (item) items.push(item);
    } else {
      ctx.currentLine++;
    }
  }
  return { type, title, items };
}

function parseVocabCard(ctx: ParseContext, errors: ParseError[]): VocabularyItem | null {
  const spanish = ctx.lines[ctx.currentLine].trim();
  ctx.currentLine++;

  let english: string | undefined;
  let pronunciation: string | undefined;
  let example: string | undefined;

  while (ctx.currentLine < ctx.lines.length) {
    const line = ctx.lines[ctx.currentLine];
    const trimmed = line.trim();
    if (trimmed === "" || (!line.startsWith(" ") && !line.startsWith("\t"))) break;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      pronunciation = trimmed.slice(1, -1);
    } else if (trimmed.startsWith(">")) {
      example = trimmed.slice(1).trim();
    } else if (!english) {
      english = trimmed;
    }
    ctx.currentLine++;
  }

  if (!english) {
    errors.push({ line: ctx.currentLine, message: `Missing English for: ${spanish}` });
    return null;
  }
  return { spanish, english, pronunciation, example };
}

function parseGrammarSection(ctx: ParseContext, errors: ParseError[]): ConceptSection | null {
  const headerMatch = ctx.lines[ctx.currentLine].match(/^#\s+Grammar:\s*(.+)$/);
  if (!headerMatch) {
    ctx.currentLine++;
    return null;
  }
  const sectionTitle = headerMatch[1];
  ctx.currentLine++;

  const points: GrammarPoint[] = [];
  let currentPoint: Partial<GrammarPoint> | null = null;
  let explanationLines: string[] = [];
  let inExamples = false;

  while (ctx.currentLine < ctx.lines.length) {
    const line = ctx.lines[ctx.currentLine];
    const trimmed = line.trim();
    if (trimmed.startsWith("# ") || trimmed === "---") break;

    if (trimmed.startsWith("## ")) {
      if (currentPoint?.title) {
        currentPoint.explanation = explanationLines.join(" ").trim();
        currentPoint.examples = currentPoint.examples || [];
        points.push(currentPoint as GrammarPoint);
      }
      currentPoint = { title: trimmed.slice(3), examples: [] };
      explanationLines = [];
      inExamples = false;
      ctx.currentLine++;
      continue;
    }

    if (currentPoint) {
      if (trimmed === "") {
        if (explanationLines.length > 0) inExamples = true;
        ctx.currentLine++;
        continue;
      }
      const nextLine = ctx.lines[ctx.currentLine + 1] ?? "";
      const nextIsIndented = nextLine.startsWith(" ") || nextLine.startsWith("\t");
      if (inExamples && !line.startsWith(" ") && !line.startsWith("\t") && nextIsIndented) {
        const item = parseVocabCard(ctx, errors);
        if (item) {
          currentPoint.examples = currentPoint.examples || [];
          currentPoint.examples.push({ spanish: item.spanish, english: item.english });
        }
        continue;
      }
      if (!inExamples && !line.startsWith(" ") && !line.startsWith("\t")) {
        explanationLines.push(trimmed);
      }
    }
    ctx.currentLine++;
  }

  if (currentPoint?.title) {
    currentPoint.explanation = explanationLines.join(" ").trim();
    currentPoint.examples = currentPoint.examples || [];
    points.push(currentPoint as GrammarPoint);
  }
  return { type: "grammar", title: sectionTitle, points };
}

function parseLabSection(ctx: ParseContext, errors: ParseError[]): Lab | null {
  const headerMatch = ctx.lines[ctx.currentLine].match(/^#\s+Lab:\s*(.+)$/);
  if (!headerMatch) {
    ctx.currentLine++;
    return null;
  }
  const title = headerMatch[1];
  ctx.currentLine++;

  let scenario = "";
  const roles: LabRole[] = [];
  const turns: TurnPrompt[] = [];
  const tips: string[] = [];
  let section: "intro" | "roles" | "turns" | "tips" = "intro";

  while (ctx.currentLine < ctx.lines.length) {
    const line = ctx.lines[ctx.currentLine];
    const trimmed = line.trim();
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) break;

    if (trimmed === "## Roles") {
      section = "roles";
      ctx.currentLine++;
      continue;
    }
    if (trimmed === "## Turns") {
      section = "turns";
      ctx.currentLine++;
      continue;
    }
    if (trimmed === "## Tips") {
      section = "tips";
      ctx.currentLine++;
      continue;
    }
    if (section === "intro" && trimmed.startsWith(">")) {
      scenario = trimmed.slice(1).trim();
      ctx.currentLine++;
      continue;
    }

    if (section === "roles") {
      const roleMatch = trimmed.match(/^([AB]):\s*(.+)$/);
      if (roleMatch) {
        const roleId = roleMatch[1] as "A" | "B";
        const roleName = roleMatch[2];
        ctx.currentLine++;
        let description = "";
        const nextLine = ctx.lines[ctx.currentLine];
        if (nextLine && (nextLine.startsWith(" ") || nextLine.startsWith("\t"))) {
          description = nextLine.trim();
          ctx.currentLine++;
        }
        roles.push({ id: roleId, name: roleName, description });
        continue;
      }
    }

    if (section === "turns") {
      const turnMatch = trimmed.match(/^([AB]):\s*(.+)$/);
      if (turnMatch) {
        const role = turnMatch[1] as "A" | "B";
        const goal = turnMatch[2];
        ctx.currentLine++;

        let goalEnglish: string | undefined;
        const phrases: { spanish: string; english: string }[] = [];
        let hint: string | undefined;

        while (ctx.currentLine < ctx.lines.length) {
          const nl = ctx.lines[ctx.currentLine];
          if (!nl.startsWith(" ") && !nl.startsWith("\t")) break;
          const nt = nl.trim();
          if (nt.startsWith("(") && nt.endsWith(")")) {
            goalEnglish = nt.slice(1, -1);
          } else if (nt.startsWith("- ")) {
            const raw = nt.slice(2);
            const pipe = raw.indexOf(" | ");
            if (pipe !== -1) {
              phrases.push({ spanish: raw.slice(0, pipe), english: raw.slice(pipe + 3) });
            } else {
              phrases.push({ spanish: raw, english: raw });
            }
          } else if (nt.startsWith("hint:")) {
            hint = nt.slice(5).trim();
          }
          ctx.currentLine++;
        }
        turns.push({ role, goal, goalEnglish, phrases, hint });
        continue;
      }
    }

    if (section === "tips" && trimmed.startsWith("-")) {
      tips.push(trimmed.slice(1).trim());
    }
    ctx.currentLine++;
  }

  if (roles.length === 0) errors.push({ line: ctx.currentLine, message: "Lab missing roles" });
  if (turns.length === 0) errors.push({ line: ctx.currentLine, message: "Lab missing turns" });

  return {
    id: `lab-${title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    scenario,
    roles,
    turns,
    tips: tips.length > 0 ? tips : undefined,
  };
}
