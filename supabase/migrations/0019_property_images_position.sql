-- Let hotels order their property photos (drag to reorder).
alter table public.property_images
  add column if not exists position integer not null default 0;

-- Backfill a stable initial order per hotel from upload time (newest first,
-- matching how the page currently lists them).
with ranked as (
  select id, row_number() over (partition by hotel_id order by created_at desc) - 1 as rn
  from public.property_images
)
update public.property_images p
set position = ranked.rn
from ranked
where ranked.id = p.id;

create index if not exists property_images_order_idx on public.property_images (hotel_id, position);
