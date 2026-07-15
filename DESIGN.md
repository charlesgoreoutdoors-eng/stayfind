---
name: StayFind
description: Hotel outreach platform for solo creators managing brand partnerships
colors:
  deep-harbour: "#0F2544"
  deep-harbour-mid: "#1E3A5F"
  deep-harbour-muted: "#4A6A8A"
  deep-harbour-faint: "#7A9BBF"
  coral-spark: "#E85D3D"
  coral-spark-light: "#F5A882"
  coral-spark-deep: "#B83A22"
  warm-canvas: "#F7F3EF"
  warm-surface: "#F0EBE5"
  warm-divider: "#DDD5CC"
  warm-card: "#FFFFFF"
  slate-mist: "#9FB3C8"
  error-bg: "#FEF0EC"
  # ── Dapples brand palette (golden-hour) — marketing / new surfaces (dapples.io) ──
  dapple-ink: "#2B2722"
  dapple-ink-muted: "#6B6258"
  dapple-ink-faint: "#9C9388"
  dapple-placeholder: "#B6AD9C"
  dapple-border: "#DDD0B8"
  dapple-sand: "#F3E7CF"
  dapple-nav-tint: "#FBF0DA"
  dapple-cream: "#FBF5EA"
  dapple-card: "#FFFCF4"
  dapple-forest: "#44503A"
  dapple-forest-deep: "#363F2E"
  dapple-amber: "#E0954A"
  dapple-amber-deep: "#B5702E"
  dapple-amber-deeper: "#8B5E2A"
  dapple-terracotta: "#C96E3C"
  dapple-olive: "#C9D1A8"
  dapple-olive-mid: "#8B9A6A"
  dapple-glow-gold: "#F4C97A"
  dapple-glow-honey: "#F0B979"
  dapple-glow-amber: "#E5A04A"
  dapple-glow-pale: "#FDEBBE"
  dapple-glow-ember: "#EBA94E"
  dapple-sand-dot: "#ECD9B8"
  dapple-url-grey: "#C8C2B2"
typography:
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0em"
  caption:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.06em"
  # ── Dapples brand type (golden-hour) — Quicksand display + Nunito Sans body ──
  dapple-display:
    fontFamily: "Quicksand, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 2.875rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  dapple-body:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
rounded:
  xs: "5px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  card: "20px"
  pill: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "28px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.deep-harbour}"
    textColor: "{colors.warm-canvas}"
    rounded: "{rounded.lg}"
    padding: "14px 20px"
  button-primary-hover:
    backgroundColor: "#162F54"
    textColor: "{colors.warm-canvas}"
  button-coral:
    backgroundColor: "{colors.coral-spark}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: "9px 16px"
  button-coral-hover:
    backgroundColor: "{colors.coral-spark-deep}"
    textColor: "#FFFFFF"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.deep-harbour-muted}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
  button-pill:
    backgroundColor: "{colors.warm-card}"
    textColor: "{colors.deep-harbour}"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
  input-search:
    backgroundColor: "{colors.warm-card}"
    textColor: "{colors.deep-harbour}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.deep-harbour-faint}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "rgba(232,93,61,0.18)"
    textColor: "{colors.coral-spark-light}"
---

# Design System: StayFind

## 1. Overview

**Creative North Star: "The Boutique Concierge"**

StayFind carries the feeling of a great hotel front desk: quietly confident, warm before you even ask, never flustered. The interface knows what you need and has it ready. It does not announce itself — it recedes, and the creator's work comes forward. Every design decision should answer the question: does this feel like a trusted expert, or like a piece of software?

The color strategy is **restrained**: Deep Harbour navy grounds the system with authority, Coral Spark activates the things that matter (primary action, current state, brand identity), and a warm off-white canvas keeps everything breathable. Nothing on this tool fights for attention. The hierarchy is earned through weight, spacing, and the controlled use of color — not size competitions or decorative flourish.

Notion is the reference for editorial calm; the anti-references are clear. This is not generic SaaS blue (HubSpot's exhausted CRM blue, enterprise density). It is not creator-pink softness (Flodesk, Later). It is not a travel booking engine (consumer UI conventions don't apply here). It is a tool a creator reaches for between trips — purposeful, premium, and invisible.

**Key Characteristics:**
- Dark navy sidebar anchors authority without aggression
- Warm canvas body keeps the workspace inviting, not clinical
- Coral Spark used only where it matters: primary actions, active states, brand mark
- Manrope carries the full hierarchy — one family, multiple weights, no pairing needed
- Shadows are navy-tinted, not generic black — every drop of depth belongs to the brand

## 2. Colors: The Boutique Palette

A two-register palette: authority from the navy ramp, warmth from the coral and canvas tones. The accent earns its keep.

