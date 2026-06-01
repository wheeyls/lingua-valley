-- Quest progress (per-quest phase + completed steps).
-- Additive: defaults to empty object so existing rows keep working.

alter table public.player_state
  add column if not exists quests jsonb not null default '{}';
