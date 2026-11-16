-- Security hardening (from the Supabase security check).

-- 1) Signed-in users could change their own plan / role / is_admin through the
--    API (the "Users own profile" policy allows updating any column of their
--    own row). Lock those columns for everyone except admins and the service role.
create or replace function public.profiles_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    new.plan     := old.plan;
    new.role     := old.role;
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update before update on public.profiles
  for each row execute function public.profiles_guard_update();

-- 2) The "mark read" policy let a recipient update any column of the other
--    party's message. Restrict recipients to changing read_at only.
create or replace function public.messages_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    new.application_id := old.application_id;
    new.sender_id      := old.sender_id;
    new.body           := old.body;
    new.created_at     := old.created_at;
  end if;
  return new;
end;
$$;
drop trigger if exists messages_guard_update on public.messages;
create trigger messages_guard_update before update on public.messages
  for each row execute function public.messages_guard_update();

-- 3) Pin search_path on functions flagged as mutable.
alter function public.applications_guard_update() set search_path = public;
alter function public.set_updated_at() set search_path = public;

-- 4) handle_new_user is a trigger function; it should not be callable over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
