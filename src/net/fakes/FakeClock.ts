/**
 * FakeClock — an advanceable Clock for deterministic tests and the dev harness.
 * Lets us prove daily Focus regen and SRS interval maturation without waiting.
 */

import type { Clock } from "../../domain/ports";

export class FakeClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date("2025-01-01T12:00:00.000Z")) {
    this.current = new Date(start.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(date: Date): void {
    this.current = new Date(date.getTime());
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  advanceDays(days: number): void {
    this.advanceMs(days * 86_400_000);
  }
}
