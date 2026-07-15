-- Lingua Valley — groups (organizations)
-- A group is an organization that users belong to. For now there is exactly one
-- group ("family") and every existing user is migrated into it. Registration is
-- group-scoped via /organizations/<group id>/register, where the group id is the
-- invite token. Creating groups / an admin UI is intentionally out of scope; the
-- single group is seeded here.

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

alter table public.groups enable row level security;

-- The registration page is opened by anonymous visitors (no session yet), so it
-- must read a group by id to validate the invite link and show the group name.
-- Group id + name are not sensitive (the id IS the invite token). No write
-- policy: groups are managed via migrations for now.
drop policy if exists "groups public read" on public.groups;
create policy "groups public read" on public.groups for select using (true);

-- RLS permits the row, but anon/authenticated also need the base table
-- privilege. Grant it explicitly so anonymous invite-link visitors can read the
-- group even if project default privileges differ.
grant select on table public.groups to anon, authenticated;

-- Seed the single "family" group with a fixed id so its invite link is stable:
-- /organizations/00000000-0000-0000-0000-000000000001/register
insert into public.groups (id, name)
values ('00000000-0000-0000-0000-000000000001', 'family')
on conflict (id) do nothing;

-- Every user belongs to one group. The default + backfill migrate existing users
-- into the family group; the column is then made NOT NULL.
alter table public.profiles
  add column if not exists group_id uuid references public.groups(id)
    default '00000000-0000-0000-0000-000000000001';

update public.profiles
   set group_id = '00000000-0000-0000-0000-000000000001'
 where group_id is null;

alter table public.profiles
  alter column group_id set not null;

-- Group membership must not be self-reassignable via the client API: the
-- pre-existing "own profile update" RLS policy would otherwise let a signed-in
-- user change their own group_id. Column-level privileges restrict client writes
-- to the cosmetic columns; the security-definer trigger (running as owner) still
-- sets group_id at signup.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, display_name, avatar_color) on public.profiles to authenticated;
grant update (id, display_name, avatar_color) on public.profiles to authenticated;

-- Provision new users into the group carried by the signup metadata
-- (options.data.group_id from /organizations/:id/register), falling back to the
-- family group when the metadata is absent, malformed, or names no known group.
-- The malformed-uuid guard keeps a bad link from ever breaking account creation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  gid  uuid := '00000000-0000-0000-0000-000000000001';
  meta text := nullif(new.raw_user_meta_data->>'group_id', '');
begin
  if meta is not null then
    begin
      if exists (select 1 from public.groups where id = meta::uuid) then
        gid := meta::uuid;
      end if;
    exception when invalid_text_representation then
      null;
    end;
  end if;
  insert into public.profiles (id, group_id) values (new.id, gid) on conflict do nothing;
  insert into public.player_state (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- handle_new_user() is SECURITY DEFINER and only meaningful as a trigger; deny
-- direct client execution. (Triggers still fire regardless of EXECUTE grants.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
