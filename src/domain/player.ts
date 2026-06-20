/**
 * PlayerState — the core, framework-free representation of a player's progress.
 *
 * This is the DOMAIN shape, stripped to the farming loop:
 *   - identity (name + avatar colour)
 *   - money (earned by selling crops at the store)
 *   - a field of crop slots (the thing you grow)
 *   - an inventory (train tickets you hold)
 *   - the daily-loop gate state (which rewards you've claimed today)
 *
 * It is NOT a database row. Adapters map between vendor/transport shapes and
 * this type; the domain only ever speaks in these terms.
 */

import type { CefrLevel } from "./cefr.js";
import { computeReward, type ActivityReward } from "./economy.js";
import {
  INITIAL_DAILY_STATE,
  roleEarnsReward,
  claimRole,
  objectiveEarnsReward,
  claimObjective,
  isNewDay,
  startNewDay,
  type DailyState,
  type DailyRole,
} from "./dailyLoop.js";
import { makeField, waterField, type Field, type Slot } from "./field.js";
import { emptyInventory, add as addItem, type Inventory } from "./inventory.js";

export interface PlayerState {
  /** Display identity (also used for the multiplayer avatar). */
  displayName: string;
  avatarColor: number;

  /** Currency. Server-authoritative when signed in. */
  money: number;

  /** The field you grow crops in. */
  field: Field;

  /** Items the player holds (train tickets, etc.). */
  inventory: Inventory;

  /** Daily loop progress (which roles' rewards were claimed today + growth gate). */
  daily: DailyState;
}

/** How many planting slots the player's field starts with (A1 = 1). */
export const STARTING_SLOTS = 1;

export function initialPlayerState(
  displayName = "Aprendiz",
  avatarColor = 0xffc7d1,
): PlayerState {
  return {
    displayName,
    avatarColor,
    money: 0,
    field: makeField(STARTING_SLOTS),
    inventory: emptyInventory(),
    daily: INITIAL_DAILY_STATE,
  };
}

/**
 * Normalize a loaded (possibly OLD or partial) value into a complete, valid
 * PlayerState by filling any missing fields with defaults. This is the forward-
 * compatible migration boundary: saves written by earlier versions load cleanly
 * instead of crashing.
 *
 * Pure — every repository runs loaded data through this before returning it.
 */
export function normalizePlayerState(value: unknown): PlayerState {
  const base = initialPlayerState();
  if (!value || typeof value !== "object") return base;
  const v = value as Partial<PlayerState> & { pesos?: unknown };
  return {
    displayName: typeof v.displayName === "string" ? v.displayName : base.displayName,
    avatarColor: typeof v.avatarColor === "number" ? v.avatarColor : base.avatarColor,
    // Tolerate the old `pesos` field name from earlier saves.
    money:
      typeof v.money === "number"
        ? v.money
        : typeof v.pesos === "number"
          ? v.pesos
          : 0,
    field: normalizeField(v.field),
    inventory: isObject(v.inventory)
      ? (v.inventory as Inventory)
      : emptyInventory(),
    daily: normalizeDaily(v.daily),
  };
}

function normalizeField(v: unknown): Field {
  if (!isObject(v) || !Array.isArray((v as { slots?: unknown }).slots)) {
    return makeField(STARTING_SLOTS);
  }
  const rawSlots = (v as { slots: unknown[] }).slots;
  const slots: Slot[] = rawSlots.map((c) =>
    isObject(c) ? (c as unknown as Slot) : null,
  );
  return { slots: slots.length ? slots : makeField(STARTING_SLOTS).slots };
}

