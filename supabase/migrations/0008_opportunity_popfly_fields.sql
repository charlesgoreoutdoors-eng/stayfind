-- =====================================================================
-- Dapples marketplace: richer opportunity fields + brief uploads
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor.
-- Depends on: 0004 (opportunities).
--
-- Adds the Popfly-style fields and a Storage bucket ("briefs") hotels can
-- upload a creative brief file into. Categories were intentionally dropped.
-- =====================================================================

-- 1) NEW OPPORTUNITY COLUMNS -----------------------------------------
alter table public.opportunities
  add column if not exists other_compensation   text,          -- e.g. "free stay + $300 product credit"
  add column if not exists description           text,          -- full campaign description (long)
  add column if not exists social_handles        text,          -- hashtags & mentions
  add column if not exists cta_link              text,          -- brand CTA / booking link
  add column if not exists service               text,          -- engagement type (see check below)
  add column if not exists content_license_until date,          -- license expiry
  add column if not exists brief_url             text,          -- public URL of the uploaded brief
  add column if not exists brief_name            text;          -- original filename for display

-- Allowed Service values (nullable; app sends one of these).
alter table public.opportunities drop constraint if exists opportunities_service_chk;
alter table public.opportunities add constraint opportunities_service_chk
  check (service is null or service in (
    'sponsored_collab', 'gifting', 'affiliate', 'ugc', 'photography_paid', 'videography_paid'
  ));


-- 2) STORAGE BUCKET FOR CREATIVE BRIEFS ------------------------------
-- Public bucket: briefs are downloadable via their public URL (no select
-- policy needed). Uploads are restricted to the owner's own folder.
insert into storage.buckets (id, name, public)
  values ('briefs', 'briefs', true)
  on conflict (id) do nothing;

-- A hotel can upload/replace/remove briefs only under its own user-id folder
-- (we store objects as "<auth.uid()>/<filename>").
drop policy if exists "briefs insert own" on storage.objects;
create policy "briefs insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'briefs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "briefs update own" on storage.objects;
create policy "briefs update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'briefs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "briefs delete own" on storage.objects;
create policy "briefs delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'briefs' and (storage.foldername(name))[1] = auth.uid()::text);
