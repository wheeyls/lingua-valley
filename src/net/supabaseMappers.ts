/**
 * Row ⇄ domain mappers. Persistence shape is NOT the domain shape: these
 * functions translate Supabase rows into the domain PlayerState and back.
 * The domain never imports these row types.
 *
 * The farming-loop state is small enough to persist as a single row with a few
 * jsonb columns (field, inventory, daily).
 */

import type { PlayerState } from "../domain/player.js";
import { initialPlayerState, normalizePlayerState } from "../domain/player.js";
import type { Field } from "../domain/field.js";
import type { Inventory } from "../domain/inventory.js";
import type { DailyState } from "../domain/dailyLoop.js";

export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_color: number;
}

export interface PlayerStateRow {
  user_id: string;
  money: number;
  field: Field | null;
  inventory: Inventory | null;
  daily: DailyState | null;
}

export function rowsToPlayerState(
  profile: ProfileRow | null,
  state: PlayerStateRow | null,
): PlayerState {
  const base = initialPlayerState(
    profile?.display_name ?? "Aprendiz",
    profile?.avatar_color ?? 0xffc7d1,
  );
  if (!state) return base;

  // Run the row through normalize so partial/old rows load cleanly.
  return normalizePlayerState({
    displayName: base.displayName,
    avatarColor: base.avatarColor,
    money: state.money,
    field: state.field,
    inventory: state.inventory,
    daily: state.daily,
  });
}

export function playerStateToRow(userId: string, s: PlayerState): PlayerStateRow {
  return {
    user_id: userId,
    money: s.money,
    field: s.field,
    inventory: s.inventory,
    daily: s.daily,
  };
}
