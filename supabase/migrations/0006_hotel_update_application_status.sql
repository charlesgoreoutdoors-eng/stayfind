-- =====================================================================
-- Dapples marketplace: let hotels shortlist / decline applicants
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor.
-- Depends on: 0004 (applications, opportunity_hotel_id(), my_hotel_id(),
--             is_admin()), 0005 (creator_name/creator_link columns).
--
-- Adds an UPDATE policy so a hotel can change the status of applications to
-- its OWN opportunities, plus a guard trigger so a hotel update can ONLY
-- touch `status` — pitch and the applicant snapshot stay immutable.
-- =====================================================================

-- A hotel updates applications to its own opportunities.
drop policy if exists "hotels update applications to own opportunities" on public.applications;
create policy "hotels update applications to own opportunities" on public.applications
  for update
  using (public.opportunity_hotel_id(opportunity_id) = public.my_hotel_id())
  with check (public.opportunity_hotel_id(opportunity_id) = public.my_hotel_id());

-- Guard: for any non-admin update (i.e. a hotel actioning an applicant),
-- force every column except `status` back to its previous value. Admins
-- (the "admins manage applications" policy) are unaffected.
create or replace function public.applications_guard_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  new.opportunity_id := old.opportunity_id;
  new.creator_id     := old.creator_id;
  new.pitch          := old.pitch;
  new.creator_name   := old.creator_name;
  new.creator_link   := old.creator_link;
  new.created_at     := old.created_at;
  return new;
end;
$$;

drop trigger if exists applications_guard_update on public.applications;
create trigger applications_guard_update
  before update on public.applications
  for each row execute function public.applications_guard_update();
