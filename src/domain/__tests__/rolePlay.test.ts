import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseLesson } from "../../content/lessons/parser";
import { RolePlay } from "../rolePlay";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "content", "lessons", "data");

function lab(file: string) {
  const r = parseLesson(readFileSync(join(dataDir, file), "utf8"), file);
  return r.data!.lab;
}

describe("RolePlay driver", () => {
  it("alternates NPC(A) and player(B) steps and ends", () => {
    const rp = new RolePlay(lab("01-greetings.lesson"));
    const kinds: string[] = [];
    let safety = 0;
    while (safety++ < 100) {
      const step = rp.next();
      kinds.push(step.kind);
      if (step.kind === "end") break;
    }
    // Greetings starts with an NPC (A) turn.
    expect(kinds[0]).toBe("npc");
    expect(kinds).toContain("player");
    expect(kinds[kinds.length - 1]).toBe("end");
  });

  it("exposes the expected role-B turn as a cue with phrases + hint", () => {
    const rp = new RolePlay(lab("02-restaurant.lesson"));
    let firstCue;
    for (let i = 0; i < 50; i++) {
      const step = rp.next();
      if (step.kind === "player") {
        firstCue = step.cue;
        break;
      }
    }
    expect(firstCue).toBeDefined();
    const ctx = firstCue!.context;
    expect(ctx.npcRole.name).toMatch(/Mesero|Waiter/);
    expect(ctx.playerRole.name).toMatch(/Cliente|Customer/);
    expect(ctx.acceptablePhrases.length).toBeGreaterThan(0);
    expect(ctx.totalTurns).toBeGreaterThan(0);
    expect(ctx.turnNumber).toBe(1);
  });

  it("counts total player turns", () => {
    const l = lab("01-greetings.lesson");
    const rp = new RolePlay(l);
    const expected = l.turns.filter((t) => t.role === "B").length;
    let lastTurnNumber = 0;
    for (let i = 0; i < 100; i++) {
      const step = rp.next();
      if (step.kind === "player") lastTurnNumber = step.cue.context.turnNumber;
      if (step.kind === "end") break;
    }
    expect(lastTurnNumber).toBe(expected);
  });
});
