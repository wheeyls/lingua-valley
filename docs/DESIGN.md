# Lingua Valley — Design

A Spanish-learning app disguised as a tiny farming game. No game engine, no
animations, no canvas — just a website focused entirely on the mechanics of
progression, rewards, and the voice conversation experience.

## Core concept

You live in a house with a field out back. To grow crops you talk to your
neighbours in Spanish. The conversations are the game; the farm gives them
structure, daily repetition, and a reason to come back tomorrow.

## The farming loop

```
   Seed farm ──▶ plant a crop        (intro: this week's lesson)
   Water tower ─▶ +1 growth / day    (daily practice on the theme)   ← the loop
   Store ───────▶ sell the harvest   (review / "unit test" → money)
   Station ─────▶ buy a train ticket (money → next area)
```

1. **Get seeds** — visit **Don Semilla** at the seed farm. One intro
   conversation per cycle introduces what you'll learn this week and plants one
   crop in your field.
2. **Water daily** — visit **Aguamarina** at the water tower. Each day's
   practice conversation waters your whole field, growing every crop **+1
   unit**. This is the growth driver, **gated to once per day**: you can
   practice as much as you like, but a crop only advances once per real day.
3. **Harvest & sell** — after **5 days** of watering a crop is ready. Sell it to
   **Doña Tienda** at the store. Selling is a review/"unit test" conversation
   over the whole lesson, and pays out **money**.
4. **Travel** — money buys a **train ticket** at the station to the next area.

So a level is one crop cycle: an intro conversation sets expectations, ~5 days
of practice grow the crop, and a review conversation cashes it in toward the
ticket out.

## Why this shape

- **Daily cadence by construction.** Rewards (money, growth) are earned once per
  day per role. Regular short sessions beat cramming — exactly how language
  learning works. Replaying is always allowed for free practice.
- **Structured progression.** Seeds = "new lesson", water = "daily drill",
  store = "review test", ticket = "level complete". The crop's growth bar is a
  visible, motivating progress meter.

## Domain model (`src/domain/`)

Pure TypeScript, zero framework imports, fully unit-tested.

| Module | Responsibility |
|--------|----------------|
| `field.ts` | The field: N slots, crops, growth, watering (once/day), harvest. |
| `inventory.ts` | Items the player holds — train tickets (`ticket:<area>`). |
| `economy.ts` | Turn a graded conversation into **money** (quality × level). |
| `dailyLoop.ts` | The 12-hour day + per-role reward gate (`seeds`/`water`/`store`). |
| `player.ts` | `PlayerState` (money, field, inventory, daily) + the `applyActivity` reducer. |
| `objective.ts` + `objectives/` | Code-driven conversations: `SeedsIntro`, `WaterPractice`, `StoreReview`, each built from a `Lesson`. |
| `conversation.ts` | Wire contract + gate thresholds for the voiced conversation. |
| `gameMap.ts` | Room/card model for the point-and-click navigator. |

### `PlayerState`

```
displayName, avatarColor
money                         ← earned at the store
field { slots: (Crop|null)[] }← what you grow (A1 ships with 1 slot)
inventory                     ← train tickets you hold
daily { dayStartedAt, rewardedRoles[], objectiveState }
```

### The reducer

`applyActivity(prev, activity, now)` is the single authoritative step (server
and guest run the identical function):

- **Money** is granted once per role per day (`rewardEarned`), computed from the
  raw grade — no client number is trusted.
- The **water** role waters the field (+1 growth per crop), also gated once/day.

## A crop cycle in objectives

Each conversation is an `Objective` built from a `Lesson` (the week's content):

- `SeedsIntro` (role `seeds`, NPC `seedsman`) → on completion, plant a crop.
- `WaterPractice` (role `water`, NPC `waterkeeper`) → grows the field daily.
- `StoreReview` (role `store`, NPC `shopkeeper`) → harvest ready crops → money.

A new area is just a new `Lesson` (`src/content/lessons.ts`) — no new classes.

## Navigation

Point-and-click. One room (the Barrio) shows tappable cards:

- **Your field** — live card from player state: empty / growing (n/5) / ready.
- **Seed farm**, **Water tower**, **Store** — the three NPC conversations.
- **Train station** — buy a ticket once you can afford it.

## Voice conversation flow

1. Tap an NPC → dialogue intro (explains what you'll do).
2. Tap "Talk" → conversation overlay; the NPC greets (TTS).
3. Tap mic → speak Spanish → Whisper transcribes → a cleanup LLM fixes STT
   artifacts → the grading LLM evaluates and the NPC replies (min 3 turns).
4. On a natural end, the role's side-effect applies (plant / water / sell) and
   the field/money update.

## Architecture

```
src/domain/     ← pure logic, zero framework imports, fully testable
src/content/    ← area/NPC/map data + lessons
src/app/        ← orchestration (GameController, PlayerService, ConversationSession)
src/ui/html/    ← DOM rendering (room view, conversation/dialogue overlays)
src/game/       ← voice capture, audio playback, API client
api/            ← Vercel serverless (converse, transcribe, speak, clean, activity-complete)
```

**Dependency direction:** UI → app → domain. The domain points outward to nobody.

## Tech stack

- **Rendering:** Pure HTML/CSS/DOM. No canvas, no game engine.
- **Voice:** Whisper (STT) → GPT-4o (grading + NPC replies) → OpenAI TTS.
- **Persistence:** localStorage for guests; Supabase Postgres for accounts.
- **Hosting:** Vercel (static site + serverless functions).
- **CI:** GitHub Actions (typecheck + tests + Supabase migrations).

## Adding a new area

1. Add a `Lesson` to `src/content/lessons.ts`.
2. Add the area (+ ticket price + `nextAreaId`) and its three NPCs to
   `src/content/world.ts`.
3. Point `buildDailyGraph` at the lesson and the map at the area.
4. Tests + typecheck.

The objective's `buildTheme()` tells the LLM how to behave per role; the daily
gate and growth rules are unchanged.
