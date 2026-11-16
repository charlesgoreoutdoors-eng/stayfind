-- Only hotels move an application forward; creators get a small set of allowed
-- transitions. Max 30 outreach emails/day on every plan.

-- 1) Creators can't create an application in any status but 'new'.
create or replace function public.applications_guard_insert()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin()
     and new.creator_id = auth.uid() then
    new.status       := 'new';
    new.offered_at   := null;
    new.booked_at    := null;
    new.paid_at      := null;
    new.completed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists applications_guard_insert on public.applications;
create trigger applications_guard_insert before insert on public.applications
  for each row execute function public.applications_guard_insert();

-- 2) Creators can only make these status changes on their own application:
--    invited -> new / withdrawn, offered -> booked, booked -> content_submitted,
--    and withdraw from anything not already finished. Shortlist / decline /
--    offer / complete stay hotel-only.
create or replace function public.applications_guard_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.opportunity_id := old.opportunity_id;
  new.creator_id     := old.creator_id;
  new.pitch          := old.pitch;
  new.creator_name   := old.creator_name;
  new.creator_link   := old.creator_link;
  new.created_at     := old.created_at;

  if coalesce(auth.role(), '') = 'authenticated' and old.creator_id = auth.uid() then
    new.offered_at   := old.offered_at;
    new.paid_at      := old.paid_at;
    new.completed_at := old.completed_at;
    if new.status is distinct from old.status then
      if not (
           (old.status = 'invited' and new.status in ('new', 'withdrawn'))
        or (old.status = 'offered' and new.status = 'booked')
        or (old.status = 'booked'  and new.status = 'content_submitted')
        or (new.status = 'withdrawn' and old.status not in ('completed', 'declined', 'withdrawn'))
      ) then
        new.status := old.status;
      end if;
    end if;
    if new.status is distinct from 'booked' and old.status is distinct from 'booked' then
      new.booked_at := old.booked_at;
    end if;
  end if;
  return new;
end;
$$;

-- 3) Cap daily_email_limit at 30 for everyone but admins, alongside the
--    plan/role/is_admin lock.
create or replace function public.profiles_guard_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    new.plan     := old.plan;
    new.role     := old.role;
    new.is_admin := old.is_admin;
    if new.daily_email_limit is not null and new.daily_email_limit > 30 then
      new.daily_email_limit := 30;
    end if;
  end if;
  return new;
end;
$$;

-- Bring any existing over-limit values down to 30.
update public.profiles set daily_email_limit = 30 where daily_email_limit > 30;
