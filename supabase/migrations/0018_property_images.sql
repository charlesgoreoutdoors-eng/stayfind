-- Hotels keep a library of property photos and can attach a selection to a job
-- so creators see the property while reviewing the opportunity.

-- Library of property images (owned by the hotel).
create table if not exists public.property_images (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotel_profiles(id) on delete cascade,
  url        text not null,
  file_name  text,
  file_size  bigint,
  created_at timestamptz not null default now()
);
create index if not exists property_images_hotel_idx on public.property_images (hotel_id, created_at desc);

alter table public.property_images enable row level security;
drop policy if exists "Hotels manage own property images" on public.property_images;
create policy "Hotels manage own property images" on public.property_images
  for all using (hotel_id = my_hotel_id())
  with check (hotel_id = my_hotel_id());

-- Public bucket for the images (served by public URL; owner-scoped writes).
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

drop policy if exists "property-images insert own" on storage.objects;
create policy "property-images insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "property-images update own" on storage.objects;
create policy "property-images update own" on storage.objects for update to authenticated
  using (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "property-images delete own" on storage.objects;
create policy "property-images delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Photos selected for a given opportunity (stored as public URLs so creators,
-- who already read open opportunities, see them with no extra policy).
alter table public.opportunities
  add column if not exists image_urls text[] not null default '{}';
