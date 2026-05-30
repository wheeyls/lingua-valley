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
3. **Learn** — NPCs in your level offer mini-game lessons (multiple-choice vocab quizzes).
   Score 80%+ to *master* that learning objective.
4. **Progress** — once you master *every* objective of your level, your effective
   level rises, and the next area's speech becomes clear enough to act on.

There is no health, no XP bar, no character level. Your "level" is simply the
highest CEFR tier whose objectives you've fully mastered.

## The vertical slice

- **Plaza del Saludo (A1)** — greetings, introductions, numbers 1–10, courtesy.
- **El Mercado (A2)** — market quantities, food vocab, bargaining.

Walk through the archway on the right into the Mercado before finishing A1 and
you'll see the soft gate in action: the vendor's speech is mostly `····` noise.

## Architecture (domain-first)

Language-learning logic is kept **pure and testable**, separate from Phaser:

```
src/
  domain/            ← pure logic, no Phaser (unit-tested)
    cefr.ts          ← CEFR levels + learning objective types
    proficiency.ts   ← what the player has mastered; computes effective level
    comprehension.ts ← the soft-gate model: clarity + dialogue garbling
  content/
    curriculum.ts    ← A1/A2 objectives + vocab
    world.ts         ← areas, NPCs, level-tagged dialogue
  game/state.ts      ← bridges domain ↔ Phaser, persists to localStorage
  scenes/            ← Phaser rendering layer
    WorldScene       ← map, movement, NPC proximity/interaction
    DialogueScene    ← renders dialogue through the comprehension model
    MinigameScene    ← the vocab quiz that masters objectives
    HudScene         ← proficiency tracker + over-level warnings
  main.ts
```

The comprehension/soft-gate rules live entirely in `src/domain/comprehension.ts`
and are covered by `src/domain/__tests__/comprehension.test.ts`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build
npm run typecheck
npm test           # domain unit tests (vitest)
```

## Extending

- **New objectives/vocab:** add to `src/content/curriculum.ts`.
- **New areas/NPCs/dialogue:** add to `src/content/world.ts` (tag lines with a CEFR level).
- **New mini-game types:** add a scene like `MinigameScene` and launch it from `DialogueScene`.
- **Tune the gate difficulty:** edit `clarityFor` / `ACTIONABLE_THRESHOLD` in `comprehension.ts`.

Progress is saved automatically to `localStorage` under `lingua-valley.mastered`.
