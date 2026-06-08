import { describe, it, expect } from "vitest";
import { auditLayout } from "../assertions";
import { dialogueLayout, type DialogueVM } from "../layouts/dialogue";
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
    showSpanish: true,
    englishHint: "Hello! Good morning. How are you today?",
    showEnglishHint: true,
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

  it("stays healthy with a long Spanish line + lesson tease", () => {
    const issues = auditLayout(
      dialogueLayout(
        baseDialogue({
          spanish:
            "Un kilo cuesta diez pesos, pero le puedo hacer un buen descuento hoy.",
          lessonLabel: "Market quantities and bargaining",
          continueLabel: "Start lesson ▶",
        }),
      ),
    );
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("stays healthy audio-only (no subtitles, no English)", () => {
    const issues = auditLayout(
      dialogueLayout(
        baseDialogue({ showSpanish: false, showEnglishHint: false }),
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

  it("stays healthy with the Trade button (merchant NPC)", () => {
    const issues = auditLayout(dialogueLayout(baseDialogue({ canTrade: true })));
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("stays healthy in a remote town (no English help)", () => {
    const issues = auditLayout(
      dialogueLayout(baseDialogue({ showEnglishHint: false })),
    );
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });
});

// Conversation layout tests removed — conversation is now rendered as HTML
// (HtmlConversationView), not via the canvas PhaserRenderer/layout system.

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
    goods: [{ name: "Manzanas", qty: 3 }],
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

  it("is healthy with the menu open + an active quest tracker", () => {
    const issues = auditLayout(
      hudLayout(
        baseHud({
          menuOpen: true,
          quest: {
            title: "Market Errands",
            phase: "active",
            steps: [
              { label: "buy produce from La Vendedora", done: true },
              { label: "get bread from El Panadero", done: false },
            ],
          },
        }),
      ),
    );
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

import { tradeLayout, type TradeVM } from "../layouts/trade";

function baseTrade(over: Partial<TradeVM> = {}): TradeVM {
  return {
    npcName: "La Vendedora",
    friendshipLabel: "Acquaintance",
    pesos: 120,
    rows: [
      { goodId: "manzanas", name: "Manzanas", buyPrice: 8, sellPrice: 8, owned: 2, locked: false },
      { goodId: "tomates", name: "Tomates", buyPrice: 12, sellPrice: 12, owned: 0, locked: false },
      { goodId: "chiles", name: "Chiles secos", buyPrice: null, sellPrice: 0, owned: 0, locked: true, requiresTierLabel: "Friend" },
    ],
    status: "Bought Manzanas  -8 pesos",
    ...over,
  };
}

describe("trade layout", () => {
  it("is healthy with mixed locked/unlocked rows", () => {
    const issues = auditLayout(tradeLayout(baseTrade()));
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });

  it("buy/sell buttons never overlap", () => {
    const overlap = auditLayout(tradeLayout(baseTrade())).filter(
      (i) => i.rule === "no-interactive-overlap",
    );
    expect(overlap).toHaveLength(0);
  });

  it("stays healthy with no status and many rows", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      goodId: `g${i}`,
      name: `Good ${i}`,
      buyPrice: 10,
      sellPrice: 10,
      owned: i,
      locked: false,
    }));
    const issues = auditLayout(tradeLayout(baseTrade({ rows, status: undefined })));
    expect(issues, JSON.stringify(issues, null, 2)).toHaveLength(0);
  });
});