### Primary
- **Deep Harbour** (`#0F2544`): The foundation. Sidebar background, primary buttons, map markers, the brand mark. Used wherever the tool needs to say "I'm in charge" without raising its voice.
- **Deep Harbour Mid** (`#1E3A5F`): Body text on light backgrounds, headings, data values. The ink color.
- **Coral Spark** (`#E85D3D`): The accent. Active nav states, primary CTAs, the logo icon, search-area pill, progress indicators. Used at ≤15% of any given screen surface. Its rarity is the point.

### Secondary
- **Coral Spark Light** (`#F5A882`): Active nav label text, highlight states on the dark sidebar. The soft version of Coral Spark for use on navy backgrounds.
- **Coral Spark Deep** (`#B83A22`): Error text, destructive confirmation states. Never decorative.

### Neutral
- **Warm Canvas** (`#F7F3EF`): Page background. Slightly warm (not cream/beige AI-default — it leans toward the coral hue, not toward warmth-by-default).
- **Warm Surface** (`#F0EBE5`): Tab count chips, secondary surfaces. One step warmer/darker than canvas.
- **Warm Divider** (`#DDD5CC`): All borders, input outlines, card strokes. Warm, not cool-gray.
- **White** (`#FFFFFF`): Cards, input fields, dropdown panels, the content surface. Pure white over the warm canvas creates the gentle separation between content and page.
- **Slate Mist** (`#9FB3C8`): Placeholder text, decorative separators, and icon fills only. **Not for body text** — fails WCAG AA at small sizes on white. Use Deep Harbour Muted (`#4A6A8A`) for secondary text that must be readable.
- **Deep Harbour Muted** (`#4A6A8A`): Inactive nav labels, subdued body text.
- **Error Background** (`#FEF0EC`): Error state backgrounds. Pairs with Coral Spark Deep for text.

### Named Rules
**The Coral Ration Rule.** Coral Spark (`#E85D3D`) appears on at most two elements at the same time on any given screen. Primary button OR active nav item OR brand mark — not all three at once. Overuse collapses the accent's authority.

**The Navy Shadow Rule.** All `box-shadow` values use `rgba(15, 37, 68, ...)` as their color base, never generic `rgba(0, 0, 0, ...)`. Shadows are navy-tinted. Generic black shadows belong to other tools.

### Dapples Brand (Golden-Hour) — marketing / new surfaces

The go-forward brand for public-facing and new surfaces (`dapples.io`, the waitlist, landing pages). A warm golden-hour system: soft cream grounds, deep-forest actions, and scattered amber/olive light. Distinct from the StayFind app chrome above — do not mix the two on the same surface.

**Ink & grounds**
- **Dapple Ink** (`#2B2722`): Primary text and headings.
- **Dapple Ink Muted** (`#6B6258`) / **Dapple Ink Faint** (`#9C9388`): Subtext and tertiary labels.
- **Dapple Cream** (`#FBF5EA`): Page background. **Dapple Card** (`#FFFCF4`): raised cards. **Dapple Nav Tint** (`#FBF0DA`) / **Dapple Sand** (`#F3E7CF`): nav and section bands.
- **Dapple Border** (`#DDD0B8`): input and card strokes. **Dapple Placeholder** (`#B6AD9C`): placeholder text.

**Actions & accents**
- **Dapple Forest** (`#44503A`) → **Dapple Forest Deep** (`#363F2E`) on hover: primary buttons, browser-chrome bars.
- **Dapple Amber** (`#E0954A`), **Amber Deep** (`#B5702E`), **Amber Deeper** (`#8B5E2A`), **Terracotta** (`#C96E3C`): warm highlights, "Dapples" comparison column, step badges, selection.
- **Dapple Olive** (`#C9D1A8`) / **Olive Mid** (`#8B9A6A`): cool counterpoint dots and accents.

**Golden-hour glow (decorative only)**
- **Glow Gold** (`#F4C97A`), **Honey** (`#F0B979`), **Amber** (`#E5A04A`), **Pale** (`#FDEBBE`), **Ember** (`#EBA94E`): blurred light orbs behind heroes and the wordmark. Never text or fills. Plus **Sand Dot** (`#ECD9B8`) and **URL Grey** (`#C8C2B2`) for the browser-mockup chrome.

**The Two-Brand Rule.** StayFind (navy/coral) dresses the logged-in app; Dapples (cream/forest/amber) dresses marketing and new public surfaces. A single page picks one brand and commits — never blend the two palettes.

## 3. Typography

**Body / Display Font:** Manrope (loaded via `next/font/google`, 400–700, variable)

**Character:** A single family doing every job: data tables at 13px and page titles at 36px, both legible, both on-brand. Manrope's open apertures and distinctive letter forms give it warmth without softness. It reads faster than it looks, which suits a creator in a workflow. No serif pairing needed — that would add editorial complexity without adding utility.

