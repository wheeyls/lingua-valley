# Lingua Valley

A Stardew Valley–inspired RPG where **you don't level up by grinding XP — you level up by learning Spanish.**

The world is divided into areas, each tied to a CEFR proficiency level (A1, A2, …).
You can physically walk anywhere, but the areas are guarded by a **soft gate**: if
you wander into a zone above your level, the NPCs literally speak over your head.
Their dialogue is *garbled in proportion to how little you understand*, and you
can't act on quests you can't comprehend. The only way forward is to stay in your
current area, play its learning challenges, and master the skills the next zone
demands.

## The core loop

1. **Explore** an area (arrow keys / WASD).
2. **Talk** to NPCs (walk close, press SPACE). Each NPC speaks at their area's level.
3. **Learn** — NPCs offer learning challenges:
   - **Voiced conversation gate** (Rosa, the greetings NPC): she *speaks* to you
     (OpenAI TTS), you reply *by voice* (hold SPACE), Whisper transcribes it, and
     GPT-4o — playing both the NPC and a CEFR examiner — grades whether you actually
     communicated at the target level. Only a genuine spoken exchange opens the gate.
   - **Multiple-choice vocab quiz** (other NPCs): the lighter fallback challenge.
4. **Progress** — once you master *every* objective of your level, your effective
   level rises, and the next area's speech becomes clear enough to act on.

There is no health, no XP bar, no character level. Your "level" is simply the
highest CEFR tier whose objectives you've fully mastered.

## AI voice & conversation (Whisper + GPT-4o + TTS)

The conversation gate is powered by OpenAI, proxied through serverless functions
in `/api` so the API key never reaches the browser:

