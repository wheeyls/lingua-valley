# Lingua Valley — Design

A Spanish-learning app disguised as a simple point-and-click adventure. No game
engine, no animations, no canvas — just a website focused entirely on the
mechanics of progression, rewards, and the voice conversation experience.

## Core concept

You visit a neighborhood. You walk into houses and talk to people in Spanish.
That's it. The conversations are the game. Everything else exists to give those
conversations structure, repetition, and a reason to come back tomorrow.

## Guiding principles

1. **It's a website, not a game engine.** Pure HTML/CSS/DOM. No Phaser, no
   canvas, no sprites. Rooms are static screens with tappable cards. This lets
   us focus entirely on the conversation experience and progression mechanics
   without fighting rendering tech.

2. **Conversations are the core mechanic.** Every meaningful interaction is a
   voice conversation graded by an LLM. The player speaks Spanish, gets
   real-time feedback, and improves through repetition. Everything else
   (navigation, objectives, rewards) exists to motivate and structure practice.

3. **Daily practice cadence.** The game is designed for short, regular sessions
   — not marathon grinding. Each day has a fixed set of objectives (3 today).
   Complete them, come back in 12 hours. You can replay for fun but won't
   advance. This mirrors how language learning actually works: spaced,
   consistent practice beats cramming.

4. **Domain-first, fully testable.** All game logic lives in `src/domain/` as
   pure TypeScript with zero framework imports. The UI is a thin adapter. Every
   rule (objectives, dependencies, completion, rewards) is unit-tested without
   a browser.

5. **Objectives are code-driven and composable.** Each objective is a class
   implementing the `Objective` interface. Objectives can depend on each other,
   produce outputs that downstream objectives consume (e.g. Marisol's story →
   Pablo's retelling quiz), and be composed into daily graphs. Adding new
   content means writing a class and registering it.

## The daily loop

Each "day" (12-hour cycle) has a fixed sequence of objectives:

### Today's objectives

1. **Rosa (greeting)** — Practice casual greetings in Spanish. Standalone,
   always available. A1 level.

2. **Marisol (story)** — Listen to Marisol tell you about her morning in simple
   past tense. She tells you 2 specific, memorable things she did. Standalone,
   always available. A2 level.

3. **Pablo (retelling)** — Marisol's brother asks you to retell what she said.
   Depends on Marisol's objective — won't activate until Marisol is done, and
   receives her story as input so the LLM knows what to quiz you on. Pablo
   prompts you through each point if you struggle. A2 level.

After all three: the day is "done" for 12 hours. You can replay any conversation
but earn no additional rewards.

### Completion flow

1. Visit Rosa's house on the street.
2. Tap Rosa → dialogue intro → voice conversation.
3. Tap Marisol → dialogue intro → voice conversation (she tells a story).
4. Pablo unlocks (green badge on Rosa + Marisol, Pablo's lock disappears).
5. Tap Pablo → retelling conversation.
6. Return home → water your flower → success screen.
7. Come back in 12 hours.

## Objective system (`src/domain/objective.ts`)

```
Objective interface
├── id, npcId, dependsOn[], reward
├── buildTheme(ctx)       → LLM conversation instructions
└── extractOutputs(lines) → data for downstream objectives
```

**ObjectiveGraph** manages the set:
- `isAvailable(id, state)` — checks all deps complete
- `gatherInputs(id, state)` — collects outputs from completed deps
- `complete(id, state, npcLines, now)` — stores outputs + marks done
- `earnsReward(id, state)` — true first time, false on replay

Current objectives:
- `RosaGreeting` — standalone, no deps/outputs
- `MarisolStory` — standalone, produces `storyText`
- `PabloRetelling` — depends on `marisol-story`, consumes `storyText`

## Navigation

Point-and-click rooms. No movement, no scrolling, no player character.

- **Street** → doors to Your House and Rosa's House
- **Your House** → flower (appears after all objectives done)
- **Rosa's House** → Rosa, Marisol, Pablo (Pablo locked until deps met)

Each room is a static screen with tappable cards: NPC cards (with avatar and
status badge), door cards (locked/unlocked), item cards. Tap to interact.

NPC cards show a green ✓ badge when that character's conversation is done today.
Locked NPCs are dimmed with a 🔒 hint.

## Voice conversation flow

1. Tap an NPC → dialogue intro (explains what you'll do).
2. Tap "Talk" → conversation overlay opens.
3. NPC greets you (TTS audio + text).
4. Tap mic → record your Spanish → tap again to send.
5. Whisper transcribes → cleanup LLM fixes transcription errors →
   grading LLM evaluates + NPC replies.
6. Repeat for several turns until the conversation wraps up naturally
   (minimum 3 player turns).
7. "Continue" button returns you to the room.
8. Objective completes, NPC badge updates, doors may unlock.

### Transcription cleanup

A preprocessing LLM call between Whisper and the grading LLM fixes
speech-to-text artifacts (misheard words, English insertions, garbled text) so
the grader evaluates what you MEANT, not what Whisper misheard. The conversation
NPC already rolls with it naturally; the cleanup prevents the feedback from
lecturing about transcription errors.

### LLM prompt constraints

Each CEFR level has concrete constraints in the prompt (not just the label):
- **A1**: 3-6 word sentences, present tense only, most basic words, add English
  for uncommon words.
- **A2**: daily-life vocab, simple past tense, short sentences.
- **B1**: past/future tenses, moderate vocabulary, longer sentences OK.

When `conversationComplete` is true, the NPC's reply MUST be a closing statement
(goodbye), not a question — the player won't get another turn.

## Architecture

```
src/domain/     ← pure logic, zero framework imports, fully testable
src/content/    ← map/NPC/objective/curriculum data
src/app/        ← application orchestration (GameController, PlayerService, etc.)
src/ui/html/    ← DOM rendering (room views, conversation/dialogue overlays)
src/game/       ← voice capture, audio playback, API client
api/            ← Vercel serverless (converse, transcribe, speak, clean-transcription)
```

**Dependency direction:** UI → app → domain. Domain points outward to nobody.

All domain logic is tested with zero framework mocks. The UI is a thin adapter
that reads domain state and calls domain methods on user input.

## Tech stack

- **Rendering:** Pure HTML/CSS/DOM. No canvas, no game engine.
- **Voice:** Whisper (STT) → GPT-4o (grading + NPC replies) → OpenAI TTS.
- **Persistence:** localStorage for guests; Supabase Postgres for accounts.
- **Hosting:** Vercel (static site + serverless functions).
- **CI:** GitHub Actions (typecheck + tests + Supabase migrations).

## Adding new content

1. Write an `Objective` class in `src/domain/objectives/`.
2. Register it in the daily graph (`src/domain/objectives/daily.ts`).
3. Add an NPC to `src/content/world.ts` with `teachesObjectiveId`.
4. Add the NPC to the appropriate room in `src/content/maps.ts`.
5. Tests + typecheck.

The objective's `buildTheme()` tells the LLM how to behave; `extractOutputs()`
passes data to downstream objectives; `dependsOn` controls activation order.