### Hierarchy
- **Display** (700, 2.25rem / 36px, leading 1.2, tracking −0.02em): Empty state headings, welcome messages. Appears rarely — only when there's nothing else on screen.
- **Headline** (700, 1.75rem / 28px, leading 1.25, tracking −0.02em): Page titles (e.g. "Search Results", "Your Lists").
- **Title** (600, 1.375rem / 22px, leading 1.3, tracking −0.01em): Section headings, results headers.
- **Body** (400, 0.9375rem / 15px, leading 1.5): All prose, table cells, email preview text. `max-width: 65ch` on any paragraph block.
- **Label** (500, 0.8125rem / 13px, leading 1.35): Secondary UI — table column headers, form field hints, hotel card metadata. The workhorse size.
- **Caption** (500, 0.6875rem / 11px, leading 1.3, tracking +0.06em): Tiny meta — chip counts, status tags, timestamp dates. Use sparingly; below this is inaccessible.

### Named Rules
**The One Family Rule.** Within the **StayFind app**, Manrope carries the entire type system. Do not introduce a second typeface — not a serif for "warmth", not a display face for "personality". Hierarchy is created through weight contrast (400 vs 700) and size contrast (13px vs 22px), not family contrast.

**The Dapples Pairing Rule.** **Dapples** marketing/new surfaces pair **Quicksand** (display — the rounded-geometric wordmark and headings) with **Nunito Sans** (humanist body). This pairing is scoped to Dapples per the Two-Brand Rule and never appears inside the StayFind app; likewise Manrope never dresses a Dapples page.

**The 500-On-Dark Rule.** Any text appearing on the Deep Harbour navy sidebar must be weight 500 or above. The perceived weight of light-colored text on a dark background drops by one notch; compensate.

## 4. Elevation

Elevation is **structural, not decorative**. Shadows appear in response to hierarchy: content that floats above the page (cards, dropdowns, modals, map popups) has a shadow. Static surface content does not. All shadows are navy-tinted — see The Navy Shadow Rule.

### Shadow Vocabulary
- **Micro** (`0 1px 4px rgba(15,37,68,0.10)`): Toggle group active pill, segmented control selection. Barely there; shows which segment is "in".
- **Low** (`0 2px 12px rgba(15,37,68,0.08)`): Hotel cards, map container, results list rows. Resting state; content is lifted off the canvas but not floating.
- **Ambient** (`0 8px 24px rgba(15,37,68,0.10)`): Google Places autocomplete dropdown, PAC container. Content that appears over other content.
- **Overlay** (`0 8px 28px rgba(15,37,68,0.14)`): List dropdowns, "Add to List" panel. Stronger than ambient; these are interruptive elements.
- **Lifted** (`0 8px 40px rgba(15,37,68,0.12)`): Search hero card. The primary workspace entry point — emphasised but not dramatic.
- **Hover** (`0 12px 32px rgba(15,37,68,0.13)`): Hotel card on hover (`translateY(-4px)` paired). Shadow and transform travel together.
- **Popup** (`0 8px 32px rgba(15,37,68,0.16)`): Map detail popup. Highest on the in-page z-stack that isn't a modal.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are shadowless at rest unless they are interactive cards or floating elements. Do not add shadows to headers, nav items, input fields, or static sections for "depth". Depth is earned by position in the hierarchy, not sprinkled for decoration.

## 5. Components

### Buttons
Warm and tactile: clear weight, confident press, never flat or ghostly by default.
- **Shape:** Gently rounded (12px / `{rounded.lg}`) for primary and coral buttons; pill (24px) for filter tabs and area-search actions
- **Primary (navy):** Deep Harbour background (`#0F2544`), Warm Canvas text (`#F7F3EF`), 14px vertical padding. Full-width within search card. Darkens slightly on hover.
- **Primary (coral):** Coral Spark background (`#E85D3D`), white text. Used for secondary CTAs that need energy but not the full authority of navy. Coral Spark Deep on hover.
- **Ghost / toolbar:** Transparent background, Deep Harbour Muted text, 8px radius. Used for map/list view toggles, sub-action buttons.
- **Pill tab:** White background, Deep Harbour text, 24px radius, Warm Divider border. Becomes active with white background + micro shadow. Used for Hotels / Vacation Rentals / Apartments tabs.
- **Transitions:** `0.15s` on all state changes. No bounce, no spring.

### Cards
Cards are reserved for content that benefits from containment: hotel search results, search hero widget.
- **Hotel Card:** 14px radius, white background, Low shadow at rest, Hover shadow on `:hover` paired with `translateY(-4px)`. 1px Warm Divider-tinted border (`rgba(15,37,68,0.06)`). Internal padding 16px/18px.
- **Search Card:** 20px radius, white background, Lifted shadow. Max-width 640px. Floats 32px above the map hero via negative margin.
- **Inner containers:** Flat; no shadow on nested elements. Nested cards are prohibited.

