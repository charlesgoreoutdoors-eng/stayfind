-- =====================================================================
-- Dapples marketplace: denormalized applicant identity on applications
-- ---------------------------------------------------------------------
-- REVIEW BEFORE RUNNING. Run in the Supabase SQL editor.
--
-- The posting hotel can read applications to its opportunities (RLS from
-- 0004), but applications only hold creator_id — and hotels can't read
-- creators' profiles. So we capture a snapshot of the applicant's name and
-- a link (Instagram/portfolio) ON the application at apply time, which the
-- existing read policy already exposes to the hotel.
-- =====================================================================

alter table public.applications
  add column if not exists creator_name text;

alter table public.applications
  add column if not exists creator_link text;   -- Instagram or portfolio URL