function normalizeDaily(v: unknown): DailyState {
  if (!isObject(v)) return INITIAL_DAILY_STATE;
  const d = v as Partial<DailyState>;
  return {
    dayStartedAt: typeof d.dayStartedAt === "string" ? d.dayStartedAt : "",
    rewardedRoles: Array.isArray(d.rewardedRoles)
      ? (d.rewardedRoles.filter(
          (r) => r === "seeds" || r === "water" || r === "store",
        ) as DailyRole[])
      : [],
    rewardedObjectives: Array.isArray(d.rewardedObjectives)
      ? d.rewardedObjectives.filter((o): o is string => typeof o === "string")
      : [],
    objectiveState: isObject(d.objectiveState)
      ? (d.objectiveState as DailyState["objectiveState"])
      : {},
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** UTC day string (YYYY-MM-DD). Pure — date is passed in, never read from a clock here. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The result of a single graded conversation, as understood by the domain.
 * Adapters translate an LLM grade into this; the domain reduces it into state.
 */
export interface ActivityResult {
  objectiveId: string;
  level: CefrLevel;
  /** Which daily role this conversation fulfills (gates reward + growth). */
  role: DailyRole;
  /** 0..1 grade components from the grader. */
  communication: number;
  accuracy: number;
}

/** What `applyActivity` returns: the new state plus what happened. */
export interface ApplyResult {
  state: PlayerState;
  /** The money reward computed for this conversation (0 if below threshold). */
  reward: ActivityReward;
  /** Whether this was the first money-bearing completion of the OBJECTIVE today. */
  earnedReward: boolean;
  /** Crops that gained a growth unit (water role, once/day). */
  grown: number;
}

/**
 * THE core reducer: apply a graded conversation to a player's state.
 *
 * Pure and deterministic — the caller supplies `now`. This single function is
 * the authoritative step; the server and the guest path both call it,
 * guaranteeing identical rules everywhere.
 *
 * Rules:
 *  - Money is awarded once per OBJECTIVE per day (so a two-person practice pays
 *    for both conversations); replays earn nothing.
 *  - The WATER role grows the field +1 unit, gated once per day per ROLE (so the
 *    field only advances one step a day regardless of how many water chats).
 */
export function applyActivity(
  prev: PlayerState,
  activity: ActivityResult,
  now: Date,
): ApplyResult {
  const day = utcDay(now);
  const reward = computeReward(activity.communication, activity.accuracy, activity.level);
  const earnedReward = objectiveEarnsReward(prev.daily, activity.objectiveId);

  // Money: only on the first money-bearing completion of this objective today.
  const money = earnedReward ? prev.money + reward.money : prev.money;

  // Growth: a water conversation grows the whole field, once per day per role.
  let field = prev.field;
  let grown = 0;
  let daily = prev.daily;
  if (activity.role === "water" && roleEarnsReward(prev.daily, "water")) {
    const watered = waterField(prev.field, day);
    field = watered.field;
    grown = watered.grown;
    if (grown > 0) daily = claimRole(daily, "water", now);
  }

  // Claim the objective's money for today (gates future replays).
  if (earnedReward) daily = claimObjective(daily, activity.objectiveId, now);

  return {
    state: { ...prev, money, field, daily },
    reward,
    earnedReward,
    grown,
  };
}

/**
 * Merge a guest's state into an account's state on claim. Most-progressed wins:
 * sum money, keep the more-grown field, union the inventory. Pure.
 */
export function mergeStates(account: PlayerState, guest: PlayerState): PlayerState {
  // Field: keep whichever side has more total growth (simple "most progressed").
  const accGrowth = totalGrowth(account.field);
  const guestGrowth = totalGrowth(guest.field);
  const field = guestGrowth > accGrowth ? guest.field : account.field;

  // Inventory: union, summing quantities.
  let inventory: Inventory = { ...account.inventory };
  for (const [id, qty] of Object.entries(guest.inventory)) {
    inventory = addItem(inventory, id, qty);
  }

  return {
    ...account,
    money: account.money + guest.money,
    field,
    inventory,
  };
}

function totalGrowth(field: Field): number {
  return field.slots.reduce((sum, c) => sum + (c?.growth ?? 0), 0);
}

/**
 * Settle time-based state as of `now`: start a fresh day (clearing the daily
 * reward/growth gate) once the 12-hour cooldown has elapsed. Pure & idempotent —
 * call once when state is loaded (and safe to call again same-day).
 */
export function settleDailyState(state: PlayerState, now: Date): PlayerState {
  if (state.daily.dayStartedAt && isNewDay(state.daily, now)) {
    return { ...state, daily: startNewDay(now) };
  }
  return state;
}
