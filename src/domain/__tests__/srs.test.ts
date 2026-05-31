import { describe, it, expect } from "vitest";
import { newCard, review, isDue, isMature } from "../srs";

const T0 = new Date("2025-01-01T00:00:00.000Z");
function daysLater(n: number): Date {
  return new Date(T0.getTime() + n * 86_400_000);
}

describe("newCard", () => {
  it("starts as a due seedling", () => {
    const c = newCard("hola", T0);
    expect(c.state).toBe("seedling");
    expect(c.reps).toBe(0);
    expect(isDue(c, T0)).toBe(true);
  });
});

describe("review", () => {
  it("grows on passing recalls and matures after enough reps", () => {
    let c = newCard("hola", T0);
    c = review(c, 1, T0); // rep 1 -> interval 1
    expect(c.reps).toBe(1);
    expect(c.state).toBe("growing");
    expect(c.intervalDays).toBe(1);

    c = review(c, 1, daysLater(1)); // rep 2 -> interval 3
    expect(c.intervalDays).toBe(3);

    c = review(c, 1, daysLater(4)); // rep 3 -> interval*ease
    expect(c.reps).toBe(3);

    c = review(c, 1, daysLater(15)); // rep 4 -> mature
    expect(c.reps).toBe(4);
    expect(isMature(c)).toBe(true);
  });

  it("resets to seedling on a failing recall", () => {
    let c = newCard("hola", T0);
    c = review(c, 1, T0);
    c = review(c, 1, daysLater(1));
    expect(c.reps).toBe(2);
    c = review(c, 0.2, daysLater(4)); // fail
    expect(c.reps).toBe(0);
    expect(c.state).toBe("seedling");
    expect(c.intervalDays).toBe(0);
  });

  it("keeps ease within bounds", () => {
    let c = newCard("x", T0);
    for (let i = 0; i < 10; i++) c = review(c, 1, daysLater(i));
    expect(c.ease).toBeLessThanOrEqual(2.8);
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("sets dueAt in the future after a pass", () => {
    const c = review(newCard("x", T0), 1, T0);
    expect(isDue(c, T0)).toBe(false);
    expect(isDue(c, daysLater(2))).toBe(true);
  });

  it("caps the interval so dueAt never overflows under heavy review", () => {
    let c = newCard("x", T0);
    for (let i = 0; i < 50; i++) c = review(c, 1, T0); // pathological same-day reps
    expect(c.intervalDays).toBeLessThanOrEqual(365);
    expect(Number.isNaN(new Date(c.dueAt).getTime())).toBe(false);
  });
});
