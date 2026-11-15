-- Hotels can search/browse creators. Creators are discoverable by default and
-- can opt out from their Preferences. A "hotel" is any account that owns a
-- hotel_profiles row.

-- Opt-out flag (default: discoverable).
alter table public.profiles
  add column if not exists discoverable boolean not null default true;

-- Is the current user a hotel? (owns a hotel_profiles row)
create or replace function public.is_hotel()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.hotel_profiles where user_id = auth.uid());
$$;

-- Hotels may read discoverable creator profiles for search.
drop policy if exists "Hotels discover creators" on public.profiles;
create policy "Hotels discover creators" on public.profiles
  for select using (discoverable and public.is_hotel());

-- …and the uploaded content / media kits of a discoverable creator.
drop policy if exists "Hotels read discoverable work samples" on public.work_samples;
create policy "Hotels read discoverable work samples" on public.work_samples
  for select using (
    public.is_hotel()
    and exists (select 1 from public.profiles pr where pr.id = work_samples.user_id and pr.discoverable)
  );

drop policy if exists "Hotels read discoverable portfolios" on public.portfolios;
create policy "Hotels read discoverable portfolios" on public.portfolios
  for select using (
    public.is_hotel()
    and exists (select 1 from public.profiles pr where pr.id = portfolios.user_id and pr.discoverable)
  );

-- Helps the search filter on discoverable creators.
create index if not exists profiles_discoverable_idx on public.profiles (discoverable);
