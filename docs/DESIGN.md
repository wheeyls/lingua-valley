# Lingua Valley — Design

A Spanish-learning app disguised as a tiny farming game. No game engine, no
animations, no canvas — just a website focused entirely on the mechanics of
progression, rewards, and the voice conversation experience.

## Core concept

You play through **campaigns** — one per CEFR level / week's lesson. Each
campaign is a small village laid out as a **hub** you click around: your field,
the seed farm, the practice plaza, the store, the train station. To grow crops
you talk to the villagers in Spanish. The conversations are the game; the farm
gives them structure, daily repetition, and a reason to come back tomorrow.

## Navigation: a hub of clickable locations

The hub shows a card for each **location**. Tap one to enter its **room** (which
hosts that location's one or two villagers); a **Back** button returns to the
hub. The live **Field** and **Station** cards sit on the hub.

```
            ┌─────────────── HUB (the village) ───────────────┐
   Field ◀──┤  🌱 Seed farm   💧 La Plaza   🛒 Store   🚂 Station │
            └──────────────────────┬──────────────────────────┘
                    tap a location ▼        ▲ Back
                         ┌──────────────────────────┐
                         │  Room: its villager(s)   │
                         └──────────────────────────┘
```

## The farming loop

```
   Seed farm ──▶ plant a crop        (intro: this week's lesson)
   La Plaza ────▶ +1 growth / day    (daily practice — may be TWO people)  ← loop
   Store ───────▶ sell the harvest   (review / "unit test" → money)
   Station ─────▶ buy a train ticket (money → next campaign)
```

1. **Get seeds** — at the seed farm, one intro conversation per cycle introduces
   what you'll learn and plants a crop in your field.
2. **Practice daily** — at the practice location. Completing the day's practice
   waters your whole field, growing every crop **+1 unit**. This is the growth
   driver, **gated to once per day**. A practice location can host **two people
   in sequence** (see below).
3. **Harvest & sell** — after **5 days** a crop is ready. Sell it at the store —
   a review/"unit test" conversation that pays out **money**.
4. **Travel** — money buys a **train ticket** at the station to the next campaign.

### Two-person practice (story → retell)

A practice location can chain two conversations. The current campaign's plaza:

- **Marisol** tells you 2 things she did today (you listen & understand).
- **Pablo** asks *"¿Qué hizo Marisol?"* — you retell it in the past tense.

Pablo is **locked until Marisol's story is done** (objective dependency), and her
story text is routed into Pablo's prompt so he can check your retelling.
Completing the pair is the day's watering.

## Why this shape

- **Daily cadence by construction.** Growth is gated once/day; **money is earned
  once per conversation per day** (so a two-person location pays for both).
  Regular short sessions beat cramming. Replaying is always free practice.
- **Structured progression.** Seeds = "new lesson", practice = "daily drill",
  store = "review test", ticket = "level complete". The growth bar is a visible
  progress meter.

## Domain model (`src/domain/`)

Pure TypeScript, zero framework imports, fully unit-tested.

| Module | Responsibility |
|--------|----------------|
| `field.ts` | The field: N slots, crops, growth, watering (once/day), harvest. |
| `inventory.ts` | Items the player holds — train tickets (`ticket:<area>`). |
| `economy.ts` | Turn a graded conversation into **money** (quality × level). |
| `dailyLoop.ts` | The 12-hour day; per-day growth gate (role) + per-day money gate (objective). |
| `player.ts` | `PlayerState` (money, field, inventory, daily) + the `applyActivity` reducer. |
| `objective.ts` + `objectives/` | Code-driven conversations: `SeedsIntro`, `StoryTelling`→`StoryRetell` (the paired practice), `StoreReview`, each built from a `Lesson`. |
| `conversation.ts` | Wire contract + gate thresholds for the voiced conversation. |
| `gameMap.ts` | Room/card model for the point-and-click navigator. |

### `PlayerState`

```
displayName, avatarColor
money                         ← earned at the store
field { slots: (Crop|null)[] }← what you grow (1 slot for now)
inventory                     ← train tickets you hold
daily { dayStartedAt, rewardedRoles[], rewardedObjectives[], objectiveState }
```

### The reducer

`applyActivity(prev, activity, now)` is the single authoritative step (server
and guest run the identical function). **All farming side-effects live here, not
in the UI** — so the server persists them and a refresh never loses progress:

- **Money comes ONLY from selling crops at the store.** Conversations are graded
  (quality drives feedback) but never pay directly — you earn by farming. This
  keeps the loop honest: practice grows crops, selling crops earns money.
- **Seeds** plants a crop (once/day per role).
- **Water** waters the field (+1 growth per crop), once/day per role — the field
  advances at most one step a day.
- **Store** harvests ready crops and pays `CROP_VALUE` each (once/day).
- It also records the objective's completion + outputs (e.g. the story text) in
  `daily.objectiveState`, so dependent objectives (Pablo) unlock and receive
  their inputs after a refresh.
- It advances the **streak** (`recordPlay`): consecutive days played, carried
  across the daily reset.

Non-conversation actions (buying a train ticket) go through
`applyPlayerAction` + `/api/player-action`, and guest→account merges go through
`/api/claim` — both server-authoritative, so the client never writes
`player_state` directly (Supabase RLS keeps that table server-owned).

### Hub status + leaderboard

- On the **hub**, each location card shows who's left to talk to inside (e.g.
  "1 of 2 left" / "All done today ✓") so you don't have to enter to check.
