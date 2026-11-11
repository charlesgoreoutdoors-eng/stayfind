-- =====================================================================
-- Dapples: collaboration lifecycle — Inbox messaging, offer/accept,
-- content submissions, payment, two-way reviews.
-- (applied via the Supabase MCP as "collab_lifecycle_inbox_reviews")
-- =====================================================================

-- 1) Lifecycle statuses + timestamps on applications
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('new','shortlisted','offered','booked','content_submitted','completed','declined','withdrawn'));

alter table public.applications
  add column if not exists offered_at    timestamptz,
  add column if not exists booked_at     timestamptz,
  add column if not exists paid_at       timestamptz,
  add column if not exists completed_at  timestamptz;

drop policy if exists "creators update own applications" on public.applications;
create policy "creators update own applications" on public.applications
  for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- 2) Participant helper (applying creator OR the owning hotel user)
create or replace function public.is_application_participant(app_id uuid)
returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.applications a
    join public.opportunities o  on o.id = a.opportunity_id
    join public.hotel_profiles h on h.id = o.hotel_id
    where a.id = app_id and (a.creator_id = auth.uid() or h.user_id = auth.uid())
  );
$$;

-- 3) Messages (Inbox) — one thread per application
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_application_id_idx on public.messages (application_id, created_at);
alter table public.messages enable row level security;
drop policy if exists "messages participant read" on public.messages;
create policy "messages participant read" on public.messages for select using (public.is_application_participant(application_id));
drop policy if exists "messages participant send" on public.messages;
create policy "messages participant send" on public.messages for insert with check (sender_id = auth.uid() and public.is_application_participant(application_id));

-- 4) Content submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  url text, note text, created_at timestamptz not null default now()
);
create index if not exists submissions_application_id_idx on public.submissions (application_id);
alter table public.submissions enable row level security;
drop policy if exists "submissions creator manage" on public.submissions;
create policy "submissions creator manage" on public.submissions for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());
drop policy if exists "submissions participant read" on public.submissions;
create policy "submissions participant read" on public.submissions for select using (public.is_application_participant(application_id));

-- 5) Reviews (two-way, readable by all logged-in users)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  reviewee_id uuid not null references auth.users (id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('hotel','creator')),
  rating int not null check (rating between 1 and 5),
  comment text, created_at timestamptz not null default now(),
  constraint reviews_unique_per_side unique (application_id, reviewer_id)
);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);
alter table public.reviews enable row level security;
drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own" on public.reviews for insert with check (reviewer_id = auth.uid() and public.is_application_participant(application_id));
drop policy if exists "reviews read all" on public.reviews;
create policy "reviews read all" on public.reviews for select to authenticated using (true);
