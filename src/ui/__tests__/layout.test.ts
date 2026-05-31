import { describe, it, expect } from "vitest";
import { auditLayout } from "../assertions";
import { dialogueLayout, type DialogueVM } from "../layouts/dialogue";
import { conversationLayout, type ConversationVM } from "../layouts/conversation";
import { hudLayout, type HudVM } from "../layouts/hud";
import {
  questionLayout,
  resultLayout,
  type QuestionVM,
} from "../layouts/minigame";

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
    menuOpen: false,
    ...over,
  };
}

describe("hud layout", () => {
  it("is healthy for a fresh guest (collapsed bar)", () => {
    const issues = auditLayout(hudLayout(baseHud()));
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("is healthy with the menu open", () => {
    const issues = auditLayout(hudLayout(baseHud({ menuOpen: true })));
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

function baseQuestion(over: Partial<QuestionVM> = {}): QuestionVM {
  return {
    lessonLabel: "Greetings",
    canDo: "Greet people and say goodbye.",
    index: 0,
    total: 5,
    prompt: "good afternoon",
    options: ["buenas tardes", "hola", "adiós", "gracias"],
    ...over,
  };
}

describe("minigame layout", () => {
  it("question screen is healthy", () => {
    const issues = auditLayout(questionLayout(baseQuestion()));
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("question screen handles long options without overflow", () => {
    const issues = auditLayout(
      questionLayout(
        baseQuestion({
          prompt: "can you give me a discount?",
          options: [
            "¿me hace un descuento?",
            "me lo llevo, gracias",
            "demasiado caro",
            "una docena por favor",
          ],
        }),
      ),
    );
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("answer buttons do not overlap each other", () => {
    const overlap = auditLayout(questionLayout(baseQuestion())).filter(
      (i) => i.rule === "no-interactive-overlap",
    );
    expect(overlap).toHaveLength(0);
  });

  it("result screen is healthy (pass and fail)", () => {
    expect(
      auditLayout(resultLayout({ passed: true, correct: 5, total: 5 })),
    ).toHaveLength(0);
    expect(
      auditLayout(resultLayout({ passed: false, correct: 2, total: 5 })),
    ).toHaveLength(0);
  });
});

describe("banner layout", () => {
  it("is healthy for normal and over-level entries", async () => {
    const { bannerLayout } = await import("../layouts/banner");
    expect(
      auditLayout(bannerLayout({ message: "Entering Plaza del Saludo", overLevel: false })),
    ).toHaveLength(0);
    expect(
      auditLayout(
        bannerLayout({
          message: "Entering El Mercado — they speak A2 here, over your head…",
          overLevel: true,
        }),
      ),
    ).toHaveLength(0);
  });
});
