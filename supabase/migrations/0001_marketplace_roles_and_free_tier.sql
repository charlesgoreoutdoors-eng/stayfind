-- =====================================================================
-- Dapples marketplace foundation: user roles + free creator tier
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor (or via the CLI).
-- Idempotent: safe to run more than once (uses IF NOT EXISTS / drop-then-add).
--
-- Model after this migration:
--   profiles.role : 'creator' | 'hotel'   (existing users -> 'creator')
--   profiles.plan : 'spark'  = FREE  -> marketplace / job board + applying
--                   'glow' | 'radiant' | 'founding' = PAID -> unlock outreach
--   New creators default to the free 'spark' tier.
--   Existing paying users (glow / radiant / founding) keep their plan untouched.
-- =====================================================================

begin;

-- 1) USER ROLE --------------------------------------------------------
-- Every user is a 'creator' or a 'hotel'. Existing rows become creators
-- via the column default; the UPDATE is belt-and-braces for any NULLs.
alter table public.profiles
  add column if not exists role text not null default 'creator';

update public.profiles
  set role = 'creator'
  where role is null;

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('creator', 'hotel'));


-- 2) PLAN / FREE TIER -------------------------------------------------
-- 'spark' is the free tier. New creators default to it. Any row with no
-- plan is normalised to free. Existing glow/radiant/founding are NOT
-- touched, so current paying users are unaffected.
alter table public.profiles
  alter column plan set default 'spark';

update public.profiles
  set plan = 'spark'
  where plan is null or plan = '';

alter table public.profiles
  drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('spark', 'glow', 'radiant', 'founding'));

commit;


-- 3) SIGNUP TRIGGER ---------------------------------------------------
-- Ensure every new auth user gets a profile row on the free tier, with
-- role taken from signup metadata (defaults to 'creator'; only an explicit
-- 'hotel' becomes a hotel). The column defaults above already cover plan
-- and role for any insert, so this is mainly what lets a future hotel
-- signup set role='hotel' by passing { role: 'hotel' } in signUp metadata.
--
-- NOTE: if you already have a handle_new_user() trigger, reconcile this
-- with it rather than running blindly — this version preserves full_name
-- and adds role + plan. `on conflict (id) do nothing` makes it safe even
-- if another trigger also inserts the row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, plan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'role' = 'hotel' then 'hotel' else 'creator' end,
    'spark'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
