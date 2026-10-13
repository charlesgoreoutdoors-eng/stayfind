-- =====================================================================
-- Dapples marketplace: hotel side of the database
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor (or via the CLI).
-- Idempotent where practical (IF NOT EXISTS / drop-then-create policies).
--
-- Adds:
--   profiles.is_admin        -> flag so you can approve hotels
--   public.is_admin()        -> RLS helper (SECURITY DEFINER, no recursion)
--   public.is_creator()      -> RLS helper
--   public.hotel_profiles    -> one profile per hotel user, with approval status
--   RLS on hotel_profiles    -> hotel sees/edits own; creators see approved;
--                               admins manage all
-- =====================================================================

-- 1) ADMIN FLAG -------------------------------------------------------
-- "users" = the app's profiles table (you can't add columns to auth.users).
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Grant yourself admin so you can approve hotels.
update public.profiles
  set is_admin = true
  where id = (select id from auth.users where lower(email) = 'chgore618@gmail.com');

-- hotel_profiles RLS distinguishes creators from hotels, so it needs a role
-- column. Migration 0001 adds this properly (with constraint + signup trigger);
-- this is a safe no-op if 0001 already ran, and lets 0002 stand alone if it
-- hasn't. NOTE: for new hotel sign-ups to actually get role='hotel', you still
-- need 0001's trigger or a hotel sign-up flow that sets it — the default here
-- is 'creator'.
alter table public.profiles
  add column if not exists role text not null default 'creator';


-- 2) RLS HELPER FUNCTIONS --------------------------------------------
-- SECURITY DEFINER so these read profiles WITHOUT re-triggering RLS on
-- profiles (prevents recursive-policy errors and permission surprises).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_creator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role = 'creator' from public.profiles where id = auth.uid()), false);
$$;


-- 3) HOTEL_PROFILES TABLE --------------------------------------------
create table if not exists public.hotel_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users (id) on delete cascade,

  name            text not null,              -- hotel / property name
  city            text,
  country         text,
  description     text,
  website         text,                       -- website URL
  instagram       text,                       -- Instagram URL
  logo_url        text,                       -- logo image URL
  cover_image_url text,                        -- cover image URL
  contact_name    text,
  contact_email   text,

  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Approved-profile browsing is the hot path for creators.
create index if not exists hotel_profiles_status_idx on public.hotel_profiles (status);

-- Keep updated_at fresh on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hotel_profiles_set_updated_at on public.hotel_profiles;
create trigger hotel_profiles_set_updated_at
  before update on public.hotel_profiles
  for each row execute function public.set_updated_at();


-- 4) ROW LEVEL SECURITY ----------------------------------------------
alter table public.hotel_profiles enable row level security;

-- A hotel can read its own profile (any status).
drop policy if exists "hotel reads own profile" on public.hotel_profiles;
create policy "hotel reads own profile" on public.hotel_profiles
  for select
  using (auth.uid() = user_id);

-- A hotel can create its own profile row (user_id must be itself).
drop policy if exists "hotel inserts own profile" on public.hotel_profiles;
create policy "hotel inserts own profile" on public.hotel_profiles
  for insert
  with check (auth.uid() = user_id);

-- A hotel can update only its own profile.
drop policy if exists "hotel updates own profile" on public.hotel_profiles;
create policy "hotel updates own profile" on public.hotel_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Logged-in creators can read APPROVED hotel profiles.
drop policy if exists "creators read approved profiles" on public.hotel_profiles;
create policy "creators read approved profiles" on public.hotel_profiles
  for select
  using (status = 'approved' and public.is_creator());

-- Admins can read/insert/update/delete every profile (needed to approve/reject).
drop policy if exists "admins manage all profiles" on public.hotel_profiles;
create policy "admins manage all profiles" on public.hotel_profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());
