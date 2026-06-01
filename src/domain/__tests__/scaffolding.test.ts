import { describe, it, expect } from "vitest";
import { scaffoldingFor } from "../scaffolding";

describe("scaffolding (training wheels by town English availability)", () => {
  it("metropolis (full English) shows Spanish subtitles AND English hints", () => {
    const s = scaffoldingFor(1);
    expect(s.spanishSubtitles).toBe(true);
    expect(s.englishHints).toBe(true);
  });

  it("remoter town (partial) shows Spanish but removes English", () => {
    const s = scaffoldingFor(0.3);
    expect(s.spanishSubtitles).toBe(true);
    expect(s.englishHints).toBe(false);
  });

  it("remotest town (almost no English) is audio-only", () => {
    const s = scaffoldingFor(0.1);
    expect(s.spanishSubtitles).toBe(false);
    expect(s.englishHints).toBe(false);
  });

  it("clamps out-of-range availability", () => {
    expect(scaffoldingFor(5)).toEqual({ spanishSubtitles: true, englishHints: true });
    expect(scaffoldingFor(-1)).toEqual({ spanishSubtitles: false, englishHints: false });
  });
});
