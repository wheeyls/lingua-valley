# Lingua Valley — Resources, Persistence & Multiplayer Design

This document is the source of truth for the economy, data model, server-authoritative
reward flow, auth, and real-time multiplayer. Build against this.

## Guiding principles

1. **Practice is the labor.** Every resource is earned by producing real Spanish that
   the LLM grades. Repetition is the *excuse* to practice; rewards require correctness.
2. **Server-authoritative economy.** The client never grants itself pesos, mastery, or
   resources. Grants happen in serverless functions after grading, then persist to Postgres.
3. **Guest-first.** Play instantly as a guest (local save). Sign up later to *claim* the
   guest progress into a real account and sync across devices.
4. **Domain-first, framework-light.** All economy/SRS rules live in `src/domain/` as pure,
   tested functions. Phaser, Supabase, and HTTP are thin layers around them.
5. **Multiplayer-ready from day one.** Schema and state shapes assume many players in a
   shared world even though the first milestone only syncs presence + movement.

## The economy (Stardew loop → Spanish practice)

| Stardew concept    | Lingua Valley resource | How it's earned / spent |
|--------------------|------------------------|--------------------------|
| Energy / stamina   | **Focus**              | Daily budget; regenerates each day. Spent to start practice activities. |
| Gold               | **Pesos**              | Granted server-side per graded activity, scaled by score. Spent on tools/cosmetics. |
| Crops / foraging   | **Vocab cards**        | Each target word is an SRS card. Correct use "waters" it; it matures to *mastered*. |
| Skill XP tracks    | **Skills**             | speaking / listening / vocab — each activity feeds the relevant track. |
| Tools              | **Unlocks** (later)    | Phrasebook entries, hint abilities, new activity types. |

### Reward formulas (pure functions in `src/domain/economy.ts`)

Inputs from a graded activity: `communication` (0..1), `accuracy` (0..1), `level` (CEFR).

```
quality   = 0.6*communication + 0.4*accuracy           // 0..1
levelMult = 1 + 0.25 * levelRank(level)                // A1=1.0, A2=1.25, ...
pesos     = round(BASE_PESOS * quality * levelMult)    // BASE_PESOS = 10
focusCost = ACTIVITY_FOCUS_COST                        // 5 per conversation
skillGain = round(100 * quality)                       // points into the activity's skill
```

Pesos are only granted when `quality >= REWARD_THRESHOLD` (0.5); below that the player
keeps practicing for free (Focus still spent) but earns nothing — incentivizes real effort.

### Focus (daily stamina)

```
FOCUS_MAX = 100
Regen: on first activity of a new UTC day, refill to FOCUS_MAX.
Spend: focusCost per activity; if insufficient, activity is blocked ("rest until tomorrow").
```

### Vocab cards = SM-2-lite spaced repetition (`src/domain/srs.ts`)

Each card: `{ wordId, ease, intervalDays, dueAt, reps, state }` where
`state ∈ {seedling, growing, mature}`.

```
On a correct use (quality q in 0..1, pass = q >= 0.6):
  if pass:
    reps += 1
    ease = clamp(ease + (0.1 - (1-q)*0.4), 1.3, 2.8)
    interval = reps==1 ? 1 : reps==2 ? 3 : round(prevInterval * ease)
    state = reps>=4 ? mature : growing
  else:
    reps = 0; interval = 0; state = seedling   // reset, must re-water
  dueAt = now + interval days
```

A word counts toward an objective's *mastery* once its card is `mature`.

## Data model (Postgres / Supabase)

All tables have RLS enabled. `auth.uid()` owns its rows. A guest has no `auth` row; guest
state lives only client-side until claimed (then we upsert into these tables).

