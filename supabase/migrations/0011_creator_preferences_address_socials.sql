-- =====================================================================
-- Dapples: creator Preferences, Address and Socials fields
-- (applied via the Supabase MCP as "creator_preferences_address_socials")
-- =====================================================================

alter table public.profiles
  add column if not exists content_categories      text[],
  add column if not exists services                text[],
  add column if not exists creator_type            text,
  add column if not exists experience_level        text,
  add column if not exists audience                text,
  add column if not exists favorite_brands         text[],
  add column if not exists min_rate                numeric,
  add column if not exists open_to_gifting         boolean,
  add column if not exists open_to_product_seeding boolean,
  add column if not exists street1                 text,
  add column if not exists street2                 text,
  add column if not exists city                    text,
  add column if not exists state                   text,
  add column if not exists postal_code             text,
  add column if not exists country                 text,
  add column if not exists show_on_map             boolean default true,
  add column if not exists socials                 jsonb default '{}'::jsonb,
  add column if not exists notification_prefs      jsonb default '{}'::jsonb;
