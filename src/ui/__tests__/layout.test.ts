import { describe, it, expect } from "vitest";
import { auditLayout } from "../assertions";
import { dialogueLayout, type DialogueVM } from "../layouts/dialogue";
import { conversationLayout, type ConversationVM } from "../layouts/conversation";
import { hudLayout, type HudVM } from "../layouts/hud";

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

function baseConversation(over: Partial<ConversationVM> = {}): ConversationVM {
  return {
    npcName: "Rosa",
    goal: "Greet people and say goodbye.",
    npcSpeech: "¡Hola! Buenos días. ¿Cómo estás hoy?",
    transcript: "",
    feedback: "",
    status: "Your turn — hold the mic and reply in Spanish.",
    statusColor: "#d9b08c",
    recording: false,
    ...over,
  };
}

describe("conversation layout", () => {
  it("is healthy in the await-input state", () => {
    const issues = auditLayout(conversationLayout(baseConversation()));
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("is healthy mid-conversation with transcript + feedback + recording", () => {
    const issues = auditLayout(
      conversationLayout(
        baseConversation({
          npcSpeech: "Muy bien. ¿Y de dónde eres? Cuéntame un poco más sobre ti.",
          transcript: "You: “Hola, me llamo Miguel y soy de California.”",
          feedback: "Great greeting!  +12 pesos",
          status: "🔴 Recording… release to send.",
          statusColor: "#b56576",
          recording: true,
        }),
      ),
    );
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("mic button meets the touch-target minimum", () => {
    const issues = auditLayout(conversationLayout(baseConversation())).filter(
      (i) => i.rule === "touch-target",
    );
    expect(issues).toHaveLength(0);
  });
});

function baseHud(over: Partial<HudVM> = {}): HudVM {
  return {
    authLabel: "Playing as guest",
    authAction: "Sign in",
    pesos: 0,
    focus: 100,
    focusMax: 100,
    skills: { speaking: 0, listening: 0, vocab: 0 },
    effectiveLevel: "—",
    levels: [
      { level: "A1", pct: 0 },
      { level: "A2", pct: 0 },
    ],
    ...over,
  };
}

describe("hud layout", () => {
  it("is healthy for a fresh guest", () => {
    const issues = auditLayout(hudLayout(baseHud()));
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("is healthy with large numbers + signed-in label", () => {
    const issues = auditLayout(
      hudLayout(
        baseHud({
          authLabel: "Signed in: miguel@example.com",
          authAction: "Sign out",
          pesos: 9999,
          focus: 35,
          skills: { speaking: 1200, listening: 800, vocab: 640 },
          effectiveLevel: "A1",
          levels: [
            { level: "A1", pct: 100 },
            { level: "A2", pct: 60 },
          ],
        }),
      ),
    );
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });
});
