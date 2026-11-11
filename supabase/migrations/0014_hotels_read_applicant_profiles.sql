-- Let a hotel view the full profile + uploaded content of any creator who has
-- applied to one of its opportunities. Profiles and portfolios are otherwise
-- owner-only, so without this a hotel can't open an applicant's profile.

-- True when `creator` has applied to an opportunity owned by the current user's
-- hotel. SECURITY DEFINER so the check can see applications/opportunities rows
-- the calling hotel wouldn't otherwise read directly.
create or replace function public.has_applicant(creator uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from applications a
    join opportunities o on o.id = a.opportunity_id
    join hotel_profiles h on h.id = o.hotel_id
    where a.creator_id = creator
      and h.user_id = auth.uid()
  );
$$;

-- Permissive SELECT policies (OR'd with the existing owner policies).
drop policy if exists "Hotels read applicant profiles" on public.profiles;
create policy "Hotels read applicant profiles" on public.profiles
  for select using ( public.has_applicant(id) );

drop policy if exists "Hotels read applicant portfolios" on public.portfolios;
create policy "Hotels read applicant portfolios" on public.portfolios
  for select using ( public.has_applicant(user_id) );