- A hidden **`/leaderboard`** route (no UI link — reach it by URL, sign-in
  required) shows every player's money, crop growth, ticket, today's progress,
  streak, and last-active, ranked by overall progress. Built server-side via
  `/api/leaderboard` (`src/domain/leaderboard.ts` holds the pure ranking logic).

## A crop cycle in objectives

Each conversation is an `Objective` built from a `Lesson` (the week's content):

- `SeedsIntro` (role `seeds`, NPC `seedsman`) → on completion, plant a crop.
- The water practice — either a single `WaterPractice` OR the paired
  `StoryTelling` → `StoryRetell` (`retell` depends on `telling`, and consumes its
  story text) → grows the field daily.
- `StoreReview` (role `store`, NPC `shopkeeper`) → harvest ready crops → money.

A new campaign is mostly a new `Lesson` (`src/content/lessons.ts`) + an `Area`
with its `locations` and `npcs` (`src/content/world.ts`).

## Voice conversation flow

1. Tap a villager → dialogue intro (explains what you'll do).
2. Tap "Talk" → conversation overlay; the villager greets (TTS).
3. Tap mic → speak Spanish → Whisper transcribes → a cleanup LLM fixes STT
   artifacts → the grading LLM evaluates and the villager replies (min 3 turns).
4. On a natural end, the role's side-effect applies (plant / water / sell) and
   the field/money update. You stay in the room (e.g. so Pablo unlocks after
   Marisol), and Back returns to the hub.

## Architecture

```
src/domain/     ← pure logic, zero framework imports, fully testable
src/content/    ← area/NPC/map data + lessons
src/app/        ← orchestration (GameController, PlayerService, ConversationSession)
src/ui/html/    ← DOM rendering (room view, conversation/dialogue overlays)
src/game/       ← voice capture, audio playback, API client
api/            ← Vercel serverless: converse, transcribe, speak, clean,
                  activity-complete, player-action, claim, state-load
```

**Dependency direction:** UI → app → domain. The domain points outward to nobody.

## Tech stack

- **Rendering:** Pure HTML/CSS/DOM. No canvas, no game engine.
- **Voice:** Whisper (STT) → GPT-4o (grading + NPC replies) → OpenAI TTS.
- **Persistence:** localStorage for guests; Supabase Postgres for accounts.
- **Hosting:** Vercel (static site + serverless functions).
- **CI:** GitHub Actions (typecheck + tests + Supabase migrations).

## Adding a new campaign

1. Add a `Lesson` to `src/content/lessons.ts` (set `storyTheme`/`retellTheme`
   for a two-person practice, or `practiceTheme` for a single one).
2. Add the `Area` to `src/content/world.ts`: its `blurb`, `ticketPrice`,
   `nextAreaId`, `locations` (each with a `role` + `npcIds`), and `npcs`.
3. `maps.ts` generates the hub + a room per location automatically.
4. Tests + typecheck.

The objective's `buildTheme()` tells the LLM how to behave per role; the daily
gate and growth rules are unchanged.

> **Current campaign:** *Pueblo del Ayer* (A2) — the **past tense**. Marisol
> recounts her day, Pablo has you retell it, and the shopkeeper asks about your
> own day. This is the live lesson for students right now.
