# Agent Instructions

## Architecture: Hexagonal (Ports & Adapters), Framework-Light

This is **NOT a Phaser app.** It is a **domain application** (a game) for which Phaser,
Supabase, OpenAI, and HTTP are merely **adapters at the edges**. Game engines and SDKs love to
"eat" a domain — rules migrate into `scene.update()`, persistence row shapes start dictating
game logic, and the design scatters across the framework. We actively resist this.

See `docs/DESIGN.md` for the full picture. The short version:

```
   DRIVING ADAPTERS          DOMAIN (core)            DRIVEN ADAPTERS
   Phaser scenes  ──▶   pure TS, no frameworks   ◀──  Supabase / OpenAI / Realtime
   input / UI     ──▶   + the PORTS it needs     ◀──  (implement those ports)
```

### The Laws (do not break these)

1. **`src/domain/` imports nothing framework-y.** No `phaser`, `@supabase/*`, `openai`, or
   `fetch`/DOM/`Response`. Only other domain modules + TS types. Domain runs in Node, the
   browser, and tests identically.
2. **The domain defines the interfaces (ports) it depends on** in `src/domain/ports.ts`
   (e.g. `PlayerStateRepository`, `RewardGrader`, `PresenceGateway`, `Clock`). The domain
   talks to abstractions, never to a vendor SDK.
3. **Adapters implement ports and live outside the domain** (`src/net/`, `api/`, Phaser
   scenes). Adapters translate transport/vendor types ⇄ domain types and contain **no game
   rules**.
4. **Phaser scenes are a thin rendering layer.** Subscribe to domain state, call domain
   methods on input. No economy/SRS/reward math in `update()` or event handlers.
5. **Persistence shape ≠ domain shape.** DB rows are an adapter concern; a mapper converts
   rows ⇄ domain types. The domain never imports a row type.
6. **Composition happens only at the roots:** `src/main.ts` (client) and each `api/*` handler
   (server). These are the *only* places that `new` a concrete adapter and inject it.
7. **Server-authoritative economy.** Reward/currency/mastery grants are computed and persisted
   server-side from the LLM grade. The client never grants itself resources.

### Where Things Live

| Concern | Location | Examples |
|---------|----------|----------|
| Rules, formulas, state machines | `src/domain/` | economy reward math, SRS, focus regen, comprehension |
| Interfaces the domain needs | `src/domain/ports.ts` | `PlayerStateRepository`, `RewardGrader`, `PresenceGateway` |
| Persistence adapters | `src/net/`, `api/_lib/` | `SupabasePlayerRepository`, row⇄domain mappers |
| Network/transport adapters | `src/net/`, `api/` | `HttpRewardClient`, presence gateway, API handlers |
| Rendering / input | `src/scenes/` | Phaser scenes (presentational) |
| Wiring | `src/main.ts`, `api/*` | construct + inject adapters |

### Test Philosophy

Domain logic must be testable with **zero framework mocks**. Tests live in
`src/domain/__tests__/` and exercise domain functions/classes directly. If something can only
be tested by booting Phaser or hitting a live Supabase, the logic is in the wrong layer —
extract it into the domain behind a port.

### Adding a Feature (the order)

1. Model it in `src/domain/` as pure functions/types. Add a port if it needs the outside world.
2. Unit-test the domain logic.
3. Implement the adapter(s) for any new port in `src/net/` or `api/`.
4. Wire it in the composition root (`main.ts` / api handler).
5. Build the Phaser/UI rendering last — thin, calling into the domain.
