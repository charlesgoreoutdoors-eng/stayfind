# Dapples — Work Log

A running log of features built, by area. Newest entries at the top. This file is
imported by `CLAUDE.md`, so it loads automatically into every Claude Code session in
this repo — it's reference context, not a task list.

Stack: Next.js 14 (App Router, client components) · Supabase (auth + Postgres + Storage + RLS) · Vercel (dapples.io).
Two-sided marketplace: **hotels** ↔ **travel creators**.

> **How to keep this current:** when a feature lands, add a short bullet under the right dated
> section (newest at top). Keep it to what a future session needs to know — files touched, the
> decision, any gotcha. This file auto-loads via `CLAUDE.md`.

---

## 2026-11 — Billing, monitoring, plan limits, legal (mobile batch)

### Stripe billing — dormant until env vars set (`lib/stripe.js`, `app/api/stripe/`, `docs/STRIPE_SETUP.md`)
- Checkout with a 14-day trial, customer portal, webhook sync, billing columns on the DB.
- Gated behind `STRIPE_SECRET_KEY` (`stripeEnabled()`); the app runs fine with Stripe unconfigured.
- Env needed to turn on: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_GLOW`,
  `STRIPE_PRICE_RADIANT`, `NEXT_PUBLIC_STRIPE_ENABLED`. Plans: **Glow** and **Radiant**.
- Migration `0024_billing_columns.sql`.

### Sentry error monitoring — opt-in (`sentry.*.config.js`, global error page)
- Does nothing unless `NEXT_PUBLIC_SENTRY_DSN` is set. (Note: non-public `SENTRY_DSN` is **not** read by the code.)

### Tiered plan limits (`0022`, `0023_usage_events.sql`)
- Monthly caps on city searches, email/IG finds, and named contacts — **server-enforced**.
- Usage meters in Settings. Search + contact APIs now require auth.

### Google API cost cuts
- No per-hotel Place Details on search; website fetched only when a hotel is added to a list;
  phone no longer fetched. Search returns only hotels inside the searched/visible map area.

### Legal & site chrome
- Public Privacy Policy (`/privacy`, incl. Google API limited-use disclosure), Terms of Service,
  Contact page (reply within 48h), site-wide footer. tawk.to removed.

### Security hardening (`0021_security_hardening.sql`)
- Lock `plan`/`role`/`is_admin` from client writes, restrict message updates, pin function `search_path`.
- Only hotels can shortlist/decline/offer. Daily email send capped at 30 on all plans.

### Dashboards & routing
- Separate dashboards: marketplace (free creators) vs outreach (paid). Login routes free creators →
  marketplace, paid → dashboard, hotels → hotel site. "New messages" card (unread from hotels);
  messages marked read when a thread is opened (`0020_messages_mark_read.sql`).

---

## 2026-11 — Creator ↔ hotel flows

### Creator · My Applications (`app/applications/page.js`)
- Job title and a "View job details →" link now open `/jobs/[id]` so creators can review the
  job they applied to. Both guard on the opportunity still existing.

### Creator · Lists (`app/lists/page.js`)
- "Find Specific Emails" → "Find Specific Contacts".
- Removed the "Need to follow up" badge/helper and the "Undo sent" button.
- "Visit website" button moved under the IG handle.
- Add / edit / remove an IG handle inline (writes `list_hotels.instagram`).
- Notes button sits directly left of Remove.

### Scraper · junk IG handle filter (`app/api/find-contact/route.js`)
- `findInstagram`'s `add()` now rejects asset filenames (`*.jpg/.png/.svg/...`) and retina
  descriptors (`2x`, `x2`) so bad scrapes like `@2x.jpg` don't surface as handles.
  Note: this blocks *future* scrapes; values already stored in the DB must be removed via the UI.

### Hotel · Find creators (`app/hotel/search/page.js`)
- Discoverable-creator search (keyword, location, categories, services, creator type, experience,
  free-stays), rating aggregation, Save (heart), "Saved only" toggle. Cards → `/hotel/creators/view/[id]`.
- **Opt-out model:** all creators with a profile are discoverable by default;
  creators opt out via `profiles.discoverable` on `app/preferences/page.js` (Visibility section).

### Hotel · creator actions (`components/CreatorActionBar.js`)
- Message / Invite-to-job / Save. Invite inserts an `applications` row with status `invited`
  (messaging is per-application, so invite + message both flow through an application).
- Modal lists the hotel's open opportunities; shows "Currently in this job" / "Invited ✓".

### Hotel · Saved creators (`app/hotel/saved/page.js`)
- List of bookmarked creators (`saved_creators`). View + Remove. Handles opted-out creators gracefully.

### Hotel · Jobs (`app/hotel/jobs/page.js`)
- Jobs rendered as a **table** (Opportunity, Type, Apply by, Status, Applicants, Actions), widened to 1120px.
- Create/edit form has a property-photo picker (`form.image_urls`).

### Hotel · Property photos (`app/hotel/profile/photos/page.js`)
- Photo library: drag-and-drop upload to the `property-images` bucket, gallery, delete-with-confirm,
  **drag-to-reorder** (persists `property_images.position`).
- Attached photos appear to creators on the job detail page (`app/jobs/[id]/page.js`) as a gallery,
  via `opportunities.image_urls text[]`.

### Hotel · profile & settings
- Top-right avatar dropdown (`components/HotelProfileMenu.js`) + settings tabs
  (`components/HotelAccountTabs.js`): Profile, Property photos, Contact, Notifications, Security.
- Profile page removed from the sidebar (kept in the top-right icon).

---

## Conventions & gotchas (read before building)

- **RLS + SECURITY DEFINER helpers:** `is_hotel()`, `my_hotel_id()` (→ `hotel_profiles.id`),
  `opportunity_hotel_id()`, `opportunity_is_open()`, `is_application_participant()` (creator OR owning hotel),
  `is_creator()`, `has_applicant()`.
- **Messaging is strictly per-application** (`messages.application_id NOT NULL`). Invites = an application
  with status `invited`. Unique `(opportunity_id, creator_id)` — handle `23505` by fetching the existing row.
- **Design tokens are CSS vars** (`--color-ink-primary`, `--color-action-forest`, `--color-ground-page/card/sand`,
  `--status-*`, `--color-accent-amber-deep`, …). Use `var(--color-ground-page)` for light-on-dark text/icons
  (not `#fff` — flagged by the impeccable design hook).
- **`hotel_profiles.name` is NOT NULL** — tabbed sub-pages must preserve the existing name on upsert.
- **Commits go directly to `main`.** Stage specific file paths (not `git add -A`) — `.DS_Store`, `.claude/`,
  `.impeccable/` are not gitignored. Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Verify builds** with `npm run build` and look for `✓ Compiled successfully`.
- **Migrations** live in `supabase/migrations/` (…0016 creator search, 0017 creator actions,
  0018 property images, 0019 position, 0020 mark-read, 0021 security hardening,
  0022 status/email limits, 0023 usage events, 0024 billing columns). **0020–0024 are already
  applied to the live DB — don't re-run them.**
- **Optional env** (features stay dormant without them): Stripe (`STRIPE_*`, `NEXT_PUBLIC_STRIPE_ENABLED`),
  Sentry (`NEXT_PUBLIC_SENTRY_DSN`), email (`SMTP_*`, `NOTIFY_FROM`), Gmail, ConvertKit, `CRON_SECRET`.
  Required: Supabase + Google Places + Hunter + Browserless keys.
- zsh: quote bracketed paths, e.g. `"app/hotel/creators/[id]/page.js"`.
