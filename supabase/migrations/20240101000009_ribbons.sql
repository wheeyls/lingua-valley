-- Add the ribbons garden column: Maria's bonus daily "where are things"
-- practice grows a third, independent garden (the finishing touch on the
-- shared weekly bouquet) alongside the flower field and foliage.

alter table public.player_state add column if not exists ribbons jsonb not null default '{"rows":[]}';
