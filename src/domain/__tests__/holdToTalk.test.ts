import { describe, it, expect } from "vitest";
import { HoldToTalk } from "../holdToTalk";

function machine(start = 0) {
  let t = start;
  const m = new HoldToTalk({ minHoldMs: 250, now: () => t });
  return {
    m,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("HoldToTalk", () => {
  it("normal hold: press → ready → release(after min) → send", () => {
    const { m, advance } = machine();
    expect(m.press()).toBe("begin-recording");
    expect(m.startResolved()).toBe("none");
    advance(400);
    expect(m.release()).toBe("send");
  });

  it("release before recorder ready, then ready → sends when ready (deferred)", () => {
    const { m, advance } = machine();
    expect(m.press()).toBe("begin-recording");
    advance(400);
    // User releases while mic is still starting up.
    expect(m.release()).toBe("none");
    // Recorder becomes ready afterwards → now it sends.
    expect(m.startResolved()).toBe("send");
  });

  it("micro-tap (released before min hold) cancels, never sends", () => {
    const { m, advance } = machine();
    expect(m.press()).toBe("begin-recording");
    advance(100); // < 250ms
    expect(m.release()).toBe("none"); // not ready yet
    expect(m.startResolved()).toBe("cancel");
  });

  it("micro-tap with recorder already ready also cancels", () => {
    const { m, advance } = machine();
    m.press();
    expect(m.startResolved()).toBe("none"); // still holding
    advance(100);
    expect(m.release()).toBe("cancel");
  });

  it("ignores release without an active hold (e.g. stray global pointerup)", () => {
    const { m } = machine();
    expect(m.release()).toBe("none");
    expect(m.startResolved()).toBe("none");
  });

  it("ignores a second press while already recording", () => {
    const { m } = machine();
    expect(m.press()).toBe("begin-recording");
    expect(m.press()).toBe("none");
  });

  it("reset clears state so a new press works", () => {
    const { m, advance } = machine();
    m.press();
    m.reset();
    expect(m.press()).toBe("begin-recording");
    m.startResolved();
    advance(300);
    expect(m.release()).toBe("send");
  });
});
