-- =====================================================================
-- Dapples: signup trigger that assigns role from sign-up metadata
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor.
--
-- Makes new sign-ups get a profiles row whose role comes from the
-- sign-up metadata: { role: 'hotel' } -> hotel, anything else -> creator.
-- Needed for the hotel sign-up flow. This is the signup-trigger part of
-- migration 0001, pulled out so you can enable hotel sign-ups WITHOUT
-- committing to the tier/plan changes yet.
--
-- `on conflict (id) do update set role = excluded.role` makes this robust
-- even if another (pre-existing) trigger also inserts the profiles row:
-- whichever runs first creates it, and this guarantees the role is set.
-- full_name is only written on first insert, so an existing trigger's
-- value is preserved.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'role' = 'hotel' then 'hotel' else 'creator' end
  )
  on conflict (id) do update
    set role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
