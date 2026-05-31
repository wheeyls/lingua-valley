import { describe, it, expect } from "vitest";
import { auditLayout } from "../assertions";
import { dialogueLayout, type DialogueVM } from "../layouts/dialogue";

function baseDialogue(over: Partial<DialogueVM> = {}): DialogueVM {
  return {
    npcName: "Rosa",
    spanish: "¡Hola! Buenos días. ¿Cómo estás hoy?",
    actionable: true,
    clarity: 1,
    englishHint: "Hello! Good morning. How are you today?",
    overLevelNote: "Too advanced to follow — learn more in an earlier area first.",
    lineIndex: 0,
    lineCount: 2,
    continueLabel: "Continue ▶",
    ...over,
  };
}

describe("dialogue layout", () => {
  it("is healthy: fits safe area, touch targets, no interactive overlap", () => {
    const issues = auditLayout(dialogueLayout(baseDialogue()));
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("stays healthy with a long over-level (garbled) line + lesson tease", () => {
    const issues = auditLayout(
      dialogueLayout(
        baseDialogue({
          spanish: "···· ···· ····, ¿···· ···· ····? ···· ···· ····!",
          actionable: false,
          clarity: 0.2,
          lessonLabel: "Market quantities and bargaining",
          continueLabel: "Start lesson ▶",
        }),
      ),
    );
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("keeps the two action buttons from overlapping", () => {
    const nodes = dialogueLayout(baseDialogue());
    const overlapIssues = auditLayout(nodes).filter(
      (i) => i.rule === "no-interactive-overlap",
    );
    expect(overlapIssues).toHaveLength(0);
  });
});
