-- =====================================================================
-- Dapples marketplace: creators can read opportunities they applied to
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor.
-- Depends on: 0004 (opportunities, applications, is_creator()).
--
-- The "creators read open opportunities" policy only exposes OPEN opps from
-- approved hotels. So once a hotel closes an opportunity, the creators who
-- applied would lose sight of it on their "My applications" page. This adds
-- a second SELECT policy: a creator may also read any opportunity they have
-- an application for, regardless of its current status.
-- =====================================================================

-- SECURITY DEFINER so the check doesn't recurse through applications' RLS.
create or replace function public.has_applied(oid uuid)
returns boolean
language sql security definer stable set search_path = public
as $$ select exists (
  select 1 from public.applications where opportunity_id = oid and creator_id = auth.uid()
); $$;

drop policy if exists "creators read applied opportunities" on public.opportunities;
create policy "creators read applied opportunities" on public.opportunities
  for select
  using (public.is_creator() and public.has_applied(id));
