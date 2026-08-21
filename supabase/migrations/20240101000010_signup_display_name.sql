-- Lingua Valley — capture display_name at signup
--
-- Every registrant's profile was ending up with a null display_name (the
-- client-side registration form never collected one, and handle_new_user()
-- never set it), so every group member fell back to the generic "Aprendiz"
-- placeholder everywhere a name is shown — including the family checkpoint,
-- where it made every row look identical. The registration form now collects
-- a name and sends it as signup metadata alongside group_id (see
-- HtmlRegisterView.ts / SupabaseAuthGateway.register); this migration teaches
-- the trigger to read it, the same way it already reads group_id.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  gid  uuid := '00000000-0000-0000-0000-000000000001';
  meta text := nullif(new.raw_user_meta_data->>'group_id', '');
  dname text := nullif(trim(new.raw_user_meta_data->>'display_name'), '');
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
  insert into public.profiles (id, group_id, display_name)
    values (new.id, gid, coalesce(dname, 'Aprendiz'))
  on conflict do nothing;
  insert into public.player_state (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
