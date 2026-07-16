---
name: Dapples
description: The outreach workspace for creators landing hotel collabs — a golden-hour identity
colors:
  # ── Dapples brand palette (golden-hour) — the whole product ──
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
  dapple-error: "#B4432E"
  dapple-olive-deep: "#5B6B47"
  dapple-amber-tint: "#FCF1DA"
  dapple-terracotta-hover: "#A85A30"
  dapple-stone: "#EFEAE0"
  dapple-mist: "#F8F4F0"
  # ── Semantic status (deliberately outside the golden-hour palette) ──
  status-success-bg: "#DCFCE7"
  status-success-ink: "#166534"
  status-sent-bg: "#EEF2FF"
  status-sent-ink: "#4338CA"
  status-error-bg: "#FEF2F2"
  # ── External brand ──
  brand-instagram: "#C13584"
# Quicksand carries display; Nunito Sans carries body. Loaded once in
# app/layout.js via next/font and exposed as --font-display / --font-body.
typography:
  display:
    fontFamily: "Quicksand, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Quicksand, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Quicksand, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0em"
  caption:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.06em"
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
    backgroundColor: "{colors.dapple-forest}"
    textColor: "{colors.dapple-cream}"
    rounded: "{rounded.lg}"
    padding: "14px 20px"
  button-primary-hover:
    backgroundColor: "{colors.dapple-forest-deep}"
    textColor: "{colors.dapple-cream}"
  button-accent:
    backgroundColor: "{colors.dapple-amber}"
    textColor: "{colors.dapple-cream}"
    rounded: "{rounded.lg}"
    padding: "9px 16px"
  button-accent-hover:
    backgroundColor: "{colors.dapple-amber-deep}"
    textColor: "{colors.dapple-cream}"
  button-terracotta:
    backgroundColor: "{colors.dapple-terracotta}"
    textColor: "{colors.dapple-cream}"
    rounded: "{rounded.lg}"
    padding: "9px 16px"
  button-terracotta-hover:
    backgroundColor: "{colors.dapple-terracotta-hover}"
    textColor: "{colors.dapple-cream}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dapple-ink-muted}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
  button-pill:
    backgroundColor: "{colors.dapple-card}"
    textColor: "{colors.dapple-ink}"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
  button-pill-active:
    backgroundColor: "{colors.dapple-terracotta}"
    textColor: "{colors.dapple-cream}"
  input-search:
    backgroundColor: "{colors.dapple-card}"
    textColor: "{colors.dapple-ink}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "rgba(251,245,234,0.6)"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "rgba(224,149,74,0.2)"
    textColor: "{colors.dapple-glow-gold}"
---

# Design System: Dapples

## 1. Overview

**Creative North Star: "Golden Hour"**

Dapples is the hour before sunset, indoors: warm light falling in patches across a workspace. It is the opposite of the cold blue productivity tool — the surface is cream and sand, the actions are deep forest, and the accents are the amber and olive of light through leaves. The interface is calm and unhurried, but never precious: the creator is doing real work — finding properties, writing pitches, chasing replies — and the chrome recedes so their work comes forward. Every design decision should answer: does this feel like late-afternoon light, or like software?

The color strategy is **restrained**: cream and sand grounds carry the surface, deep forest carries every primary action, and amber/olive accents activate only the things that matter (current state, brand identity, positive progress). Nothing on this tool fights for attention. Hierarchy is earned through weight, spacing, and the controlled use of color — not size competitions or decorative flourish.

Notion is the reference for editorial calm; the anti-references are clear. This is not generic SaaS blue (HubSpot's exhausted CRM blue, enterprise density). It is not creator-pink softness (Flodesk, Later). It is not a travel booking engine (consumer UI conventions don't apply here). It is a tool a creator reaches for between trips — purposeful, premium, and invisible.

**Key Characteristics:**
- Deep-forest sidebar anchors authority without aggression
- Cream canvas body keeps the workspace inviting, not clinical
- Amber and terracotta used only where they matter: active states, brand identity, progress
- Quicksand + Nunito Sans pair on a real contrast axis — geometric display, humanist body
- Shadows are warm-tinted, not generic black — every drop of depth belongs to the brand

