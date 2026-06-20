-- Lingua Valley — farming loop refactor.
--
-- The game was simplified to a farming loop: the player grows a crop by having
-- daily Spanish conversations (seeds → water → store), earns money, and buys a
-- train ticket to the next area. The rich economy (focus/skills/SRS cards/
-- rapport/goods/towns/quests) is gone.
--
-- This migration reshapes player_state to the small farming-loop shape and
-- retires the now-unused tables/columns. Additive + idempotent where possible.

-- --- player_state: add the farming-loop columns ----------------------------
alter table public.player_state add column if not exists money     int   not null default 0;
alter table public.player_state add column if not exists field     jsonb not null default '{"slots":[null]}';
alter table public.player_state add column if not exists inventory jsonb not null default '{}';
alter table public.player_state add column if not exists daily      jsonb not null default '{"dayStartedAt":"","rewardedRoles":[],"objectiveState":{}}';

-- Carry over any existing currency (pesos -> money) before dropping it.
update public.player_state
   set money = coalesce(pesos, 0)
 where money = 0 and pesos is not null;

-- Drop the retired economy columns.
alter table public.player_state drop column if exists pesos;
alter table public.player_state drop column if exists focus;
alter table public.player_state drop column if exists focus_day;
alter table public.player_state drop column if exists skills;
alter table public.player_state drop column if exists mastered_ids;

-- --- retired tables --------------------------------------------------------
drop table if exists public.vocab_cards;

-- --- activity_log: money_awarded replaces pesos_awarded --------------------
alter table public.activity_log add column if not exists money_awarded int;
update public.activity_log
   set money_awarded = pesos_awarded
 where money_awarded is null and pesos_awarded is not null;
alter table public.activity_log drop column if exists pesos_awarded;
