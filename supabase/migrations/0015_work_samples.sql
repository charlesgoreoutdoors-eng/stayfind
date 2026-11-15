-- Creators can upload examples of content they've made (images / short videos)
-- so a hotel viewing their profile can see previous work. Separate from the PDF
-- "media kits" in `portfolios`.

create table if not exists public.work_samples (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  url        text not null,
  file_name  text,
  file_type  text,                 -- 'image' | 'video'
  file_size  bigint,
  created_at timestamptz not null default now()
);

create index if not exists work_samples_user_idx on public.work_samples (user_id, created_at desc);

alter table public.work_samples enable row level security;

drop policy if exists "Users own work samples" on public.work_samples;
create policy "Users own work samples" on public.work_samples
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A hotel may read the samples of a creator who applied to one of its jobs.
drop policy if exists "Hotels read applicant work samples" on public.work_samples;
create policy "Hotels read applicant work samples" on public.work_samples
  for select using (public.has_applicant(user_id));

-- Public bucket for the media (served via public URL; owner-scoped writes).
insert into storage.buckets (id, name, public)
values ('work-samples', 'work-samples', true)
on conflict (id) do nothing;

drop policy if exists "work-samples insert own" on storage.objects;
create policy "work-samples insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'work-samples' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "work-samples update own" on storage.objects;
create policy "work-samples update own" on storage.objects for update to authenticated
  using (bucket_id = 'work-samples' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "work-samples delete own" on storage.objects;
create policy "work-samples delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'work-samples' and (storage.foldername(name))[1] = auth.uid()::text);

-- The portfolios (PDF) bucket had no write policies, so PDF uploads were being
-- blocked by RLS. Add the same owner-scoped policies; the page now uploads PDFs
-- under a per-user folder too.
drop policy if exists "portfolios insert own" on storage.objects;
create policy "portfolios insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolios' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "portfolios update own" on storage.objects;
create policy "portfolios update own" on storage.objects for update to authenticated
  using (bucket_id = 'portfolios' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "portfolios delete own" on storage.objects;
create policy "portfolios delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolios' and (storage.foldername(name))[1] = auth.uid()::text);
