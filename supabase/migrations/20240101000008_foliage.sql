-- Add the foliage garden column: Jorge's bonus daily practice grows a second,
-- independent garden (greenery for the shared weekly bouquet) alongside the
-- flower field.

alter table public.player_state add column if not exists foliage jsonb not null default '{"rows":[]}';
