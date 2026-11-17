-- Monthly usage tracking for plan limits (searches, contact finds, named contacts).
-- One row per (user, kind, ref, month): repeating the same thing in a month
-- (same city, same hotel website) is only counted once.
create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('search', 'email_find', 'ig_find', 'hunter')),
  ref        text not null,
  period     text not null,                       -- 'YYYY-MM' (UTC)
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref, period)
);
create index if not exists usage_events_user_period_idx on public.usage_events (user_id, period, kind);

alter table public.usage_events enable row level security;

-- Users can read their own usage (for the usage meter). Only the server writes.
drop policy if exists "Users read own usage" on public.usage_events;
create policy "Users read own usage" on public.usage_events
  for select using (auth.uid() = user_id);
