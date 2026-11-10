-- =====================================================================
-- Dapples: creator account/profile fields + avatars bucket
-- ---------------------------------------------------------------------
-- Adds the fields on the Account page and a public "avatars" bucket for
-- profile photos. Creators already have full update access to their own
-- profiles row ("Users own profile" policy).
-- =====================================================================

alter table public.profiles
  add column if not exists username        text,
  add column if not exists first_name      text,
  add column if not exists last_name       text,
  add column if not exists gender          text,
  add column if not exists headline        text,
  add column if not exists portfolio_url   text,
  add column if not exists phone           text,
  add column if not exists bio             text,
  add column if not exists avatar_url      text,
  add column if not exists shoe_size       text,
  add column if not exists clothing_top    text,
  add column if not exists clothing_bottom text,
  add column if not exists waist_size      text,
  add column if not exists inseam_length   text;

alter table public.profiles drop constraint if exists profiles_gender_chk;
alter table public.profiles add constraint profiles_gender_chk
  check (gender is null or gender in ('male', 'female', 'non_binary', 'prefer_not'));

-- Avatars bucket (public; owner-scoped uploads under "<auth.uid()>/...")
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true) on conflict (id) do nothing;

drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
