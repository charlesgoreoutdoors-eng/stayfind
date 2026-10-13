-- =====================================================================
-- Dapples marketplace: opportunities (job board) + applications
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor.
-- Depends on: 0002 (hotel_profiles, is_admin(), is_creator(), set_updated_at()).
--
-- NOTE ON ORDER: helper functions that reference a table are defined AFTER
-- that table, because Postgres validates a SQL function body at creation.
-- =====================================================================

-- 0) HELPERS THAT ONLY TOUCH hotel_profiles (exists from 0002) ---------

-- The hotel_profiles.id owned by the current user (null for creators).
create or replace function public.my_hotel_id()
returns uuid
language sql security definer stable set search_path = public
as $$ select id from public.hotel_profiles where user_id = auth.uid(); $$;

-- Is a given hotel approved?
create or replace function public.hotel_is_approved(hid uuid)
returns boolean
language sql security definer stable set search_path = public
as $$ select exists (select 1 from public.hotel_profiles where id = hid and status = 'approved'); $$;


-- 1) OPPORTUNITIES ----------------------------------------------------
create table if not exists public.opportunities (
  id                  uuid primary key default gen_random_uuid(),
  hotel_id            uuid not null references public.hotel_profiles (id) on delete cascade,

  title               text not null,
  type                text not null check (type in ('free', 'paid')),
  payment_amount      numeric(12,2),              -- required when type = 'paid'
  currency            text,                        -- e.g. 'USD', 'AUD'
  short_description   text,
  whats_included      text,
  deliverables        text,
  location            text,
  application_deadline date,
  completion_deadline  date,                        -- when the work must be done by

  status              text not null default 'draft'
                        check (status in ('draft', 'open', 'closed')),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Paid opportunities must carry an amount.
  constraint opportunities_paid_amount_chk
    check (type <> 'paid' or payment_amount is not null)
);

create index if not exists opportunities_hotel_id_idx on public.opportunities (hotel_id);
create index if not exists opportunities_status_idx   on public.opportunities (status);

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();


-- 1a) HELPERS THAT REFERENCE opportunities (now that it exists) --------

-- Which hotel owns a given opportunity?
create or replace function public.opportunity_hotel_id(oid uuid)
returns uuid
language sql security definer stable set search_path = public
as $$ select hotel_id from public.opportunities where id = oid; $$;

-- Is a given opportunity currently open?
create or replace function public.opportunity_is_open(oid uuid)
returns boolean
language sql security definer stable set search_path = public
as $$ select exists (select 1 from public.opportunities where id = oid and status = 'open'); $$;


-- 1b) OPPORTUNITIES RLS ----------------------------------------------
alter table public.opportunities enable row level security;

-- Creators see OPEN opportunities from APPROVED hotels.
drop policy if exists "creators read open opportunities" on public.opportunities;
create policy "creators read open opportunities" on public.opportunities
  for select
  using (status = 'open' and public.is_creator() and public.hotel_is_approved(hotel_id));

-- A hotel reads its own opportunities (any status).
drop policy if exists "hotels read own opportunities" on public.opportunities;
create policy "hotels read own opportunities" on public.opportunities
  for select
  using (hotel_id = public.my_hotel_id());

-- A hotel creates its own opportunities. It may only PUBLISH (status='open')
-- if it is approved — drafts/closed are allowed regardless.
drop policy if exists "hotels insert own opportunities" on public.opportunities;
create policy "hotels insert own opportunities" on public.opportunities
  for insert
  with check (
    hotel_id = public.my_hotel_id()
    and (status <> 'open' or public.hotel_is_approved(hotel_id))
  );

-- A hotel updates its own opportunities, with the same publish rule.
drop policy if exists "hotels update own opportunities" on public.opportunities;
create policy "hotels update own opportunities" on public.opportunities
  for update
  using (hotel_id = public.my_hotel_id())
  with check (
    hotel_id = public.my_hotel_id()
    and (status <> 'open' or public.hotel_is_approved(hotel_id))
  );

-- Admins manage everything.
drop policy if exists "admins manage opportunities" on public.opportunities;
create policy "admins manage opportunities" on public.opportunities
  for all
  using (public.is_admin())
  with check (public.is_admin());


-- 2) APPLICATIONS -----------------------------------------------------
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities (id) on delete cascade,
  creator_id      uuid not null references auth.users (id) on delete cascade,

  pitch           text,
  status          text not null default 'new'
                    check (status in ('new', 'shortlisted', 'declined')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One application per creator per opportunity.
  constraint applications_unique_creator_opp unique (opportunity_id, creator_id)
);

create index if not exists applications_opportunity_id_idx on public.applications (opportunity_id);
create index if not exists applications_creator_id_idx     on public.applications (creator_id);

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

alter table public.applications enable row level security;

-- A creator reads its own applications.
drop policy if exists "creators read own applications" on public.applications;
create policy "creators read own applications" on public.applications
  for select
  using (creator_id = auth.uid());

-- A creator applies to an OPEN opportunity (one row per creator per opp is
-- enforced by the unique constraint).
drop policy if exists "creators create own applications" on public.applications;
create policy "creators create own applications" on public.applications
  for insert
  with check (
    creator_id = auth.uid()
    and public.is_creator()
    and public.opportunity_is_open(opportunity_id)
  );

-- A hotel reads applications to its own opportunities (read-only for now).
drop policy if exists "hotels read applications to own opportunities" on public.applications;
create policy "hotels read applications to own opportunities" on public.applications
  for select
  using (public.opportunity_hotel_id(opportunity_id) = public.my_hotel_id());

-- Admins manage everything.
drop policy if exists "admins manage applications" on public.applications;
create policy "admins manage applications" on public.applications
  for all
  using (public.is_admin())
  with check (public.is_admin());
