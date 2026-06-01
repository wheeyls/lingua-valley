-- Daily-cadence loop: global daily activity counter (for diminishing returns).
-- rapport (jsonb) already exists; it now stores per-NPC Relationship records
-- ({points, lastDay, countToday}) instead of a flat number — no DDL needed for
-- that since jsonb is schemaless. Old flat-number values are migrated in code.

alter table public.player_state
  add column if not exists activities_today int  not null default 0,
  add column if not exists activity_day     date;
