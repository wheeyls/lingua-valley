# Lingua Valley

A tiny farming game where **you grow crops by learning Spanish.**

You live in a house with a field out back. To grow a crop, you talk to your
neighbours in Spanish — the conversations *are* the game. The farm gives them a
daily rhythm and a goal: earn money, buy a train ticket, move to the next town.

## The farming loop

1. **Get seeds** from **Don Semilla** at *La Granja de Semillas* — an intro
   conversation that sets this week's lesson and plants one crop.
2. **Water daily** at *La Plaza* — the daily practice conversation. **Marisol**
   tells you a story, then you retell it to **Pablo**; finishing the practice
   grows every crop **+1 unit**, gated to once per day. (A location can host a
   single NPC or a two-person story→retell pair; the current campaign uses the
   pair.)
3. **Sell the harvest** to **Doña Tienda** at *La Tienda* after ~5 days — a
   review conversation that pays out **money**.
4. **Buy a train ticket** at the station to reach the next town.

You can practice as much as you like, but rewards (money, growth) come **once
per day** — regular short sessions beat cramming, just like real language
learning.

See **`docs/DESIGN.md`** for the full design.

## AI voice & conversation (Whisper + GPT-4o + TTS)

The conversation gate is powered by OpenAI, proxied through serverless functions
in `/api` so the API key never reaches the browser:

| Endpoint | Purpose | Model |
|----------|---------|-------|
| `POST /api/transcribe`        | Speech → text (player's spoken Spanish) | `whisper-1` |
| `POST /api/clean-transcription` | Fix STT artifacts before grading | `gpt-4o` |
| `POST /api/converse`          | NPC reply + grading (structured JSON) | `gpt-4o` |
| `POST /api/speak`             | Text → speech (NPC voices) | `gpt-4o-mini-tts` |
| `POST /api/activity-complete` | Server-authoritative money grant | — |

The wire contract lives in `src/domain/conversation.ts`, shared by the client and
the functions. The conversation counts as passed when the model says the objective
is met *and* the latest grade clears the `gateShouldOpen` thresholds — covered by
unit tests.

If the backend is unreachable or the mic is unavailable, the conversation overlay
degrades gracefully (shows a message; you can leave).

## Architecture (domain-first)

Pure HTML/CSS/DOM — no game engine, no canvas. Game logic is kept **pure and
testable**, separate from rendering:

```
api/                 ← serverless functions (run on Vercel; keys server-side)
  transcribe.ts          ← Whisper STT
  clean-transcription.ts ← STT cleanup pass
  converse.ts            ← GPT-4o NPC reply + grading
  speak.ts               ← OpenAI TTS
  activity-complete.ts   ← authoritative money grant (runs applyActivity)
  player-action.ts       ← authoritative non-conversation actions (buy ticket…)
  claim.ts               ← merge guest progress into a signed-in account
  leaderboard.ts         ← ranked player status board (money/growth/streak)
  state-load.ts          ← load the authoritative PlayerState for a user
  _lib/                  ← shared OpenAI + Supabase-admin clients
src/
  domain/            ← pure logic, no framework (unit-tested)
    field.ts         ← field/slots/crops/growth/harvest
    inventory.ts     ← items the player holds (train tickets)
    economy.ts       ← grade → money
    dailyLoop.ts     ← 12h day + per-role reward gate
    player.ts        ← PlayerState + applyActivity reducer
    objective.ts     ← code-driven conversations
    objectives/      ← SeedsIntro / StoryTelling / StoryRetell / StoreReview (+ Lesson)
    conversation.ts  ← wire contract + gate thresholds
    gameMap.ts       ← room/card model for the navigator
  content/
    lessons.ts       ← per-area Lesson content
    world.ts         ← areas, NPCs, ticket prices, voices
    maps.ts          ← village hub + per-location rooms (generated from world)
  app/               ← GameController, PlayerService, ConversationSession
  ui/html/           ← DOM views (world, conversation, dialogue, auth)
  game/              ← voice capture + audio playback + API client
  net/               ← adapters (Supabase, HTTP, local, fakes)
  main.ts
```

## Run it

### Frontend only (no AI voice)

```bash
npm install
npm run dev        # http://localhost:5173 — hub, rooms & UI (voice/grading need /api)
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

You can also force a profile with `VITE_ADAPTER_PROFILE=local-fakes`. The
`FakeClock` is advanceable, so tests fast-forward days to exercise crop growth
and the daily reward gate.

### Gameplay tests

`src/app/__tests__/scenarios.test.ts` drives whole sessions against the fakes:
a graded turn → money; a week of watering → a harvest-ready crop; the daily gate
blocking a second same-day reward and resetting after the cooldown; presence
join/move/leave; auth; reward-grant resilience. All deterministic, zero
framework mocks.

## Extending

- **New lesson content:** add a `Lesson` to `src/content/lessons.ts`.
- **New areas/NPCs:** add the area (+ ticket price + `nextAreaId`), its
  locations, and their NPCs to `src/content/world.ts` — `src/content/maps.ts`
  generates the hub and per-location rooms from that content automatically.
- **Tune growth:** edit `MAX_GROWTH` in `src/domain/field.ts` (covered by tests).
- **Tune the economy:** edit pure functions in `src/domain/economy.ts`.
- **Add a real service:** implement the relevant port (`PlayerStateRepository`,
  `PresenceGateway`, etc.) in `src/net/`, then wire it in `makeAdapters("cloud")`.
  Nothing else changes — the domain and UI are untouched.

See `docs/DESIGN.md` for the full design and `AGENTS.md` for the
ports-and-adapters laws.

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