### Inputs / Fields
- **Style:** White background, 1.5px Warm Divider border (`#DDD5CC`), 10–12px radius. Body font, 15px, Deep Harbour Mid text.
- **Focus:** Border shifts to Deep Harbour (`#0F2544`) at full opacity. No glow — the border darkening is the signal.
- **Placeholder:** Slate Mist (`#9FB3C8`).
- **Search Input:** Housed inside a card widget; the input itself has no visible border — the card provides the containment.

### Navigation (Sidebar)
- **Background:** Deep Harbour (`#0F2544`), fixed 220px wide, sticky on desktop, slide-in drawer on mobile.
- **Nav items:** 10px radius, 10px/12px padding. Inactive: transparent background, Deep Harbour Faint icons (`#4A6A8A`), Deep Harbour Muted label (`#7A9BBF`), weight 500.
- **Active state:** `rgba(232,93,61,0.18)` background tint, Coral Spark Light label (`#F5A882`), Coral Spark Light icon. No left-side stripe — background tint only.
- **Child items:** Indented 42px, 13px label, dot indicator (4px circle). Active dot is Coral Spark Light; inactive is Deep Harbour medium (`#2D5A8A`).
- **Logo:** Coral Spark icon square (32px, 8px radius) + "StayFind" wordmark at 16px/700, Warm Canvas text.
- **Mobile:** Hamburger in top bar, overlay drawer, `transform: translateX(-100%)` → `translateX(0)` at `0.25s ease`.

### Chips / Tags
- **Filter pill (tabs):** White background, Deep Harbour text, Warm Divider border (1.5px), 24px radius. Active: white + Micro shadow, no border. Count badge: Warm Surface background (`#F0EBE5`), 11px/700.
- **Status tags:** Small inline chips for sequence status (Sending Soon, Active, Completed). Navy tint backgrounds with corresponding text.

### Skeleton / Loading States
- **Shimmer:** Two-tone warm gradient (`#EDE8E3` → `#E2DBD5` → `#EDE8E3`) animated at `1.4s infinite`. Matches the warm canvas tone; never a gray shimmer.
- **Spinner:** 2px border, brand-colored top segment. On navy: Warm Canvas top, translucent Warm Canvas rest. On light: Coral Spark top, translucent Coral Spark rest.

### Signature Component: Search Hero
The search entry point sits as a floating white card (20px radius, Lifted shadow) overlapping a full-bleed navy header. The header communicates brand identity (Deep Harbour background, Warm Canvas headline text); the card communicates workspace (white, clean, focused). The tension between the two registers — brand above, tool below — is intentional. It's the one moment of "boutique hotel lobby" before you get to work.

## 6. Do's and Don'ts

### Do:
- **Do** use Coral Spark (`#E85D3D`) for primary actions and active states only. Its scarcity is what makes it work.
- **Do** use navy-tinted shadows (`rgba(15,37,68,...)`) for all `box-shadow` declarations. Black shadows are prohibited.
- **Do** maintain weight 500 or above for any text on the Deep Harbour navy sidebar.
- **Do** use Manrope as the sole typeface. Weight contrast (400 vs 700) creates hierarchy; a second font does not.
- **Do** use the Warm Divider border (`#DDD5CC`) for all input outlines and card strokes. Cool-gray borders are off-brand.
- **Do** apply `border-radius: 14px` to hotel cards and map containers. Roundness communicates approachability without softness.
- **Do** keep the coral accent to ≤2 simultaneous on-screen uses. If you see Coral Spark on a button, a nav item, AND a badge at once, remove one.

### Don't:
- **Don't** use generic SaaS blue (Material blue, Bootstrap primary, or any blue that isn't from the Deep Harbour ramp). This tool must not look like HubSpot or Salesforce.
- **Don't** use pastel, soft, or pink-adjacent tones as UI color. No `#E8B4D8`, no lavender, no influencer-palette softness. Coral Spark is warm, not sweet.
- **Don't** use consumer travel UI patterns (large hero images, star-rating rows, booking-engine forms). The audience is a creator doing B2B outreach, not a tourist booking a room.
- **Don't** apply `border-left` greater than 1px as a colored accent stripe. Background tint or no treatment — never a left-side colored bar.
- **Don't** use gradient text (`background-clip: text`). Emphasis is weight and size.
- **Don't** add shadows to static content (headers, nav items, page sections). Shadows signal interactivity or elevation — they are not decoration.
- **Don't** introduce a second typeface. No serif for "warmth", no display for "personality", no mono for "tech credibility".
- **Don't** put Coral Spark on inactive or default states. It must be reserved for the active, selected, or primary condition only.
- **Don't** use cool-gray neutrals (no `#e2e8f0`, no generic gray `#999` family). All neutrals must come from the warm or navy ramp.
