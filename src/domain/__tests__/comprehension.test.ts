import { describe, it, expect } from "vitest";
import { Proficiency } from "../proficiency";
import { comprehend, clarityFor, garble } from "../comprehension";
import { curriculumByLevel, CURRICULUM } from "../../content/curriculum";

function freshProficiency(masteredIds: string[] = []): Proficiency {
  return new Proficiency(curriculumByLevel(), masteredIds);
}

const allA1 = CURRICULUM.filter((o) => o.level === "A1").map((o) => o.id);

describe("Proficiency", () => {
  it("has no effective level before completing A1", () => {
    const prof = freshProficiency();
    expect(prof.effectiveLevel()).toBeNull();
  });

  it("reaches A1 effective level once all A1 objectives mastered", () => {
    const prof = freshProficiency(allA1);
    expect(prof.effectiveLevel()).toBe("A1");
  });

  it("reports partial mastery of a level", () => {
    const prof = freshProficiency([allA1[0]]);
    expect(prof.levelMastery("A1")).toBeCloseTo(1 / allA1.length);
  });
});

describe("comprehension soft gate", () => {
  it("A2 dialogue is mostly noise for a beginner", () => {
    const prof = freshProficiency();
    const c = clarityFor("A2", prof);
    expect(c).toBeLessThan(0.6); // not actionable
  });

  it("A2 dialogue becomes clear once A1 is complete and A2 is mastered", () => {
    const prof = freshProficiency(allA1);
    const beforeA2 = clarityFor("A2", prof);
    // Master all A2 objectives.
    for (const o of CURRICULUM.filter((o) => o.level === "A2")) prof.master(o.id);
    const afterA2 = clarityFor("A2", prof);
    expect(afterA2).toBeGreaterThan(beforeA2);
  });

  it("A1 dialogue is fully clear once A1 is complete", () => {
    const prof = freshProficiency(allA1);
    const result = comprehend("Hola, buenos días.", "A1", prof);
    expect(result.clarity).toBe(1);
    expect(result.actionable).toBe(true);
    expect(result.rendered).toBe("Hola, buenos días.");
  });

  it("garbles proportionally and preserves punctuation", () => {
    const garbled = garble("hola amigo mio", 0);
    expect(garbled).toMatch(/·/);
    expect(garble("hola, amigo!", 0)).toContain(",");
    expect(garble("hola, amigo!", 0)).toContain("!");
  });
});
