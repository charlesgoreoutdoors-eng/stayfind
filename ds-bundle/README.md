# StayFind Design System — Claude Design Bundle

This folder is the design reference for **StayFind**, uploaded to Claude Design so the design agent builds with on-brand components, tokens, and patterns.

---

## Brand identity

StayFind is a B2B SaaS tool for UGC creators and travel influencers who research, save, and email boutique hotels at scale. The visual language is calm and trustworthy — a deep navy foundation with warm canvas neutrals and a coral accent for high-energy CTAs.

| Trait | Expression |
|---|---|
| Tone | Professional, warm, focused |
| Density | Comfortable — not cramped, not airy |
| Hierarchy | Strong: bold navy headings, muted supporting text |
| Accent use | Coral only on primary CTAs and active nav states — never decorative |

---

## Color tokens

```
--color-deep-harbour:        #0F2544   ← darkest navy, sidebar bg, primary btn
--color-deep-harbour-mid:    #1E3A5F   ← body text, headings
--color-deep-harbour-muted:  #4A6A8A   ← secondary text, ghost btn label
--color-deep-harbour-faint:  #7A9BBF   ← sidebar nav icons at rest
--color-coral-spark:         #E85D3D   ← CTA buttons, active nav highlight
--color-coral-spark-light:   #F5A882   ← active nav label text
--color-coral-spark-deep:    #B83A22   ← coral hover state
--color-warm-canvas:         #F7F3EF   ← page background
--color-warm-surface:        #F0EBE5   ← card/input section bg, ghost btn hover
--color-warm-divider:        #DDD5CC   ← borders, separators
--color-warm-card:           #FFFFFF   ← card bg, input bg
--color-slate-mist:          #9FB3C8   ← placeholder text, meta labels
--color-error-bg:            #FEF0EC   ← error input background
```

---

## Typography

Font: **Manrope** (Google Fonts). Always anti-aliased (`-webkit-font-smoothing: antialiased`).

| Class | Size | Weight | Leading | Tracking | Use |
|---|---|---|---|---|---|
| `.text-display` | 36px | 700 | 1.20 | −0.02em | Page hero titles |
| `.text-headline` | 28px | 700 | 1.25 | −0.02em | Section headings |
| `.text-title` | 22px | 600 | 1.30 | −0.01em | Panel titles, modal headers |
| `.text-body` | 15px | 400 | 1.50 | 0 | Body copy, descriptions |
| `.text-label` | 13px | 500 | 1.35 | 0 | Form labels, table cells |
| `.text-caption` | 11px | 500 | 1.30 | +0.06em | Metadata, section overlines |

---

## Spacing scale

```
--space-xs:   4px
--space-sm:   8px
--space-md:   12px
--space-lg:   16px
--space-xl:   24px
--space-2xl:  28px
--space-3xl:  40px
```

---

## Shadows

All shadows are navy-tinted (`rgba(15,37,68,…)`) — never generic black.

```
--shadow-micro:    0 1px 4px rgba(15,37,68,0.10)   ← subtle, pill active state
--shadow-low:      0 2px 12px rgba(15,37,68,0.08)  ← default card
--shadow-ambient:  0 8px 24px rgba(15,37,68,0.10)  ← modals
--shadow-overlay:  0 8px 28px rgba(15,37,68,0.14)  ← dropdowns
--shadow-lifted:   0 8px 40px rgba(15,37,68,0.12)  ← search card
--shadow-hover:    0 12px 32px rgba(15,37,68,0.13) ← card hover
--shadow-popup:    0 8px 32px rgba(15,37,68,0.16)  ← popovers
```

---

## Border radii

```
--radius-xs:    5px   ← tiny inline elements
--radius-sm:    8px   ← ghost buttons, icon buttons
--radius-md:    10px  ← inputs, nav items
--radius-lg:    12px  ← primary/coral buttons
--radius-xl:    14px  ← hotel cards
--radius-card:  20px  ← search / filter card
--radius-pill:  24px  ← pill buttons, chips
```

---

## Component patterns

### Buttons
- **Primary** (`.btn-primary`): navy `#0F2544`, 14px/700, radius 12, padding 14px 20px — main actions per screen
- **Coral** (`.btn-coral`): coral `#E85D3D`, 14px/600, radius 12, padding 9px 16px — send/launch CTAs
- **Ghost** (`.btn-ghost`): transparent bg, muted text, radius 8 — secondary/cancel actions
- **Pill** (`.btn-pill`): white card bg, 1.5px divider border, radius 24 — filter toggles. Active state: no border + micro shadow
- **Icon** buttons: transparent at rest, surface hover, radius 8 — table/list actions

### Cards
- **Hotel result card**: white bg, radius 14, `--shadow-low`, 1px border `rgba(15,37,68,0.06)`. Hover lifts −4px with `--shadow-hover`.
- **Search/filter card**: white bg, radius 20, `--shadow-lifted`, padding 24px — the main search widget.
- **Stat card**: same border/shadow as hotel card, no hover lift.

### Inputs
- Base: white bg, 1.5px `#DDD5CC` border, radius 10, padding 11px 14px, 15px Manrope.
- Focus: border becomes `#0F2544` (deep navy).
- Error: border `#E85D3D`, background `#FEF0EC`.
- Icon inputs: left icon at 13px, input padding-left 40px.
- Rich text editor: toolbar (Bold/Italic/Underline/Link/Bullets) + contenteditable body.

### Status chips
Small uppercase pill labels (11px/700, radius 20px) with a 5px dot:
- Active: `#dcfce7` bg / `#166534` text
- Pending: `#F0EBE5` / `#4A6A8A`
- Sent: `#EEF2FF` / `#4338CA`
- Opened: `#FFF7ED` / `#9A3412`
- Error: `#FEF0EC` / `#B83A22`

### Sidebar navigation
- Background: `#0F2544` (deep harbour)
- Width: 220px, padding: 0 12px 24px
- Nav items: 14px/500, icon + label, radius 10, color `#7A9BBF` at rest
- **Hover**: white 7% overlay
- **Active**: coral tint bg `rgba(232,93,61,0.18)`, label color `#F5A882`
- Child items: 13px, indented 36px from left, no icon
- Count badge on parent: Coral Spark bg pill

---

## Application structure

| Route | Description |
|---|---|
| `/` | Hotel search — location + filters, results grid |
| `/lists` | Saved lists manager — header dropdown selector, full-width hotel table |
| `/sequences/builder` | Flow builder — step cards with rich text editor + signature section |
| `/sequences/analytics` | Outreach analytics |
| `/profile` | Account settings, Gmail connection |

### Key data flows
- **Search → Add to List**: hotel saved to `list_hotels` table (Supabase)
- **Lists → Hunter contacts**: per-hotel Hunter.io lookup, multi-contact selection modal
- **Flow builder → Send**: `launch-sequence` API creates per-contact `sequence_jobs`; Gmail cron sends them with delay between steps

### Merge tags in flow body
`{{first_name}}`, `{{hotel_name}}`, `{{location}}` — replaced at send time from hotel record.

---

## Running the design sync

From your local machine (requires interactive terminal for auth):

```bash
npx claude /design-sync
```

This uploads everything in `ds-bundle/` to your Claude Design project so the design agent uses these exact tokens and patterns.
