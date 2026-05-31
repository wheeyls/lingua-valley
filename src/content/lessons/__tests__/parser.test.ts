import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseLesson } from "../parser";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "data");

function load(file: string) {
  return parseLesson(readFileSync(join(dataDir, file), "utf8"), file);
}

describe("lesson parser", () => {
  it("parses every bundled .lesson file without errors", () => {
    const files = readdirSync(dataDir).filter((f) => f.endsWith(".lesson"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const r = load(f);
      expect(r.success, `${f}: ${JSON.stringify(r.errors)}`).toBe(true);
    }
  });

  it("extracts the greetings role-play correctly", () => {
    const r = load("01-greetings.lesson");
    expect(r.success).toBe(true);
    const lesson = r.data!;
    expect(lesson.slug).toBe("greetings");
    expect(lesson.level).toBe("starter");
    expect(lesson.lab.roles.map((x) => x.id)).toEqual(["A", "B"]);
    expect(lesson.lab.roles[0].name).toMatch(/Local/);

    // Turns alternate and carry phrases + hints.
    expect(lesson.lab.turns.length).toBeGreaterThan(5);
    const firstA = lesson.lab.turns.find((t) => t.role === "A")!;
    expect(firstA.phrases.length).toBeGreaterThan(0);
    expect(firstA.phrases[0]).toHaveProperty("spanish");
    expect(firstA.phrases[0]).toHaveProperty("english");
    expect(firstA.hint).toBeTruthy();
  });

  it("extracts restaurant vocabulary concepts", () => {
    const lesson = load("02-restaurant.lesson").data!;
    const vocab = lesson.concepts.filter((c) => c.type === "vocabulary");
    expect(vocab.length).toBeGreaterThan(0);
    const allItems = vocab.flatMap((c) => c.items ?? []);
    expect(allItems.some((i) => i.spanish === "la cuenta")).toBe(true);
  });

  it("parses the directions lab", () => {
    const lesson = load("09-asking-for-directions.lesson").data!;
    expect(lesson.lab.turns.length).toBeGreaterThan(0);
    expect(lesson.lab.scenario).toBeTruthy();
  });
});
