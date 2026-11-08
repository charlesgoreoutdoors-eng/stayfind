-- =====================================================================
-- Dapples: Storage bucket for hotel logos
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor.
--
-- Public bucket ("logos") hotels upload their logo into; readable via the
-- public URL. Uploads are restricted to the owner's own "<auth.uid()>/..."
-- folder. The logo URL is stored on hotel_profiles.logo_url (existing column).
-- =====================================================================

insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true)
  on conflict (id) do nothing;

drop policy if exists "logos insert own" on storage.objects;
create policy "logos insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logos update own" on storage.objects;
create policy "logos update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logos delete own" on storage.objects;
create policy "logos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
