-- =====================================================================
-- Dapples: drop unused profile columns (tidy-up)
-- (applied via the Supabase MCP as "drop_unused_profile_columns")
-- ---------------------------------------------------------------------
-- The clothing/sizes fields were removed from the Account page, and the
-- stray `signature` column is superseded by `email_signature` (which the
-- Sending page and sequence sender use). All confirmed unused in the app.
-- =====================================================================

alter table public.profiles
  drop column if exists shoe_size,
  drop column if exists clothing_top,
  drop column if exists clothing_bottom,
  drop column if exists waist_size,
  drop column if exists inseam_length,
  drop column if exists signature;