```sql
-- One row per player.
profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null default 'Aprendiz',
  avatar_color  int  not null default 16763985,
  created_at    timestamptz not null default now()
)

-- One row per player: scalar resources. Server-authoritative.
player_state (
  user_id       uuid primary key references auth.users on delete cascade,
  pesos         int  not null default 0,
  focus         int  not null default 100,
  focus_day     date not null default current_date,   -- for daily regen
  skills        jsonb not null default '{}',           -- { speaking:int, listening:int, vocab:int }
  mastered_ids  text[] not null default '{}',          -- mastered objective ids
  updated_at    timestamptz not null default now()
)

-- One row per (player, word): the SRS cards.
vocab_cards (
  user_id       uuid not null references auth.users on delete cascade,
  word_id       text not null,
  ease          real not null default 2.3,
  interval_days int  not null default 0,
  reps          int  not null default 0,
  due_at        timestamptz not null default now(),
  state         text not null default 'seedling',
  primary key (user_id, word_id)
)

-- Audit log of graded activities (also powers leaderboards later).
activity_log (
  id            bigserial primary key,
  user_id       uuid not null references auth.users on delete cascade,
  npc_id        text,
  objective_id  text,
  level         text,
  communication real, accuracy real, quality real,
  pesos_awarded int,
  created_at    timestamptz not null default now()
)
```

Multiplayer presence/movement is **ephemeral** (Supabase Realtime presence channel), not a
table — positions don't need durability. Durable shared state (e.g. who mastered what) reads
from the tables above.

## Server-authoritative reward flow

The existing `/api/converse` returns a grade. We add reward granting so the client can't
fabricate currency:

```
POST /api/activity/complete
  body: { sessionToken, npcId, objectiveId, level, grade:{communication,accuracy} }
  server:
    1. Identify user from Supabase JWT (or guest -> reject server grant, client-local only).
    2. Recompute quality/pesos/skillGain from the grade (never trust client numbers).
    3. Check & spend Focus (daily regen first). Block if insufficient.
    4. Update player_state (pesos, skills, focus), upsert vocab_cards via SRS, maybe mastered_ids.
    5. Insert activity_log row.
    6. Return the authoritative new PlayerState snapshot.
```

Guests: the same domain functions run **client-side** so guests get the full loop locally;
on account claim we replay/merge into the server tables (server re-validates).

## Auth & guest/claim

- **Guest:** generate a local `guestId`; all state in `localStorage` under that id.
- **Sign in:** Supabase Auth (email magic link + Google). On first sign-in, create
  `profiles` + `player_state`. If a guest save exists, **claim**: merge guest pesos/skills/
  mastery/cards into the new account (max/most-progressed wins), then clear local guest save.
- Client holds the Supabase session; API functions verify the JWT for server-authoritative writes.

## Multiplayer (milestone 1: presence + movement)

- One Supabase Realtime channel per area (`presence:area:<areaId>`).
- Each client tracks its `{ userId, displayName, color, x, y, facing }` via presence.
- On `presence sync`, render/update other players' avatars (interpolated movement).
- Broadcast lightweight movement deltas at ~10Hz; presence carries identity + last position.
- **Emotes/text:** broadcast events on the same channel (`emote`, `chat`).
- **Later milestones:** player-to-player voice (WebRTC) and co-op graded activities.

## Architecture: hexagonal (ports & adapters) — NON-NEGOTIABLE

This is **not a Phaser app**. It is a **domain application** with Phaser as one of several
adapters. We actively resist letting frameworks (Phaser, Supabase, OpenAI, HTTP) absorb the
domain — the same failure mode where game logic leaks into `scene.update()` or persistence
shapes dictate game rules.

```
   DRIVING ADAPTERS            DOMAIN (core)              DRIVEN ADAPTERS
   (call the domain)        pure TS, no frameworks       (domain calls them via ports)

   Phaser scenes  ────▶   economy · srs · player    ◀────  Supabase repos  (PlayerStateRepo)
   input / UI     ────▶   proficiency · comprehension ◀──  OpenAI client   (RewardGrader)
                          conversation                ◀──  Realtime        (PresenceGateway)
                          + PORTS (interfaces)
```

