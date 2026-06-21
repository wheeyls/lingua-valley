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
import {
  makeField,
  waterField,
  plantSeed,
  hasEmptySlot,
  harvest,
  readySlots,
  type Field,
  type Slot,
} from "./field.js";
import {
  emptyInventory,
  add as addItem,
  has as hasItem,
  ticketId,
  type Inventory,
} from "./inventory.js";

/** Money paid per harvested crop sold at the store. */
export const CROP_VALUE = 25;

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
  /**
   * The crop theme to plant when a SEEDS conversation completes (the lesson id).
   * Ignored for other roles. Required for planting to be authoritative.
   */
  theme?: string;
  /**
   * Outputs this conversation produced (e.g. { storyText }) to record in the
   * daily objectiveState so dependent objectives unlock + receive inputs. Stored
   * authoritatively so it survives a refresh.
   */
  outputs?: Record<string, string>;
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
  /** True if this completion planted a crop (seeds role, first of the day). */
  planted: boolean;
  /** Number of crops sold at the store (store role, first of the day). */
  sold: number;
  /** Money received from selling. */
  soldValue: number;
}

/**
 * THE core reducer: apply a graded conversation to a player's state.
 *
 * Pure and deterministic — the caller supplies `now`. This single function is
 * the authoritative step; the server and the guest path both call it,
 * guaranteeing identical rules everywhere.
 *
 * Rules (all gated to the first qualifying completion per day):
 *  - Money is awarded once per OBJECTIVE per day (so a two-person practice pays
 *    for both conversations); replays earn nothing.
 *  - SEEDS plants a crop (once per day per role).
 *  - WATER grows the field +1 unit (once per day per role, so the field only
 *    advances one step a day regardless of how many water chats).
 *  - STORE harvests ready crops and pays out CROP_VALUE each (once per day).
 *
 * Doing the field side-effects HERE (not in the UI) keeps them authoritative:
 * the server persists them, and the guest path runs the identical logic.
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
  let money = earnedReward ? prev.money + reward.money : prev.money;

  let field = prev.field;
  let daily = prev.daily;
  let grown = 0;
  let planted = false;
  let sold = 0;
  let soldValue = 0;

  // SEEDS: plant a crop the first time the seeds role completes today.
  if (
    activity.role === "seeds" &&
    roleEarnsReward(prev.daily, "seeds") &&
    hasEmptySlot(field)
  ) {
    field = plantSeed(field, activity.theme ?? "crop", day);
    planted = true;
    daily = claimRole(daily, "seeds", now);
  }

  // WATER: grow the whole field once per day.
  if (activity.role === "water" && roleEarnsReward(prev.daily, "water")) {
    const watered = waterField(field, day);
    field = watered.field;
    grown = watered.grown;
    if (grown > 0) daily = claimRole(daily, "water", now);
  }

  // STORE: harvest ready crops and pay out, once per day.
  if (activity.role === "store" && roleEarnsReward(prev.daily, "store")) {
    const ready = readySlots(field);
    if (ready.length > 0) {
      const result = harvest(field);
      field = result.field;
      sold = result.harvested.length;
      soldValue = sold * CROP_VALUE;
      money += soldValue;
      daily = claimRole(daily, "store", now);
    }
  }

  // Claim the objective's money for today (gates future replays).
  if (earnedReward) daily = claimObjective(daily, activity.objectiveId, now);

  // Record this objective's completion + outputs in the daily objectiveState so
  // dependent objectives unlock and receive inputs — persisted authoritatively
  // so it survives a refresh. Outputs are refreshed each turn (they accumulate
  // as the conversation grows, e.g. the story text); the completion timestamp is
  // kept from the first turn.
  {
    const existing = daily.objectiveState[activity.objectiveId];
    daily = {
      ...daily,
      objectiveState: {
        ...daily.objectiveState,
        [activity.objectiveId]: {
          completedAt: existing?.completedAt ?? now.toISOString(),
          outputs: activity.outputs ?? existing?.outputs ?? {},
        },
      },
    };
  }

  return {
    state: { ...prev, money, field, daily },
    reward,
    earnedReward,
    grown,
    planted,
    sold,
    soldValue,
  };
}

/**
 * A non-conversation player action that must persist authoritatively. Kept
 * minimal: today only buying a train ticket. Like ActivityResult, this is the
 * wire shape the server and guest both reduce with `applyPlayerAction`.
 */
export interface PlayerAction {
  type: "buy-ticket";
  /** The area the ticket travels to. */
  areaId: string;
  /** Ticket price (validated against the player's money). */
  price: number;
}

export interface ActionResult {
  state: PlayerState;
  /** Whether the action succeeded (e.g. enough money, not already owned). */
  ok: boolean;
  /** Reason when `ok` is false (for UI messaging). */
  reason?: "insufficient-funds" | "already-owned" | "unknown-action";
}

/**
 * THE authoritative reducer for non-conversation actions. Pure & deterministic.
 * The server runs this and persists; the guest path runs the same function.
 */
export function applyPlayerAction(
  prev: PlayerState,
  action: PlayerAction,
): ActionResult {
  if (action.type === "buy-ticket") {
    const id = ticketId(action.areaId);
    if (hasItem(prev.inventory, id)) {
      return { state: prev, ok: false, reason: "already-owned" };
    }
    if (prev.money < action.price) {
      return { state: prev, ok: false, reason: "insufficient-funds" };
    }
    return {
      state: {
        ...prev,
        money: prev.money - action.price,
        inventory: addItem(prev.inventory, id),
      },
      ok: true,
    };
  }
  return { state: prev, ok: false, reason: "unknown-action" };
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
