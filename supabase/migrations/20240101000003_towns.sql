-- Journey: towns whose gatekeeper the player has beaten (producers unlocked).
-- Additive: defaults to empty array so existing rows keep working.

alter table public.player_state
  add column if not exists towns_unlocked text[] not null default '{}';
