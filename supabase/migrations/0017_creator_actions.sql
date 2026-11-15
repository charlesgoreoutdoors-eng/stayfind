-- Hotel actions on creators from search: save to a list, invite to a job
-- (message reuses the per-application conversation once an invite exists).

-- 1) Saved creators — a hotel bookmarks creators to revisit.
create table if not exists public.saved_creators (
  hotel_user_id uuid not null references auth.users(id) on delete cascade,
  creator_id    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (hotel_user_id, creator_id)
);
alter table public.saved_creators enable row level security;

drop policy if exists "Hotels manage own saved creators" on public.saved_creators;
create policy "Hotels manage own saved creators" on public.saved_creators
  for all using (hotel_user_id = auth.uid())
  with check (hotel_user_id = auth.uid() and public.is_hotel());

-- 2) Allow an "invited" application status (hotel-initiated).
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status = any (array[
    'invited','new','shortlisted','offered','booked',
    'content_submitted','completed','declined','withdrawn'
  ]));

-- 3) Hotels may create an application (invite) for a creator on one of their
--    own OPEN opportunities. Messaging then works via is_application_participant.
drop policy if exists "hotels invite creators to own opportunities" on public.applications;
create policy "hotels invite creators to own opportunities" on public.applications
  for insert with check (
    opportunity_hotel_id(opportunity_id) = my_hotel_id()
    and opportunity_is_open(opportunity_id)
  );