## 2. Colors: The Golden-Hour Palette

A warm, single-register palette: cream and sand grounds, deep-forest actions, and the amber/olive of late light. The accents earn their keep.

### Core

**Ink & grounds**
- **Dapple Ink** (`#2B2722`): Primary text and headings.
- **Dapple Ink Muted** (`#6B6258`) / **Dapple Ink Faint** (`#9C9388`): Subtext and tertiary labels.
- **Dapple Cream** (`#FBF5EA`): Page background. **Dapple Card** (`#FFFCF4`): raised cards. **Dapple Nav Tint** (`#FBF0DA`) / **Dapple Sand** (`#F3E7CF`): nav and section bands.
- **Dapple Border** (`#DDD0B8`): input and card strokes. **Dapple Placeholder** (`#B6AD9C`): placeholder text.
- **Dapple Error** (`#B4432E`): a warm brick red for validation / error text on Dapples surfaces — the only red in the golden-hour system, used sparingly.

**Actions & accents**
- **Dapple Forest** (`#44503A`) → **Dapple Forest Deep** (`#363F2E`) on hover: primary buttons, browser-chrome bars.
- **Dapple Amber** (`#E0954A`), **Amber Deep** (`#B5702E`), **Amber Deeper** (`#8B5E2A`), **Terracotta** (`#C96E3C`): warm highlights, "Dapples" comparison column, step badges, selection.
- **Dapple Olive** (`#C9D1A8`) / **Olive Mid** (`#8B9A6A`): cool counterpoint dots and accents.

**Golden-hour glow (decorative only)**
- **Glow Gold** (`#F4C97A`), **Honey** (`#F0B979`), **Amber** (`#E5A04A`), **Pale** (`#FDEBBE`), **Ember** (`#EBA94E`): blurred light orbs behind heroes and the wordmark. Never text or fills. Plus **Sand Dot** (`#ECD9B8`) and **URL Grey** (`#C8C2B2`) for the browser-mockup chrome.

**Golden-hour extensions**
- **Dapple Olive Deep** (`#5B6B47`): the dark end of the olive ramp — positive/complete icons and chip text on an `rgba(139,154,106,.16)` tint. Passes AA where Olive Mid does not.
- **Dapple Amber Tint** (`#FCF1DA`): the lightest amber surface — highlighted rows and selected cards.
- **Dapple Terracotta Hover** (`#A85A30`): hover for terracotta actions.
- **Dapple Stone** (`#EFEAE0`) / **Dapple Mist** (`#F8F4F0`): neutral warm surfaces for de-emphasised panels.

### Semantic Status (outside the golden-hour palette, by design)

Status colors carry meaning that the brand ramp cannot: a warm amber "sent" and a warm olive "replied" read as decoration, not state. These five are the **only** sanctioned non-brand colors.

- **Success / Replied** — bg `#DCFCE7`, ink `#166534`.
- **Sent** — bg `#EEF2FF`, ink `#4338CA`.
- **Error** — bg `#FEF2F2`, ink `{colors.dapple-error}`.

### External Brand

- **Instagram** (`#C13584`): Instagram handles, IG pills and DM indicators only, on an `rgba(193,53,132,.12)` tint. It is Instagram's brand, not ours.

**The Status-Only Rule.** `status-*` and `brand-instagram` are reserved for state and third-party identity — a status green never becomes a decorative accent, and Instagram magenta never appears on anything that isn't Instagram. Everything else on a Dapples surface comes from the golden-hour palette.

**The Warm Shadow Rule.** Every `box-shadow` uses a warm base — `rgba(140,90,30, ...)` for ambient depth, `rgba(120,80,30, ...)` for lifted surfaces — never generic `rgba(0,0,0, ...)`. A cold shadow on a golden-hour surface reads as a different product.

## 3. Typography

**Display Font:** Quicksand (loaded via `next/font/google`, 400–700)
**Body Font:** Nunito Sans (loaded via `next/font/google`, 300–800)

**Character:** Quicksand's rounded geometry gives the wordmark and headings their warmth — soft terminals, generous curves, the visual equivalent of late light. Nunito Sans does the work underneath: humanist, open, legible at 11px in a stat tile and at 15px in a paragraph. The pair contrasts on shape (geometric vs humanist) rather than on serif-vs-sans, which keeps the system warm without turning editorial.

