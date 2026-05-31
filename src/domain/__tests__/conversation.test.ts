import { describe, it, expect } from "vitest";
import {
  gateShouldOpen,
  PASS_COMMUNICATION,
  PASS_ACCURACY,
  type UtteranceGrade,
} from "../conversation";

function grade(communication: number, accuracy: number): UtteranceGrade {
  return { communication, accuracy, feedback: "", corrections: [] };
}

describe("gateShouldOpen", () => {
  it("opens only when the model agrees AND thresholds are cleared", () => {
    expect(gateShouldOpen(true, grade(0.9, 0.9))).toBe(true);
  });

  it("stays closed if the model says objective not met, even with high scores", () => {
    expect(gateShouldOpen(false, grade(1, 1))).toBe(false);
  });

  it("stays closed if communication is below threshold", () => {
    expect(gateShouldOpen(true, grade(PASS_COMMUNICATION - 0.1, 0.9))).toBe(false);
  });

  it("stays closed if accuracy is below threshold", () => {
    expect(gateShouldOpen(true, grade(0.9, PASS_ACCURACY - 0.1))).toBe(false);
  });

  it("opens exactly at the thresholds", () => {
    expect(gateShouldOpen(true, grade(PASS_COMMUNICATION, PASS_ACCURACY))).toBe(true);
  });
});

describe("gate strictness (town difficulty)", () => {
  it("higher strictness requires a higher grade to pass", () => {
    const goodGrade = grade(0.72, 0.62); // clears default bars
    expect(gateShouldOpen(true, goodGrade, 1)).toBe(true);
    // At 1.3x strictness the bars rise; this grade no longer passes.
    expect(gateShouldOpen(true, goodGrade, 1.3)).toBe(false);
  });

  it("a strong grade still passes a strict town", () => {
    expect(gateShouldOpen(true, grade(0.95, 0.9), 1.3)).toBe(true);
  });
});
