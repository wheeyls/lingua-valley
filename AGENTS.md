# Agent Instructions

## Architecture: Domain-First, Framework-Free

This is a **website**, not a game engine app. It's a Spanish-learning tool built
as a point-and-click adventure with voice conversations. Pure HTML/CSS/DOM
rendering — no Phaser, no canvas, no sprites. The focus is on conversation
mechanics, progression, and rewards.

See `docs/DESIGN.md` for the full design.

```
   UI (HTML/DOM)  ──▶   DOMAIN (core)   ◀──  Adapters (Supabase, OpenAI, HTTP)
   thin adapter         pure TS, zero        implement domain ports
                        framework imports
```

### The Laws

1. **`src/domain/` imports nothing framework-y.** No DOM, no `@supabase/*`, no
   `openai`, no `fetch`/`Response`. Only other domain modules + TS types. Domain
   runs in Node, the browser, and tests identically.

2. **The domain defines the interfaces (ports) it depends on** in
   `src/domain/ports.ts`. The domain talks to abstractions, never to a vendor.

3. **Adapters live outside the domain** (`src/net/`, `api/`, `src/ui/html/`).
   They translate vendor/transport types ⇄ domain types and contain **no game
   rules**.

4. **The UI is a thin rendering layer.** HTML views read domain state and call
   domain methods on user input. No economy/objective/progression rules in UI
   code.

5. **Objectives are code-driven.** Each objective is a class implementing the
   `Objective` interface. Adding new content means writing a class, registering
   it, and adding an NPC/room — no framework changes.

6. **Server-authoritative economy** when signed in. Reward/currency grants are
   computed server-side from the LLM grade. The client falls back to local
   computation if the server fails (gameplay never breaks).

7. **The test is the proof.** Every rule is testable with zero framework mocks.
   If a test needs a browser or a live service, the logic is in the wrong layer.

### Where Things Live

| Concern | Location |
|---------|----------|
| Field/crops, inventory, economy, daily loop, objectives, map rules | `src/domain/` |
| Area/NPC/map data + lessons | `src/content/` |
| App orchestration (GameController, PlayerService, ConversationSession) | `src/app/` |
| Room views, conversation/dialogue overlays | `src/ui/html/` |
| Voice capture, audio playback, API client | `src/game/` |
| Serverless functions (converse, transcribe, TTS, activity-complete) | `api/` |

See `docs/DESIGN.md` for the farming loop (seeds → water → store → ticket).

### Adding a Feature

1. Model it in `src/domain/` as pure functions/types.
2. Unit-test the domain logic.
3. Implement any adapters in `src/net/` or `api/`.
4. Wire in `src/app/`.
5. Build the HTML/CSS rendering last — thin, calling into the domain.