### Hierarchy
- **Display** (700, 2.25rem / 36px, leading 1.2, tracking −0.02em): Empty state headings, welcome messages. Appears rarely — only when there's nothing else on screen.
- **Headline** (700, 1.75rem / 28px, leading 1.25, tracking −0.02em): Page titles (e.g. "Search Results", "Your Lists").
- **Title** (600, 1.375rem / 22px, leading 1.3, tracking −0.01em): Section headings, results headers.
- **Body** (400, 0.9375rem / 15px, leading 1.5): All prose, table cells, email preview text. `max-width: 65ch` on any paragraph block.
- **Label** (500, 0.8125rem / 13px, leading 1.35): Secondary UI — table column headers, form field hints, hotel card metadata. The workhorse size.
- **Caption** (500, 0.6875rem / 11px, leading 1.3, tracking +0.06em): Tiny meta — chip counts, status tags, timestamp dates. Use sparingly; below this is inaccessible.

### Named Rules
**The Two Family Rule.** **Quicksand** (rounded geometric) carries display — the wordmark, headings, numerals in stat tiles, and button labels. **Nunito Sans** (humanist) carries everything else. Two families, paired on a real contrast axis (geometric vs humanist); do not introduce a third. Hierarchy within each comes from weight and size, not from more families.

**The 500-On-Forest Rule.** Any text on the forest sidebar must be weight 500 or above. The perceived weight of light text on a dark ground drops by one notch; compensate.

## 4. Elevation

Elevation is **structural, not decorative**. Shadows appear in response to hierarchy: content that floats above the page (cards, dropdowns, modals, map popups) has a shadow. Static surface content does not. All shadows are warm-tinted — see The Warm Shadow Rule.

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
- **Shape:** Gently rounded (12px / `{rounded.lg}`) for primary and accent buttons; pill (24px) for filter tabs and area-search actions
- **Primary (forest):** Dapple Forest background (`#44503A`), Dapple Cream text (`#FBF5EA`), 14px vertical padding, Quicksand label. Darkens to Forest Deep (`#363F2E`) on hover.
- **Accent (terracotta):** Terracotta background (`#C96E3C`), cream text. Used for secondary CTAs that need energy but not the full authority of forest. Terracotta Hover (`#A85A30`) on hover.
- **Ghost / toolbar:** Transparent background, Ink Muted text, 8px radius. Used for map/list view toggles and sub-actions; each carries its own semantic icon colour (olive for email, Instagram magenta for IG, amber for map).
- **Pill tab:** Card background, Ink text, 24px radius, Border stroke. Active: Terracotta background, cream label, no border. Used for the Hotels / Boutique Stays / Apartments / Cabins tabs.
- **Transitions:** `0.15s` on all state changes. No bounce, no spring.

### Cards
Cards are reserved for content that benefits from containment: hotel search results, search hero widget.
- **Hotel Card:** 16px radius, Card background (`#FFFCF4`), Low shadow at rest, Hover shadow on `:hover` paired with `translateY(-4px)`. 1px Border stroke (`#DDD0B8`). Internal padding 14px/16px.
- **Search Card:** 20px radius, white background, Lifted shadow. Max-width 640px. Floats 32px above the map hero via negative margin.
- **Inner containers:** Flat; no shadow on nested elements. Nested cards are prohibited.

### Inputs / Fields
- **Style:** Card background (`#FFFCF4`), 1.5px Border stroke (`#DDD0B8`), 10–12px radius. Body font, 15px, Ink text.
- **Focus:** Border shifts to Dapple Forest (`#44503A`). No glow — the border darkening is the signal.
- **Placeholder:** Dapple Placeholder (`#B6AD9C`).
- **Search Input:** Housed inside a card widget; the input itself has no visible border — the card provides the containment.