| Endpoint | Purpose | Model |
|----------|---------|-------|
| `POST /api/transcribe` | Speech → text (player's spoken Spanish) | `whisper-1` |
| `POST /api/converse`   | NPC reply + CEFR grading (structured JSON) | `gpt-4o` |
| `POST /api/speak`      | Text → speech (NPC voices) | `gpt-4o-mini-tts` |

The wire contract lives in `src/domain/conversation.ts` and is shared by both the
client and the functions. The gate only opens when the model says the objective is
met *and* the latest utterance clears the `gateShouldOpen` thresholds
(`src/domain/conversation.ts`) — covered by unit tests.

If the backend is unreachable or the mic is unavailable, the conversation scene
degrades gracefully (shows a message; you can leave with ESC).

## The vertical slice

- **Plaza del Saludo (A1)** — greetings, introductions, numbers 1–10, courtesy.
- **El Mercado (A2)** — market quantities, food vocab, bargaining.

Walk through the archway on the right into the Mercado before finishing A1 and
you'll see the soft gate in action: the vendor's speech is mostly `····` noise.

## Architecture (domain-first)

Language-learning logic is kept **pure and testable**, separate from Phaser:

```
api/                 ← serverless functions (run on Vercel; keys server-side)
  transcribe.ts      ← Whisper STT
  converse.ts        ← GPT-4o NPC reply + CEFR grading
  speak.ts           ← OpenAI TTS
  _lib/openai.ts     ← shared client + model config
src/
  domain/            ← pure logic, no Phaser (unit-tested)
    cefr.ts          ← CEFR levels + learning objective types
    proficiency.ts   ← what the player has mastered; computes effective level
    comprehension.ts ← the soft-gate model: clarity + dialogue garbling
    conversation.ts  ← wire contract + gate thresholds for voiced conversation
  content/
    curriculum.ts    ← A1/A2 objectives + vocab
    world.ts         ← areas, NPCs, level-tagged dialogue, voices
  game/
    state.ts         ← bridges domain ↔ Phaser, persists to localStorage
    voice.ts         ← mic capture + audio playback
    api.ts           ← client wrapper for the /api endpoints
  scenes/            ← Phaser rendering layer
    WorldScene       ← map, movement, NPC proximity/interaction
    DialogueScene    ← renders dialogue through the comprehension model
    ConversationScene← voiced conversation gate (Whisper + GPT-4o + TTS)
    MinigameScene    ← the vocab quiz that masters objectives
    HudScene         ← proficiency tracker + over-level warnings
  main.ts
```

The comprehension/soft-gate rules live in `src/domain/comprehension.ts` and the
voiced-gate thresholds in `src/domain/conversation.ts`; both are covered by tests
in `src/domain/__tests__/`.

## Run it

### Frontend only (no AI voice)

```bash
npm install
npm run dev        # http://localhost:5173 — world, movement, vocab quizzes
```

The voiced conversation gate needs the `/api` functions, which Vite doesn't serve.

### Full stack with voice (Whisper/GPT-4o/TTS)

```bash
npm i -g vercel            # one-time
vercel link                # link to your Vercel project
vercel env pull            # or: export OPENAI_API_KEY=sk-...
npm run dev:full           # `vercel dev` — serves the game AND /api on one port
```

Set **`OPENAI_API_KEY`** in your Vercel project (Settings → Environment Variables)
for the deployed app, or locally via `vercel env` / a `.env` file used by `vercel dev`.

Other scripts:

```bash
npm run build      # typecheck + production build
npm run typecheck  # typechecks both src and api
npm test           # domain + full gameplay scenario tests (vitest)
```

## Adapter profiles & local-fakes (test without real services)

The game is built **hexagonally**: the domain depends only on *ports* (interfaces),
and adapters implement them. This means the entire game — economy, persistence,
auth, and **multiplayer presence** — can run against in-memory fakes with no
network, no Supabase, no OpenAI, and no websockets.

`makeAdapters(profile)` (in `src/app/adapters.ts`) selects the implementation:

| Profile        | Persistence | Grading (LLM)        | Multiplayer            | Clock        |
|----------------|-------------|----------------------|------------------------|--------------|
| `test`         | in-memory   | scripted fake        | in-process bus (fake)  | advanceable  |
| `local-fakes`  | in-memory   | scripted fake        | in-process bus + ghosts| advanceable  |
| `guest`        | localStorage| real `/api/converse` | none (noop)            | system       |
| `cloud`        | (Supabase*) | real `/api`          | (Supabase Realtime*)   | system       |

\* Real Supabase adapters slot in at the composition root when configured —
that's the only place that changes.

**Run the fully-faked sandbox** (no API keys, scriptable multiplayer):

```
npm run dev    then open  http://localhost:5173/?dev=fakes
```

A **dev harness** (`DevScene`) appears bottom-left with shortcuts:
- `G` — spawn a wandering ghost player (tests remote avatars with no network)
- `N` — advance the clock one day (tests Focus regen + SRS card maturation)
- `P` / `F` — set the next conversation grade to PASS / FAIL
- live readout of pesos, focus, skills, mastery

You can also force a profile with `VITE_ADAPTER_PROFILE=local-fakes`.

### Gameplay tests

`src/app/__tests__/scenarios.test.ts` drives whole sessions against the fakes:
single graded turn → rewards; multi-day practice → objective mastery; Focus
budget exhaustion + next-day refill; presence join/move/leave + ghosts; auth
guest→account. All deterministic, zero framework mocks.

## Extending

- **New objectives/vocab:** add to `src/content/curriculum.ts`.
- **New areas/NPCs/dialogue:** add to `src/content/world.ts` (tag lines with a CEFR level).
- **New mini-game types:** add a scene like `MinigameScene` and launch it from `DialogueScene`.
- **Tune the gate difficulty:** edit `clarityFor` / `ACTIONABLE_THRESHOLD` in `comprehension.ts`.
- **Tune the economy:** edit pure functions in `src/domain/economy.ts` / `srs.ts` (covered by tests).
- **Add a real service:** implement the relevant port (`PlayerStateRepository`,
  `PresenceGateway`, etc.) in `src/net/`, then wire it in `makeAdapters("cloud")`.
  Nothing else changes — the domain and scenes are untouched.

See `docs/DESIGN.md` for the economy, schema, and architecture, and `AGENTS.md`
for the ports-and-adapters laws.

Guest progress is saved to `localStorage`; signed-in progress will sync to
Supabase (cloud profile) once configured.

## Database migrations (automated)

Schema changes live in `supabase/migrations/` as timestamped `.sql` files and
are applied automatically by GitHub Actions — **no more copy-pasting SQL into the
dashboard.**

- **`.github/workflows/migrate.yml`** runs `supabase db push` on every push to
  `main` that touches `supabase/migrations/**` (and can be run manually from the
  Actions tab via *Run workflow*).
- **`.github/workflows/ci.yml`** runs typecheck + tests on every push/PR.

### One-time setup

Add three repo secrets (GitHub → Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|--------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | Supabase → Account → Access Tokens → Generate |
| `SUPABASE_PROJECT_REF` | Your project ref (the subdomain of the project URL, e.g. `onsqzglrnppdmppygzvp`) |
| `SUPABASE_DB_PASSWORD` | Supabase → Project Settings → Database → Database password |

**Baseline note:** the early migrations (`0001`–`0004`, now timestamped) were
applied by hand before this automation existed. They all use `IF NOT EXISTS`, so
re-running is safe. If the CLI's history table is empty, the first `db push` will
(harmlessly) re-apply them; if it complains, run once locally:

```bash
supabase link --project-ref <ref>
supabase migration repair --status applied <migration_timestamp>   # mark prior ones as applied
```

### Adding a new migration

```bash
supabase migration new add_something   # creates a timestamped file
# …edit the generated SQL…
git add supabase/migrations && git commit && git push   # CI applies it on main
```
