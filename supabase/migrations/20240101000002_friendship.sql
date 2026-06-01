-- Friendship (rapport per NPC) + tradeable goods inventory.
-- Additive: defaults to empty objects so existing rows keep working.

alter table public.player_state
  add column if not exists rapport jsonb not null default '{}',
  add column if not exists goods   jsonb not null default '{}';