### Laws

1. **`src/domain/` imports nothing framework-y.** No `phaser`, no `@supabase/*`, no `openai`,
   no `fetch`/`Response`. Only other domain modules and TS types. It must run in Node, browser,
   and tests identically.
2. **The domain owns the interfaces (ports) it needs.** e.g. `PlayerStateRepository`,
   `RewardGrader`, `PresenceGateway`. The domain depends on these abstractions, never on a
   concrete vendor.
3. **Adapters live outside the domain and implement ports.** `src/net/SupabasePlayerRepository`,
   `src/net/HttpRewardClient`, `src/net/SupabasePresenceGateway`, Phaser scene renderers.
   Adapters translate vendor/transport types ⇄ domain types. They contain no game rules.
4. **Phaser scenes are a thin rendering layer.** They subscribe to domain state and invoke
   domain methods on input. No reward math, no SRS, no economy rules inside `update()`.
5. **Persistence shape ≠ domain shape.** The Postgres tables are an adapter detail; a mapper
   converts rows ⇄ domain `PlayerState`. The domain never sees a DB row.
6. **Composition root wires it up.** `src/main.ts` (and API handlers) are the only places that
   construct concrete adapters and inject them into the domain. Nothing else `new`s an adapter.
7. **The test is the proof.** Every rule is unit-testable with zero framework mocks. If a test
   needs Phaser or a live Supabase, the logic is in the wrong layer — extract it.

## Module map (planned)

```
src/domain/                 ← CORE. zero framework imports. fully unit-tested.
  economy.ts                  reward formulas, Focus regen/spend (pure)
  srs.ts                      spaced-repetition card updates (pure)
  player.ts                   PlayerState type + reducer applying an activity result
  ports.ts                    interfaces the domain requires:
                                PlayerStateRepository, RewardGrader, PresenceGateway,
                                Clock, IdGenerator
  proficiency.ts / comprehension.ts / conversation.ts  (existing pure modules)

src/net/                    ← DRIVEN ADAPTERS. implement domain ports. no game rules.
  supabaseClient.ts           browser Supabase client construction
  SupabasePlayerRepository.ts implements PlayerStateRepository (row ⇄ domain mapper)
  HttpRewardClient.ts         implements RewardGrader by calling /api (server-authoritative)
  SupabasePresenceGateway.ts  implements PresenceGateway over Realtime
  auth.ts                     guest id, sign-in, claim/merge orchestration

api/                        ← SERVER ADAPTERS (composition root for server side)
  _lib/supabaseAdmin.ts       service-role client + JWT verification
  activity/complete.ts        server-authoritative reward grant (uses domain economy/srs)
  state/load.ts               load player state

src/scenes/                 ← DRIVING ADAPTERS (Phaser rendering only)
  WorldScene                  movement + remote avatars (reads PresenceGateway view)
  ConversationScene           invokes RewardGrader port; renders result
  HudScene                    renders PlayerState (Focus/Pesos/skills)
  (login overlay)             invokes auth; renders session state

src/main.ts                 ← COMPOSITION ROOT. constructs adapters, injects into domain,
                              hands the wired-up services to scenes via the registry.
```

**Dependency direction:** `scenes → domain ← net/api`. Domain points outward to nobody.
Adapters depend on the domain's port interfaces, not vice versa.

## Sequencing (foundation first)

1. Pure domain: `economy.ts`, `srs.ts`, `player.ts` + unit tests.
2. Supabase schema + RLS migration.
3. Browser Supabase client, guest id, auth + claim/merge.
4. Server-authoritative `/api/activity/complete` + `/api/state/load`.
5. Wire ConversationScene reward → server (guest → local domain).
6. Resource HUD + login overlay.
7. Realtime presence: remote avatars moving in the shared world.
8. Emotes/text. (Voice + co-op activities: later milestones.)
