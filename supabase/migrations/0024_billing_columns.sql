-- Stripe billing state, written ONLY by the server (webhook / checkout routes).
alter table public.profiles
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status    text,        -- trialing | active | past_due | canceled ...
  add column if not exists trial_end              timestamptz,
  add column if not exists current_period_end     timestamptz,
  add column if not exists cancel_at_period_end   boolean not null default false;

create unique index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

-- Users can't edit their own billing state (or plan / role / is_admin) through the API.
create or replace function public.profiles_guard_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
    new.plan                   := old.plan;
    new.role                   := old.role;
    new.is_admin               := old.is_admin;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.subscription_status    := old.subscription_status;
    new.trial_end              := old.trial_end;
    new.current_period_end     := old.current_period_end;
    new.cancel_at_period_end   := old.cancel_at_period_end;
    if new.daily_email_limit is not null and new.daily_email_limit > 30 then
      new.daily_email_limit := 30;
    end if;
  end if;
  return new;
end;
$$;