### Navigation (Sidebar)
- **Background:** Dapple Forest (`#44503A`), fixed 220px wide, sticky on desktop, slide-in drawer on mobile.
- **Nav items:** 10px radius, 10px/12px padding. Inactive: transparent background, `rgba(251,245,234,.5)` icons, `rgba(251,245,234,.6)` label, weight 500.
- **Active state:** `rgba(224,149,74,0.2)` background tint, Glow Gold label and icon (`#F4C97A`). No left-side stripe — background tint only.
- **Child items:** Indented 42px, 13px label, dot indicator (4px circle). Active dot is Glow Gold; inactive is `rgba(251,245,234,.3)`.
- **Logo:** The "Scattered Light" wordmark — "Dapples" in Quicksand 600/17px, cream, with two small blurred accent dots (Glow Gold and Olive) behind the letterforms. No icon square.
- **Mobile:** Hamburger in top bar, overlay drawer, `transform: translateX(-100%)` → `translateX(0)` at `0.25s ease`.

### Chips / Tags
- **Filter pill (tabs):** Card background, Ink text, Border stroke (1.5px), 24px radius. Active: Terracotta background, cream label, no border. Count badge: Sand background (`#F3E7CF`), 11px/700; on an active pill it becomes `rgba(251,245,234,.3)` with cream text.
- **Status tags:** Small inline chips for sequence status (Sending Soon, Active, Completed). Navy tint backgrounds with corresponding text.

### Skeleton / Loading States
- **Shimmer:** Two-tone warm gradient (Sand → Border → Sand) animated at `1.4s infinite`. Matches the cream canvas tone; never a gray shimmer.
- **Spinner:** 2px border, brand-colored top segment. On forest: cream top, translucent cream rest. On light: Amber top, translucent Sand rest.

### Signature Component: Search Hero
The search entry point is a floating Card-background bar (16px radius, warm lifted shadow) sitting on the Nav Tint hero band, with a Glow Gold orb blurred behind it. The band carries the brand (sand ground, Quicksand headline, golden light); the bar carries the work (clean, focused, forest Search button). It's the one moment of golden hour before you get to work.

## 6. Do's and Don'ts

### Do:
- **Do** use Dapple Forest (`#44503A`) for primary actions, and reserve Terracotta/Amber for active and selected states. Their scarcity is what makes them work.
- **Do** use warm-tinted shadows (`rgba(140,90,30,...)` / `rgba(120,80,30,...)`) for all `box-shadow` declarations. Black shadows are prohibited.
- **Do** maintain weight 500 or above for any text on the forest sidebar.
- **Do** use Quicksand for display and Nunito Sans for body — and nothing else. Weight contrast creates hierarchy within each; a third family does not.
- **Do** use the Dapple Border (`#DDD0B8`) for all input outlines and card strokes. Cool-gray borders are off-brand.
- **Do** apply `border-radius: 16px` to cards and map containers. Roundness communicates approachability without softness.
- **Do** keep the terracotta accent to ≤2 simultaneous on-screen uses. If you see it on a button, a nav pill, AND a badge at once, remove one.

### Don't:
- **Don't** use generic SaaS blue (Material blue, Bootstrap primary, any blue at all outside the `status-sent` chip). This tool must not look like HubSpot or Salesforce.
- **Don't** use pastel, soft, or pink-adjacent tones as UI color. No lavender, no influencer-palette softness. The only magenta permitted is `brand-instagram`, and only on Instagram surfaces. Amber is warm, not sweet.
- **Don't** use consumer travel UI patterns (large hero images, star-rating rows, booking-engine forms). The audience is a creator doing B2B outreach, not a tourist booking a room.
- **Don't** apply `border-left` greater than 1px as a colored accent stripe. Background tint or no treatment — never a left-side colored bar.
- **Don't** use gradient text (`background-clip: text`). Emphasis is weight and size.
- **Don't** add shadows to static content (headers, nav items, page sections). Shadows signal interactivity or elevation — they are not decoration.
- **Don't** introduce a third typeface. No serif for "warmth", no mono for "tech credibility" — Quicksand and Nunito Sans are the whole system.
- **Don't** put Terracotta or Amber on inactive or default states. They are reserved for the active, selected, or primary condition only.
- **Don't** use cool-gray neutrals (no `#e2e8f0`, no generic gray `#999` family). All neutrals must come from the golden-hour ramp.
