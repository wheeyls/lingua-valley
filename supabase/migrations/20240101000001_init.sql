-- Lingua Valley — initial schema
-- Server-authoritative economy + multiplayer-ready profiles.
-- All tables RLS-protected: a user can only read/write their own rows.
-- The server (service role) bypasses RLS to perform authoritative grants.

-- One row per player identity.
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null default 'Aprendiz',
  avatar_color  int  not null default 16763985,
  created_at    timestamptz not null default now()
);

-- Scalar resources. Authoritative source of truth for currency/focus/skills.
create table if not exists public.player_state (
  user_id       uuid primary key references auth.users on delete cascade,
  pesos         int  not null default 0,
  focus         int  not null default 100,
  focus_day     date not null default current_date,
  skills        jsonb not null default '{"speaking":0,"listening":0,"vocab":0}',
  mastered_ids  text[] not null default '{}',
  updated_at    timestamptz not null default now()
);

-- Spaced-repetition vocab cards (one per player per word).
create table if not exists public.vocab_cards (
  user_id       uuid not null references auth.users on delete cascade,
  word_id       text not null,
  ease          real not null default 2.3,
  interval_days int  not null default 0,
  reps          int  not null default 0,
  due_at        timestamptz not null default now(),
  state         text not null default 'seedling',
  primary key (user_id, word_id)
);

-- Audit log of graded activities (also powers leaderboards later).
create table if not exists public.activity_log (
  id            bigserial primary key,
  user_id       uuid not null references auth.users on delete cascade,
  npc_id        text,
  objective_id  text,
  level         text,
  communication real,
  accuracy      real,
  quality       real,
  pesos_awarded int,
  created_at    timestamptz not null default now()
);

create index if not exists activity_log_user_idx on public.activity_log (user_id, created_at desc);

-- Row Level Security ---------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.player_state enable row level security;
alter table public.vocab_cards  enable row level security;
alter table public.activity_log enable row level security;

-- Owners can read their own rows.
-- (drop-if-exists makes this migration safely re-runnable; CREATE POLICY has no
--  IF NOT EXISTS.)
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read"  on public.profiles     for select using (auth.uid() = id);
drop policy if exists "own state read" on public.player_state;
create policy "own state read"    on public.player_state for select using (auth.uid() = user_id);
drop policy if exists "own cards read" on public.vocab_cards;
create policy "own cards read"    on public.vocab_cards  for select using (auth.uid() = user_id);
drop policy if exists "own log read" on public.activity_log;
create policy "own log read"      on public.activity_log for select using (auth.uid() = user_id);

-- Owners can insert/update their own profile + (non-authoritative) reads.
drop policy if exists "own profile write" on public.profiles;
create policy "own profile write" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

-- NOTE: player_state, vocab_cards, activity_log are written by the SERVER
-- (service role, which bypasses RLS) to keep the economy authoritative.
-- Clients only SELECT these. No client write policies on purpose.

-- Auto-provision profile + player_state on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.player_state (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
