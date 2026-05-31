/**
 * SupabasePlayerRepository — PlayerStateRepository over Supabase Postgres.
 *
 * Reads are RLS-scoped to the signed-in user. Writes here cover the
 * non-authoritative path (profile/cosmetics + a full snapshot save used during
 * guest→account claim); the per-activity authoritative grants go through the
 * server (/api/activity/complete). Contains no game rules — only mapping.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlayerStateRepository } from "../domain/ports";
import type { PlayerState } from "../domain/player";
import {
  rowsToPlayerState,
  playerStateToRow,
  cardsToRows,
  type ProfileRow,
  type PlayerStateRow,
  type VocabCardRow,
} from "./supabaseMappers";

export class SupabasePlayerRepository implements PlayerStateRepository {
  constructor(
    private readonly sb: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<PlayerState | null> {
    const [profile, state, cards] = await Promise.all([
      this.sb.from("profiles").select("id,display_name,avatar_color").eq("id", this.userId).maybeSingle(),
      this.sb
        .from("player_state")
        .select("user_id,pesos,focus,focus_day,skills,mastered_ids")
        .eq("user_id", this.userId)
        .maybeSingle(),
      this.sb.from("vocab_cards").select("*").eq("user_id", this.userId),
    ]);

    if (!state.data) return null; // not provisioned yet
    return rowsToPlayerState(
      (profile.data as ProfileRow) ?? null,
      state.data as PlayerStateRow,
      (cards.data as VocabCardRow[]) ?? [],
    );
  }

  /**
   * Save a full snapshot. Used for profile updates and claim-merge. Per-turn
   * economy changes are written authoritatively by the server instead.
   */
  async save(state: PlayerState): Promise<void> {
    await this.sb.from("profiles").upsert({
      id: this.userId,
      display_name: state.displayName,
      avatar_color: state.avatarColor,
    });

    await this.sb.from("player_state").upsert(playerStateToRow(this.userId, state));

    const cardRows = cardsToRows(this.userId, state);
    if (cardRows.length > 0) {
      await this.sb.from("vocab_cards").upsert(cardRows);
    }
  }
}
