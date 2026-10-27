---
name: Express Photo and Gifts
description: A shop counter in brand blue and white, where the shop's own work is the argument and amber is only ever the accent.
colors:
  blue: "#0126BA"
  gold: "#FFB72A"
  leather: "#0126BA"
  paper: "#FFFFFF"
  print: "#FFFFFF"
  ink: "#0126BA"
  ink-soft: "rgb(1 38 186 / 0.8)"
  ink-faint: "rgb(1 38 186 / 0.72)"
  on-leather: "#FFFFFF"
  on-leather-soft: "rgb(255 255 255 / 0.8)"
  rule-paper: "rgb(1 38 186 / 0.12)"
  rule-leather: "rgb(255 255 255 / 0.22)"
  rule-leather-strong: "rgb(255 255 255 / 0.6)"
  rule-card: "rgb(1 38 186 / 0.1)"
  rule-hair: "rgb(1 38 186 / 0.2)"
  rule-dark: "rgb(255 255 255 / 0.32)"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.8rem, 8.2vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.94
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 4.4vw, 3.6rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  band-strip:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(0.85rem, 1.5vw, 1.25rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  statement:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.2rem, 2.2vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  statement-loud:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3.4vw, 2.6rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  ledger-name:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.15rem, 2.2vw, 1.55rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  subtitle:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 2vw, 1.4rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.25vw, 1.15rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  card-title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  price:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
    fontFeature: "tnum"
  cover-lede:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.45vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  address:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.5vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  lede:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.3vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "normal"
  button:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  micro:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  mark:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.14em"
  slot:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  measure:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  colophon:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
  count:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
    fontFeature: "tnum"
rounded:
  sm: "12px"
  md: "18px"
  lg: "22px"
  pill: "999px"
spacing:
  gutter: "clamp(20px, 5vw, 56px)"
  section: "clamp(62px, 9vw, 130px)"
  section-tight: "clamp(52px, 8vw, 100px)"
  band-strip: "clamp(6px, 0.9vw, 12px)"
  column-gap: "clamp(30px, 5vw, 76px)"
  rail-gap: "clamp(16px, 2.2vw, 24px)"
  shell: "1400px"
  measure: "62ch"
  header-h: "66px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.65rem"
  button-primary-hover:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
  button-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.print}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.65rem"
  button-blue-hover:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.print}"
  button-compact:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
    padding: "0.6rem 1.05rem"
  button-dock:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "1.05rem 1.9rem"
  dock-chat:
    backgroundColor: "{colors.print}"
    textColor: "{colors.blue}"
    rounded: "{rounded.pill}"
    size: "60px"
  header-icon:
    backgroundColor: "transparent"
    textColor: "{colors.print}"
    rounded: "{rounded.pill}"
    size: "44px"
  card-category:
    backgroundColor: "{colors.print}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "clamp(14px, 1.5vw, 20px)"
    width: "grid column, two-up under 56rem and four-up above"
  card-frame:
    backgroundColor: "{colors.print}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.85rem 1.05rem 1rem"
    width: "clamp(186px, 23vw, 280px)"
  header:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.print}"
    padding: "0.7rem {spacing.gutter}"
    height: "{spacing.header-h}"
  section-mark-on-dark:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
    typography: "{typography.mark}"
  cover-image:
    rounded: "{rounded.md}"
    backgroundColor: "{colors.print}"
    height: "clamp(150px, 17vw, 258px)"
  card-product:
    backgroundColor: "{colors.print}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.8rem 0.95rem 0.95rem"
    width: "its grid cell"
  chip-special:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.price}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.7rem"
  pill-filter:
    backgroundColor: "{colors.print}"
    textColor: "{colors.ink}"
    typography: "{typography.price}"
    rounded: "{rounded.pill}"
    padding: "0.55rem 1.05rem"
    height: "44px"
  pill-filter-current:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.print}"
  door-budget:
    backgroundColor: "{colors.print}"
    textColor: "{colors.ink}"
    typography: "{typography.statement-loud}"
    rounded: "{rounded.md}"
    padding: "clamp(16px, 1.8vw, 24px)"
  door-budget-hover:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.print}"
  door-more:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.print}"
    rounded: "{rounded.md}"
    padding: "clamp(16px, 1.6vw, 22px)"
  shelf-head:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.print}"
    typography: "{typography.headline}"
    padding: "clamp(22px, 3.4vw, 48px) {spacing.gutter} clamp(26px, 3.6vw, 52px)"
---

# Design System: Express Photo and Gifts

## Overview

**Creative North Star: "The Shop Counter"**

This is a printed shop, not an app. The argument is the shop's own work: the first thing a visitor meets is a full-bleed wall of real product photographs travelling past, with one plain sentence set on the widest of the wall's own blue bands, holding still while everything around it moves. From there the page reads the way the counter reads — one catalogue wheel turning with the scroll, eight category tiles that are each a door into the shop, then where to find the real door. One brand blue owns the loud surfaces whole — the header, the cover's bands, the catalogue and the footer — and white owns the rest: the wall's ground, the categories and the gifting promise, which carries its headline on one more leaning blue band. The page opens and closes on the same blue. Nothing is quiet for the sake of being quiet.

The shop under `/shop` is the same counter set for scanning. The storefront opens on the homepage's leaning sign, then lays one customer photograph beside every object it can go on; the catalogue carries the header's blue into a title band and puts the products on white beside a rail of categories. Every product is a white door with its price; every filter is a pill.

The density is deliberate and left-weighted: display type sits low-left at large clamped sizes with tight negative tracking, headings and actions hold one left edge from header to footer while the loud rows run full bleed past both, and long prose is capped at a 62ch measure so a wide shell never turns into a wide paragraph. Depth is low and warm — pill actions carry a coloured glow rather than a grey drop shadow, cards carry one soft blue-tinted lift, and everything else earns separation from its ground instead of from a shadow.

The system has one accent and uses it like a highlighter, not like a second brand colour. Amber marks the action to take and the line worth remembering; it never becomes a region. The client's rule is three colours in three roles: blue primary, white secondary, amber accent. There is no dark variant — `color-scheme: light` is declared, and the dark surfaces are compositional grounds, not a theme. The confirmed rejection is the previous build's sparse gallery treatment: the failure there was under-spending the material, not choosing the wrong material.

**Key Characteristics:**
- Grounds in rotation: brand blue (loud), white and blue-white (reading), deep navy (the footer's close).
- Amber as the accent only — actions, one marked line, band slashes, marks on dark. Never a region.
- No black and no grey: every ink is the brand blue taken toward night.
- Two families, strictly divided: Archivo for prose, Geist Mono for marks and measurements only.
- Pill actions (999px), 12/18/22px surface radii, one soft blue-tinted elevation.
- A white-ground photo wall whose headline is one of its own leaning blue bands, settling at its foot onto the catalogue's leaning edge.
- Focus rings that change colour with their ground.
- Motion animates from an already-visible default; with JS off the page is complete and merely still.
- In the shop: one leaning sign, white product doors with prices, pills for every filter, mono for every count.

## Colors

Blue primary, white secondary, amber accent — the client's rule. Every ink is drawn from the blue, so nothing on the page is black or grey.

### Primary
- **Brand Deep Blue** (`{colors.blue}`): the binding brand value, supplied by the shop. It owns the cover's headline band and leaning edge, the catalogue, the running band and the find-us panel *whole* — edge to edge, not as a panel inside a lighter page. On paper it is also the default focus ring, the caret, the scrollbar thumb, the catalogue subtitle, and what every category tile becomes under the pointer (and Specials at rest). Takes white text. In the shop it is the catalogue's title band, the Specials and size-chart sections, the board's one "see all" door, a budget door or a filter pill under the pointer, the current rail entry and the pressed photo toggle.

### Secondary
- **Foil Amber** (`{colors.gold}`): the shop's highlighter. Primary actions, the highlighter-marked line, the slashes in the running band, section marks and block headings on dark grounds, the corporate-gifts chip, the footer phone number, `::marker` and `::selection`, and the underline under "Get directions". In the shop: the counted number in the storefront sign, the "Special" chip on a card, the breadcrumb slash, the go disc on a door, and the size chart's picked outline and radio dot. It pairs legibly with ink or with brand blue and never takes white text.

### Neutral
- **Leatherette** (`{colors.leather}`): the blue ground of the header, the catalogue, the cover's word strips and the footer. Same value as brand blue, named for its role so a surface and an accent are not confused at call sites.
- **There is no second blue.** A darker footer blue and a lighter hover blue were both tried and rejected by the client: only the official values may appear.
- **Shop White** (`{colors.paper}`): pure white; the body ground, and the category tile's icon disc at rest; also the disabled carousel arrow's disc.
- **Print White** (`{colors.print}`): product cards, the photographs' own backing, the skip link.
- **Ink** (`{colors.ink}`): deep navy; body text on white, and text on amber.
- **Soft Ink** (`{colors.ink-soft}`): secondary prose on paper — ledes, blurbs, nav at rest. Blue-leaning, never grey.
- **Faint Ink** (`{colors.ink-faint}`): the quietest paper tone.
- **On Leather** (`{colors.on-leather}`) / **Soft White** (`{colors.on-leather-soft}`): white and its softened partner on blue — headline and body versus ledes, hours values, contact glyphs.
- **Strong Leather Rule** (`{colors.rule-leather-strong}`, 60% white, 4.6:1 on the blue): the edge of a field on the blue, which has to be found, not just felt. Only the footer's email line uses it. **Paper Rule** (`{colors.rule-paper}`) / **Leather Rule** (`{colors.rule-leather}`): the hairline dividers. The gifting ledger, the hours table and the band edges are ruled, never boxed; inside the catalogue frame the same hairline separates the photograph from its caption.
- **Card Rule** (`{colors.rule-card}`) / **Hair Rule** (`{colors.rule-hair}`) / **Dark Rule** (`{colors.rule-dark}`): the door card's 1px edge; the edge of every pill control on white (category pills, rail pills, the photo toggle, the selects); and the stronger line on blue — the size chart's outlines at rest and its radio rings.

### Named Rules

**The Highlighter Rule.** Amber marks; it does not upholster. It may carry a button, a line of text, a slash, a mark, a chip, an underline or a marker glyph. Nothing may be amber larger than the gifting section's highlighted line, with one exception the client asked for (2026-10-19): the category tiles are amber at rest, each a small door with a white disc and blue ink, never a section ground. An amber ground was tried for the gifting section and rejected by the client: it read as a warning sign and fought the blue.

**The Whole-Ground Rule.** A ground owns its section edge to edge. Blue, white, blue-white and night blue alternate as full-bleed bands; a coloured panel floating inside a differently-coloured section is not part of this world.

**The Three-Value Rule.** Only `#0126BA`, `#FFB72A` and `#FFFFFF` appear. Ink is the brand blue itself; softer text is that blue at 80% or 72% over white, or white at 80% over blue. There is no grey, no black, no navy and no tinted off-white.

## Typography

**Display Font:** Archivo (self-hosted via `next/font`, with `system-ui, sans-serif`)
**Body Font:** Archivo
**Label/Mono Font:** Geist Mono (with `ui-monospace, monospace`)

**Character:** Archivo is a grotesque with enough width and weight to carry a six-rem headline at 0.94 line-height without looking inflated, and enough neutrality to disappear at 14.5px. Geist Mono is the shop's stamp: small, tracked out, uppercase, and only ever attached to something counted or measured. **Why Archivo and not the template's face:** the pinned template is set in Outfit, which the project's own new-work guidance lists among the training-data default faces that require "a reason no other face could satisfy". Archivo carries the template's density and left-weighted display without inheriting its default face, and is self-hosted with `font-synthesis-weight: none` so no weight is ever faked.

### Hierarchy
- **Display** (600, `clamp(2.8rem, 8.2vw, 6rem)`, 0.94, −0.035em): the cover headline only, two lines, centred on its band, capped at 4.75rem so a whole row of work shows either side.
- **Headline** (600, `clamp(1.9rem, 4.4vw, 3.6rem)`, 1.02, −0.03em): every section `h2`, balanced.
- **Band strip** (500, `clamp(0.85rem, 1.5vw, 1.25rem)`, 1.15, −0.025em): the word strips woven between the wall's photograph rows — small enough to read as one more thing travelling past rather than as a headline competing with the one fixed sentence on the cover.
- **Statement** (600, `clamp(1.2rem, 2.2vw, 1.75rem)`, 1.3): the highlighter-marked line, the only prose that takes the amber stroke.
- **Subtitle** (600, `clamp(1.1rem, 2vw, 1.4rem)`): the collect-or-deliver headings, set inline with their icon, and the catalogue's own subtitle — which takes brand blue rather than soft ink, because it is the second step in a hierarchy and not quieter prose.
- **Title** (600, `clamp(1rem, 1.25vw, 1.15rem)`): category tile names, at `clamp(1.05rem, 1.45vw, 1.3rem)`; told apart from the lede by weight, not scale.
- **Card Title** (600, 17px): catalogue frame captions and product card names, balanced.
- **Price** (600, 16px, tabular): the price on a product card and beside each size in the size chart; also the weight of every pill label and the Special chip.
- **Cover Lede** (400, `clamp(1rem, 1.45vw, 1.2rem)`, 1.5, 44ch, balanced): the one sentence under the display line, on its own slimmer band.
- **Lede** (400, `clamp(1rem, 1.3vw, 1.15rem)`, 1.62, 62ch measure): section-opening prose.
- **Address** (400, `clamp(1rem, 1.5vw, 1.15rem)`, 1.65): the street address block.
- **Body** (400, 15.5px, 1.65): the footer's contact links and the hours table's day labels.
- **Body Small** (400, 14.5px, 1.55): the sign-up's consent and thank-you lines and the sign-in links under it. 15px for the sign-up's own explanatory line.
- **Micro** (400, 15px): the header's inline nav and the names beside the Search, Account and Cart marks (from 75rem), which only appear from 62rem. Never used in the category or gifting sections, where every text element is 16px or more.
- **Mark** (mono, 400, 13px, 0.14em, uppercase): the footer's shop-block headings (The shop, Opening hours, Talk to us), in amber on blue.
- **Slot** (mono, 400, 13.5px): the footer's copyright line, "©2026 Express Photo and Gifts".
- **Measure** (mono, 400, 14.5px, tabular): hours values. The hours table sets `font-variant-numeric: tabular-nums` so the times column aligns.
- **Colophon** (mono, 400, 14.5px): no longer used by the sign-up, whose thank-you line is Body Small in amber.
- **Count** (mono, 400, 16px, tabular): the product count on a category pill and a rail entry, in faint ink (soft white when the pill is blue), and each size's measure in the size chart. The one mono role that meets the 16px Floor, and the model for any new one.

The shop reuses the ramp rather than adding to it: the storefront sign's headline is the display role at `clamp(2rem, 8.4vw, 4.75rem)` / 0.98 so a two-line sign fits a phone; the catalogue's title is the headline role at line-height 1 and −0.035em; "Your photo" on the board is Statement; a budget door's band and the empty and no-match titles are Statement Loud; the prints note's title is Subtitle; the empty-state text is Lede at 52ch.

### Named Rules

**The 16px Floor.** No text element may be smaller than 16px on mobile, and no input, textarea or select may be, or mobile Safari zooms in on tap. This is the project owner's standing rule (CLAUDE.md), and it outranks the ramp above. **The shop meets it:** every text element under `/shop` is 16px or more at every width, the selects included, and inside `.shop` the site button is raised from 0.95rem to 1rem. Where a label could only fit by shrinking, it steps out instead — the "Takes your photo" glyph and the size chart's drawn label both hide under 46rem. **The shared footer and header meet it on a phone.** Under 46rem `chrome.css` raises the footer's small print, its mono labels and the sign-up's lines and button to 16px (the mono headings lose some tracking as they grow); above it they are the sizes in the roles above, which a desktop reading distance carries: Body (15.5px), Body Small (14.5px), Mark (13px), Slot (13.5px), Measure (14.5px) and Micro (15px). Do not add a new text role below 16px on a phone.

**The Two-Families Rule.** Archivo sets everything written in prose. Geist Mono sets only marks and measurements — the footer's block headings, the hours values, the colophon, the shop's product counts and the size chart's measures. Mono is never body copy, never a heading, never a button. Audit test: read the mono string aloud; if it is a sentence, it is in the wrong family.

**The Tight-Display Rule.** The larger the type, the tighter it sets: −0.035em and 0.94 line-height at display, −0.03em at headline, normal tracking by the time it is prose. Never letterspace Archivo positively; positive tracking (0.16em) belongs to mono alone.

**The Measure Rule.** Prose is capped — 62ch for ledes, 44ch on the cover, 44ch for fulfilment paragraphs, 36ch in the footer — regardless of how wide the 1400px shell gets.

### The two steps between statement and headline

`statement-loud` and `ledger-name` were shipping as literals off the ramp and are
recorded here rather than rounded onto a neighbouring step, because each does a
job neither neighbour can.

- **statement-loud** is the highlighter line at the foot of the gifting section.
  It is that section's peak, under a title already at display scale, so
  `statement` reads as a caption beneath it and `headline` competes with the
  title above it.
- **ledger-name** is the row heading in the handover ledger. The rows are ruled,
  not carded, so the name carries the whole weight of the row; `subtitle` loses
  it against the blurb underneath and `statement` turns two rows into two
  headings.

Neither is a licence to add a third. A new size still has to earn its way onto
this list or use a step already on it.

## Layout

One shell, 1400px wide, centred, with a fluid gutter of `clamp(20px, 5vw, 56px)` that every full-bleed band re-applies internally so type stays on a single left edge from header to footer. Section rhythm is `clamp(62px, 9vw, 130px)` of vertical padding on the categories. The catalogue takes only `clamp(20px, 4vw, 56px)` on top, because the cover's leaning edge is already the same blue, and none below, because the wheel's own viewport holds the room its arc drops into. The footer opens with `clamp(48px, 6vw, 84px)`.

Breakpoints are declared in rem and each one does a single job: 26rem closes the header's gaps so the wordmark and three 44px targets fit, and 22.4rem (358px) drops Account from the bar, where the wordmark would fall under 13px tall (the footer's sign-in line reaches it on every page); 75rem gives Search, Account and Cart their names beside their marks; 46rem splits collect-or-deliver into two and gives the dock its larger sizes; 48rem and 62rem and 90rem re-tune the wheel's lean and drop; 56rem takes the category tiles from two-by-four to four-by-two and opens the footer's find-us grid to `1.15fr 1fr 1fr` and its sign-up row to `1.15fr 2fr`; 62rem is the shell breakpoint — the inline nav appears, the cover's wall switches from packed-from-its-foot to fitted, and the header grows from 66px to 74px. There is no menu drawer at any width: below 62rem the bar is the wordmark and the icon controls, and the section links are a scroll away. Anchors compensate with `scroll-margin-top: calc(var(--header-h) + 28px)`.

The cover subtracts the sticky header's height from the viewport (`min(calc(100svh - var(--header-h)), 900px)`, capped at 46rem below 62rem) because the header sits in flow above it; without that, the cover's foot lands just past the fold. The catalogue's wheel is full bleed inside an `overflow: hidden` section while its heading, subtitle and link are centred over it.

Product photographs are served from Cloudinary through `ProductImage` (`app/site/ProductImage.tsx`), never from `public/`. The loader asks for exactly two widths, 400 and 640, because the free plan meters every derived size; the cover wall and the wheel both ask for 640 so they share a derivation, and the nearest width at or above the requested one is used. A new size is added to that list rather than invented at a call site.

The shop keeps the same shell and gutter and adds its own grids, each changing at a breakpoint already in the system. The storefront board is two across with the customer portrait full width, three across with the portrait two-by-two from 46rem, and six across from 62rem so portrait, products and the way on fill whole rows. A shelf is a swipe row on a phone (`min(64vw, 250px)` cards, scroll-snapped, bleeding off the right edge so the next card shows) and a four-up grid from 62rem; the photos shelf is three-up beside the prints note from 62rem. The budget doors go three-up from 56rem. The size chart stands beside its copy from 62rem and stacks its drawing above its list under 36rem. The catalogue is one column with the rail held under the header as a pill strip below 62rem, and a `15.5rem` rail beside the grid from 62rem, sticky at `header-h + 28px`; its grid is two across, three from 46rem and four from 90rem. Product cards ask `ProductImage` for 640 and the budget door's thumbnails for 400, both on the shared list.

**The One-Edge Rule.** Every band re-applies the shell and gutter. A full-bleed background never means full-bleed content.

## Elevation & Depth

Low and warm. There is no grey drop-shadow vocabulary and no elevation ladder; depth comes from ground changes, hairline rules and coloured glows, and the whole set is five tokens in `app/globals.css`. Actions carry a glow in their own colour, tightly negative-spread so it reads as light on the surface under the button rather than as a box floating above it. Every card-like surface that holds a photograph or leads somewhere — the category tile, the catalogue frame and each print on the cover wall — carries the same blue-tinted lift, which deepens on hover as the card rises. Everything else — the hours table, the gifting ledger, the footer — is flat, separated by 1px rules at `{colors.rule-paper}` / `{colors.rule-leather}` or by a change of ground.

The header is solid brand blue and casts nothing: the wall beneath it is white-ground studio shots, so the bar ends on a clean edge and needs no shadow to hold itself off the page.

### Shadow Vocabulary
- **Gold action glow** (`--shadow-gold`: `0 18px 38px -20px rgb(255 183 42 / 0.95)`; `--shadow-gold-hover`: `0 22px 44px -20px rgb(255 183 42 / 1)`): under the amber action and the category tile at rest.
- **Blue action glow** (`--shadow-blue`: `0 18px 40px -22px rgb(1 38 186 / 0.9)`; `--shadow-blue-hover`: `0 24px 48px -22px rgb(1 38 186 / 0.95)`): under the blue button, the dock's round WhatsApp mark, and a category tile held in its blue state.
- **Card lift** (`--shadow-card`: `0 22px 44px -32px rgb(1 38 186 / 0.4)`; `--shadow-card-hover`: `0 30px 54px -30px rgb(1 38 186 / 0.5)`): the catalogue frame, the product card, the budget door at rest and every photograph standing on its own (the cover wall's prints, the storefront's customer portrait), at rest and raised. The blue action glow also sits under the board's "see all" door, and its hover value under a budget door turned blue.
- **Sign lift** (`filter: drop-shadow(0 18px 28px rgb(1 38 186 / 0.28))`): under every leaning sign — the cover's, the gifting section's and the storefront's.

### Named Rules

**The Coloured-Shadow Rule.** A shadow is tinted by the thing casting it — amber under the amber button, brand blue under the blue button and the white card. Black or neutral-grey shadows are not part of this world.

**The Rule-Not-Box Rule.** A list, a ledger or a table is separated by 1px hairlines, not by a border around each item: the gifting ledger, the hours table and the footer columns are all ruled. A card is not a list item — it is bordered when it is a *door*, something that can be pressed and that leads somewhere. The category tile is an amber door edged in its own amber. The white doors are the catalogue frame, the product card and the budget door; all wear the same 1px `{colors.rule-card}` edge and the same blue lift. The board's "see all" is a door filled blue instead, so it needs no edge. What does not go anywhere wears no edge: the customer portrait on the board is the visitor's picture, not a door, so it is a bare print with its corner and lift; the prints note is prose set off by one hairline, not a box. Audit test: if a bordered box does not go anywhere when you press it, it is wrong.

## Shapes

Two shapes, and nothing between them. Anything you press or tag is a pill (999px): buttons, the header's icon targets, the dock's round WhatsApp mark, the sign-up's submit, the scrollbar thumb. Anything that holds content is a soft rectangle on the 12 / 18 / 22px ladder: 18px on the cover wall's photographs, the category tiles, the product card, the budget door and the board's portrait and "see all" door; 22px on the catalogue frame; 12px on smaller surfaces — a budget door's overlapping thumbnails and a rail entry once the rail becomes a list from 62rem. Every shop control on white — category pills, rail pills, the photo toggle, the selects, the Special chip — is a pill. Corners are never square and never fully circular except on the round 44–60px controls, where the pill radius resolves to a circle.

Borders are 1px and low-contrast — `rgb(1 38 186 / 0.1)` around the card, `rgb(1 38 186 / 0.22)` around the dock's round mark, `rgb(255 255 255 / 0.2–0.32)` on dark grounds. Rotation appears in two kinds of place and they are opposites, so the wall and the wheel are never read as the same device: the cover wall, its word strips and the three signs (the cover's headline, the gifting headline and the storefront's) lean as bands at −4° while the photographs inside the wall stay square, whereas the catalogue wheel has no lean of its own and every frame takes its angle from where it sits on the wheel. Hovering a frame takes it off the wheel — it squares up and lifts. A hovered category tile tilts its amber disc's glyph to the same −4°, and a hovered door in the shop tilts its amber go disc the same way as it nudges 3px on. Nothing else in the system rotates.

Icons are authored on a 24px grid and inherit `currentColor`. Outline marks share a 1.6 stroke with round caps and joins; brand marks (WhatsApp, Instagram, Facebook) are solid, because that is how those marks are drawn. They render at 15–22px inline with their text.

**The Two-Shape Rule.** Pill or soft rectangle. A square corner, a half-round "squircle" or a radius outside 12/18/22/999 is outside the system.

## Components

### Buttons
- **Shape:** full pill (999px), inline-flex with a 0.6rem gap so a mark can sit inside the label.
- **Primary (amber):** amber ground, ink label, 0.95rem/600, `0.95rem 1.65rem` padding, gold glow. It is the **Shop now** action, in the dock at every width (the header no longer carries a second one: on a wide screen it was the same tap twice), going to the storefront at `/shop`. It appears only outside the shop: inside `/shop` it would point at the page it is on, so the shop's dock leaves it out. Tagged `.on-gold` so the focus ring flips to ink.
- **Blue:** brand-blue ground, white label, same metrics; for an action that sits on white. The shop uses it for the actions that leave the catalogue or reset it — "Order prints on WhatsApp" (with the solid WhatsApp mark), "Ask on WhatsApp" on an empty shelf, and "Clear filters". Inside `.shop` every button label is 1rem, not 0.95rem, for the 16px Floor.
- **Hover / Active:** every variant lifts `translateY(-2px)` over 0.45s on `cubic-bezier(0.16, 1, 0.3, 1)` and presses back to `scale(0.98)` on active. Amber deepens its glow, and so does blue (there is no lighter blue to brighten into).
- **Compact:** in the header the same pill drops to `0.6rem 1.05rem` at 13.5px.
- **Secondary actions are prose, not buttons.** The ghost and outline pills the cover once carried are gone; the cover has no buttons at all, and a section's second action is an `.inline-link` (underlined in amber, 2px) such as "Browse the full catalogue" (to `/shop/all`), a shelf's "See all N frames", or "Browse all products" on an empty shelf.

### Cards / Containers
- **Corner Style:** 22px on the catalogue frame, 18px on the category tile.
- **Background:** print white; the catalogue's frames sit on the brand-blue catalogue ground and the tiles on the white categories ground.
- **Shadow Strategy:** the blue-tinted card lift; hover raises 4px and deepens it over 0.5s.
- **Border:** 1px `rgb(1 38 186 / 0.1)`, with a second hairline rule (`rgb(1 38 186 / 0.08)`) between the frame's image and its name.
- **Internal Padding:** the catalogue frame sets `0.85rem 1.05rem 1rem` under a square (1:1) photograph flush to the card's edges; the category tile sets `clamp(14px, 1.5vw, 20px)` around its disc, ring and name.
- **Width:** the catalogue frame is `clamp(186px, 23vw, 280px)`; the category tile fills its grid column, two-up below 56rem and four-up above.

### The Product Card
The catalogue frame's door, set for a grid: it fills its cell, so a row of cards shares one floor. 18px radius, print white, card edge and card lift; a square (1:1) photograph flush to the edges over one inner hairline (`rgb(1 38 186 / 0.08)`), then the body at `0.8rem 0.95rem 0.95rem`: the name (Card Title, 17px), the price (Price, 16px/600, tabular — "from R…" when its options differ in price), a hint in soft ink at 16px when there is one, and, on anything personalisable, **"Takes your photo"** in soft ink with the blue YourPhoto glyph (an outline portrait in a print, drawn on the shared grid), held to the card's floor so the promise lines up across a row. Under 46rem the glyph steps out so the promise stays one line at 16px. A flagged product carries the amber **Special** chip top-left on the photograph — a mark, the one amber shape on a card. A product with no photograph yet says "Photo to come" in faint ink, in Archivo, on a 5% blue wash, so the gap reads as missing rather than broken. Under a pointer the card lifts 4px and the photograph scales to 1.04. Every card links to its product page at `/shop/product/<slug>`. The same card sits on blue in the Specials band and under the size chart.

### The Product Page
`/shop/product/<slug>` sets the counter slip beside the shop's photograph. Under the breadcrumb (soft ink on white, amber slash), the photograph stands left as a bare print: 18px corner, card lift, no edge, because it goes nowhere. From 62rem it stays in place as the column scrolls. Two or three photographs add a row of 76px thumbnails (12px corner, blue 2px ring on the current one); one photograph gets no row. The column on the right reads top to bottom: the name (Headline role at line-height 1), the price (Statement, tabular, updating with the choice), the description as a Lede at 52ch, then, on anything personalisable, the **photo needs**: a 12px block on a 5% blue wash with the print area drawn small in its own proportions and shape (dashed brand-blue outline: rectangle, circle or arch), "Takes your photo." in ink, "Printed at W × H cm" in mono, and a line saying the photo is added at checkout, seen in place before paying, printed whole unless cropped, and flagged if it may print soft. All of it is read from the same tags the photo step uses. Then the choices. A choice is a row of radio pills, blue when picked, each naming its own price when prices differ. A Size whose every value is given in centimetres is instead the size chart on white (`tone="paper"`): hair outlines, the picked print in brand blue on a 7% wash, no drawn label, because amber on white cannot carry a line. Then the quantity stepper (a pill holding two 44px round steps), the slip (ruled, not boxed: the choice and count in soft ink, then Total), and the actions. **Add to cart** is the gold action and the page's only order route: it adds the variant and quantity to the cart and opens the cart drawer. On a variant without a price it is replaced by a blue "Ask the shop for a price" on WhatsApp, with the product, choice and code written in. Under it, **how it reaches you** is a ruled list, flat like the shop's other ledgers, each row led by its blue glyph at 20px: Collect at the shop (the street, the town and the open hours, read from `HOURS`), Or have it couriered (The Courier Guy, to the door or straight to the recipient, priced at checkout), and Need it by a date?, whose row carries the one action, a 44px hairline pill "Ask about a date" with the WhatsApp glyph. No make time is stated until the shop confirms one (`MAKE_TIME` in `data.ts`); until then the row asks the customer to check. The page opens on the cheapest priced variant, so the price on arrival is the "from" price the card quoted. The variant is held in `?variant=<SKU>` and written with the History API, so nothing is fetched. On a phone the breadcrumb keeps only its last two steps, the shelf and the page.

Below it, **Details and care** owns a full blue band: the specifications as a ruled list, Care headed in amber, and the shop's dimension drawing as a white print on the right from 56rem (it appears nowhere else). Then **More {category}**, the shelf pattern on white, up to four cards with "See all N {category}". The page carries Product and BreadcrumbList JSON-LD with no availability field, because stock has never been stated.

### Filter Pills
Every control in the shop that narrows or moves the catalogue is a pill: 44px tall, `0.55rem 1.05rem`, print white with the 1px hair rule (`{colors.rule-hair}`), ink label at 16px/600. A category pill carries its count in mono after the name. Current or pressed is the whole pill in brand blue with a white label (counts go soft white); hover on a storefront category pill is the same blue, hover on the toggle and the selects is only a blue edge. The selects are native, `appearance: none`, with a chevron drawn in the shop's stroke and 16px text, so mobile Safari never zooms on tap. There is no second blue and no grey for disabled; a control waiting for the URL simply does not respond.

### Navigation
- **Header:** sticky, solid brand blue, ending on a clean edge over the photo wall. The logo (`/logo/new.png`, white-and-amber lettering, so it only ever sits on blue) is sized by width, `clamp(175px, 46vw, 210px)`, below 62rem, because on a phone width is the bar's scarce axis, and by height, `clamp(35px, 3.7vw, 48px)`, from 62rem. From 62rem the bar adds the page's own short list of inline links at 15px in soft white — Shop, Categories and Find Us on the homepage; Shop, All products and Find Us elsewhere — and no gold action: the dock carries Shop now. Links underline nothing at rest; hover turns them white and draws a 2px amber bottom border. The bar marks no current page; inside the shop the rail does that job. The header and footer are shared components (`SiteHeader`, `SiteFooter`, styled in `app/site/chrome.css`); `#find-us` is the footer's anchor on every page.
- **Icon controls:** Search, Account and Cart, bare 21px marks in white inside 44px round targets, with a `rgb(255 255 255 / 0.12)` fill on hover. They are the bar's whole right end on a phone, all three down to 360px; under 358px Account steps out. From 75rem each says its name beside its mark (Micro, 15px), so no control is icon-only on a desktop. Search opens a field and a window: matching shelves, filters and products as the customer types, and before anything is typed the four occasions with most on them as chips. The window stops above the on-screen keyboard (`--keyboard`, from the visual viewport) and the combobox's `aria-expanded` follows whether a list is shown.
- **No drawer.** There is no menu button and no drawer at any width. Below 62rem the section links are a scroll away on the homepage, and in the shop the category pills do that job.
- **Skip link:** print white on a brand-blue 3px outline, parked off-canvas and pulled to `left: 0` on focus.

### The Order Dock
Two controls floating at the foot of the viewport on the shell's right edge, at every width, with nothing drawn behind them: the gold **Shop now** pill and a round print-white **WhatsApp** mark (52px, 60px from 46rem) with a `rgb(1 38 186 / 0.22)` hairline, a blue glyph and the blue glow, which is the one control legible over white and over every blue ground in turn. The container ignores the pointer, so the page stays reachable across the dock's width. It is the page's only standing action, because the cover carries no buttons, and at the foot of the page it comes to rest beside the footer's copyright line, which is sized to leave room for it (`--dock-h`). The pill goes to the storefront (`/shop`) and the round mark opens a WhatsApp chat with the shop's number, each saying so in its own label. Inside the shop the dock is the WhatsApp mark alone.

While a product's buy column passes through the band at the foot of the screen where the dock floats (anything marked `data-dock-clear`), the dock steps down and out and is inert, so the mark never sits on the total or Add to cart; it returns once the column has gone by. The header's cart icon stays meanwhile. On a phone (under 46rem) the dock also slides away while the page is scrolled down, more than 240px from the top and not near the foot, and comes back on any scroll up; the header, with Search and the Cart, stays put, so the page is read without a permanent overlay on its prices.

Once the cart holds something, the gold pill becomes **Cart** on every page and at every width. It takes Shop now's place outside the shop and fills the empty slot inside it. It carries the cart glyph and the count of units (not lines; "99+" past 99) on a blue disc in mono numerals, and the disc pops when the count changes. Tapping it opens the cart drawer. The header's cart icon is unchanged.

### The Cart Drawer
A native modal `<dialog>` (`app/site/Cart.tsx`, styled in `chrome.css`): a panel on the right edge, 28rem wide and the full width on a phone, sliding in over a blue-tinted scrim (`rgb(1 38 186 / 0.34)`, never grey); it fades in place under reduced motion. It opens on a blue band at header height ("Your cart" plus the unit count in mono), then the lines scroll between the band and a slip that never leaves the screen. A line is an 80px thumbnail (12px corner, card hairline), the name (card-title), the variant and what it takes in soft ink, then the shared quantity stepper, a Remove link underlined in amber, and the line price. The lines, then the savings and nudges and one line of reassurance (you review the whole order before paying, payment is secure through PayFast, with an inline "Ask the shop" WhatsApp link about a date), are the one region that scrolls; the slip under it holds only what must stay put: the subtotal (Statement size, tabular), the gold **Add your photos** (or **Checkout** when nothing takes a photo) with what comes next, and "Keep shopping". A line's Remove sits after the price, away from the stepper's +, and removing one leaves a ruled "Removed … Undo" row where it was, with focus moved to Undo; it goes with the next change or when the drawer closes. Each time it opens it re-checks prices against `/api/prices`: a changed price is updated and said once ("Price changed from … to …"), and a variant no longer on sale stays in the list, faded and left out of the order. Emptied, it says so and offers Browse the shop; the dock's Cart pill leaves when the drawer closes. The cart lives in localStorage (`app/site/cartStore.ts`) and the line logic in `lib/catalog/cart.ts`.


### The Photo Step
`/checkout` (`app/checkout/`, styled in `checkout.css`) is the cart with its photos placed. The header's blue carries into a title band ("Add your photos", breadcrumb Shop / Cart / Your photos) with the count of places filled in amber mono on the right. Under it on white, each line that takes photos is a door (18px, card edge, card lift): an 64px thumbnail, the name in Ledger size, the variant and what it takes in soft ink, then its choices as pills (quantity stepper; 1 photo / 2 photos where the product has both; The same on all / Different on each once there are two or more). Its **places** follow, each drawn at the print's real proportions and outline: a rectangle at 10px (a mug takes one photo a side, never round it), a circle for a coaster, an arch for a snow globe. An empty place is a dashed blue outline on a 4.5% blue wash with "Add photo"; a filled one shows the photo cut exactly as it will print, on white with a hair edge so any white border reads as paper, with the card lift. A photo goes in whole by default, never cropped for the customer: "Your whole photo, with white borders" offers "Fill to the edges", and once filled, "Edges trimmed to fit" offers "show the whole photo" back. An edited place says "Saving your edit…" while its own file is rendered and sent. Under each place: its name and its size in mono. Notes speak in glyph and words, never colour alone: "Edges trimmed to fit" in soft ink. Nothing on the step judges a photo's sharpness: that is the shop's to check, never the customer's.

The **tray** is a brand-blue panel (22px, blue glow), sticky beside the items from 62rem and docked full width at the foot of the screen below it. It holds the gold **Add photos** pill, the photos as 12px squares (80px on a phone) with a white mono "×N" disc for how many places each is in and a white pencil disc in the corner that opens the editor on that photo (where it already is, set the same way everywhere it is; not placed yet, previewed in the first empty place and placed on Done), a quiet **Remove all photos** link under them that asks once ("Remove all N photos? Every place they fill will be emptied.") before clearing every photo and placement, and, once something is placed, the count, a 6px amber meter, links to whatever still stands in the way, the subtotal, marked "before delivery", and the gold **Continue to details** (inert, a 14% white pill, until nothing blocks). On a phone the subtotal and note go, but the first thing in the way stays under the count, so Continue never scrolls without a word. What was just added, refused (a file that isn't a photo is named, never called a duplicate) or lost to a reload shows for eight seconds as a white-on-12%-white note under the tray's head; the page's live region says it aloud. The pencil disc is 32px with a 44px target, so the rest of the 80px square still picks the photo up. Tapping a photo picks it up: it gains a 3px amber ring, every place lights amber with "Place here", and the tray offers Fill all empty places, Remove and Done. Dragging a photo or a file onto a place does the same in one move.

Two native dialogs, on the cart's blue scrim. The **chooser** (a sheet from the foot on a phone, a centred 46rem card from there) shows every tray photo already cut to the place's outline. The **editor** (full screen on a phone, a 62rem panel from there) sets the photo on brand blue under a 70% blue veil with the place's outline in white; drag moves it, the arrow keys move it the way they point, and pinch, wheel and the slider zoom — pinch and wheel about the point under the fingers or cursor — in to crop, or out past filling the place until the whole photo shows on white paper, the white borders it prints with. Its blue head names the place and carries Use another photo and Empty this place as amber-underlined white links, beside what they act on. Under the stage: "The whole photo shows, with white borders filling the rest" once it is zoomed out that far; Whole photo, Rotate, Black and white and, for a non-square print, "Make it a landscape print" or "Make it a portrait print" (naming where it goes, not where it is) as pills (blue when on), and a quiet Start over only once something has changed; then the zoom slider ("Whole photo", "Filled to the edges" or a percentage to a screen reader) running up to the gold Done. On a phone the stage keeps over half the screen: the pills are one row that scrolls off the panel's edge. Focus opens on the stage. Only a change in the borders line is spoken, never each zoom step.

Print outlines sit below the 12/18/22 ladder on purpose, because they draw paper, not surfaces: 10px on a place, 8px on the review's prints, 6px on a chooser face and a frame's moulding, 4px on the editor's frame and paper.

A **frame** line draws the frame empty: a blue moulding round a dashed print at the frame's own proportions, its size in mono, and "Print not included". With a matching print on sale it offers "Add a 20 × 30 cm print · R…" as the blue button and Keep it empty as a link; until prints are priced it offers to ask the shop for a quote. The cart drawer says the same on a frame's line, with the print as a white pill. Lines that need nothing are a ruled list at the end, "Nothing needed from you".

Checkout has no order dock, so every step's title band carries "Not sure about something? WhatsApp the shop" under its lede, the message naming the order once there is one. On the details step the **slip** is the tray's blue panel again: its lines, sums, total and gold Pay. Docked on a phone it keeps to the total beside Pay, with "See breakdown" beside the word Total opening the lines and sums above them (an `aria-expanded` disclosure, up to 42% of the screen, scrolling), and "Secure payment by PayFast." and any sandbox notice always shown under Pay. The **receipt** ends each line on its own photos, small prints on white paper (72px tall, 4px white edge, 8px corners, card lift), each file once and at most eight before a mono "+N".
### Tables
- The hours table is ruled with leather hairlines, day labels in Archivo at 15.5px and times in mono at 13.5px, right-aligned and tabular. A closed row raises its value from soft white to full white, so the exception reads as the exception.

### The About Page
`/about` (currently hidden, in `app/_about/`) is Read mode set in the storefront's materials. It opens on the leaning sign (the storefront's device: "A real shop in Scottburgh", the town in amber) with a strip of 44px pills under it that jump to each section. On white: Our story and What we promise hold their heading in an 18rem rail from 62rem (sticky) beside the text; What we make is six bare prints (18px corner, card lift, no edge, because they go nowhere) with the shelves as pills; Visit us is the address, a ruled hours table in mono, and collecting and couriering in prose. How an order works owns a full blue band, the page's one: the highlighter line "You see your photos in place before you pay", then four ruled steps counted in amber mono, since the order is information there. Promises are a ruled ledger, each row a name, one sentence and a link to its clause. Nothing is carded and nothing is numbered but the steps. A fact the shop has not supplied is left off the live page; development and previews draw it as an empty photo place is drawn, a dashed blue outline on a faint wash.

### The Footer (signature)
The page closes on the shop's counter, kept compact, on the same brand blue as the header, so the page opens and closes on one blue. A "Come and find us" headline (Statement-loud, `clamp(1.5rem, 3.4vw, 2.6rem)`), then three columns from 56rem (`1.15fr 1fr 1fr`): **The shop** (address and a "Get directions" link underlined in amber), **Opening hours** (the ruled table), and **Talk to us** (five channels, each named once with its glyph: WhatsApp, call, email, Instagram, Facebook). Under a single hairline, the **sign-up** is one row from 56rem (`1.15fr 2fr`): "Email me specials" and one explanatory line on the left, the field on the right. It subscribes to specials and nothing more. The field is one 2px rule at `{colors.rule-leather-strong}` with an outlined pill **Subscribe** on its end (gold under the pointer); the rule turns amber on focus, and an autofilled field is held to the blue ground with an inset shadow. Pressing Subscribe emails a link, and the form swaps for a line that takes focus and says to check that inbox: the address is on the list once the link is tapped (`/subscription`), and every marketing email carries a one-tap Unsubscribe, so the form says nothing about whether an address is already a customer's. Under the field, the consent line, then a quiet row of two plain links, **Have an account? Sign in** and **New here? Make an account** (to `/account` and `/account#new`). The last row is the copyright line in mono, border-box like every shell row; sized in content-box it added both gutters to a 100%-wide row and ran past the screen.

### The Cover (signature)
Under the blue header, three rows of real product photographs at `clamp(140px, min(17vw, 22svh), 210px)` square (`clamp(130px, min(44vw, 22svh), 190px)` on a phone; sized by height too, because three rows, a strip and the sign share one screen), 18px radius, on print-white backing with the card hairline and card lift, laid in a wall inset `-10% -16% -5%` and rotated −4° so the rows run off both edges. Below 62rem the wall is packed from its foot, which guarantees a real slice of the last row above the edge and lets the header crop the first. From 62rem it is fitted instead: a one-column grid (`0 auto 1fr auto 1fr`) whose top and bottom padding is the lean, `tan(4°) × 50vw ≈ 3.5vw`, plus a margin. That keeps the word strip clear of the header at its high end and the last row whole above the leaning edge, and the two rows either side of the sign share what is left, so every print is whole at any screen height. The first row hangs above the strip in a zero-height track at about the size of the others, filling the wedge under the header. The headline drops to `clamp(2.75rem, min(9.6vw, 8.4svh), 4.5rem)` so a short screen gives up headline before work, the lede runs on one line from about 1280px, and the cover's floor is 700px.

Woven between the rows, in order: row, the travelling word strip, row, **the sign**, row. The sign is the headline set on the wall's own device: a full-width brand-blue band at the wall's lean, display headline in white with "gift shop" in amber, centred; under it, split by a leather hairline, a slimmer band carrying the lede at a 44ch measure (its inline padding adds the wall's ~12.2% overhang so the text never runs off a phone). The pair lifts off the photographs on a soft blue drop shadow. It holds still while the rows and the strip travel: the contrast in motion is what marks it as the one fixed sentence. The docked pair carries the actions.

At the foot, **the leaning edge**: a triangle of brand blue, `tan(4°)` of the width tall, rising left to right with the wall, meeting the catalogue with no seam. The catalogue's blue reads as the widest band, the one the wall comes to rest on.

**The Wall's-Own-Devices Rule.** Every element of the cover is something the wall already has: prints, blue bands, the lean. Nothing is laid over the photographs: no plate, no scrim, no gradient, no shape that is not a band. A white plate, a foot fade, a side scrim, a 35mm film frame and a halftone dome rising from the catalogue were all tried and rejected; the dome covered two-thirds of the wall. If the headline grows, the rows shrink by the `svh` term before the sign may cover a row.

### The Category Tiles (signature)
"Shop by category": seven compact tiles — Photo Printing, Frames & Display, Photo Gifts, Add-ons & Supplies, Jewellery, Gift Wrapping, Specials — each a link to `/shop/<slug>`. A tile whose category has nothing live yet (Gift Wrapping) lands on that shelf's honest empty state, not a 404. Four then three from 56rem, two by three below it, with Specials spanning two columns to close the last row, inside a 1180px cap, heading centred over the grid as the catalogue's is.

A tile is three things: a 48–58px icon disc (brand blue at 7% over white, holding a blue authored glyph at 28px) top-left, the 32px hairline arrow ring top-right, and the name on the tile's floor at `clamp(1.05rem, 1.45vw, 1.3rem)`/600. No blurb. 18px radius, card hairline, card lift, `clamp(128px, 10.5vw, 150px)` tall.

Under a hovering pointer (`@media (hover: hover)` only, so a tap never leaves it stuck) the tile becomes a piece of the catalogue's blue: white name, amber disc with a blue glyph tilted to the page's -4deg lean, the ring filled white. **Specials wears that state at rest** — one blue tile in eight is an accent; a second would be a pattern.

**The Icon Rule.** Category glyphs are drawn in `app/site/icons.tsx` on the shared 24px grid at the 1.6 stroke, as the object on the counter (two prints, a mitred frame, a photo mug, a cell, a ring, a camera, a wrapped box, a price tag). A new category gets a new drawing in the same hand, never a library icon.

### The Gifting Sign (signature)
The page's second sign, on the cover's own device: a brand-blue band 124% of the screen wide, leaning -4deg, the headline in white with "at your fingertips" in amber, the lede on a slimmer band under a leather hairline, the same blue drop-shadow. It runs in along its lean (`xPercent: -100`, 1.3s expo-out, staggered) when the section reaches 78% of the viewport; with reduced motion it is simply there. The section clips on x so the overhang is never a sideways scroll.

Under it on white: the highlighter line, then the two ways an order reaches its person as one two-column ledger split by a single vertical hairline (stacked with a horizontal one under 46rem). Each way is centred — the category tiles' disc at rest, name, blurb at 16px, slot — on a subgrid, so the courier's mark and the directions link share a floor. Every text element in the section is at least 16px.

### The Catalogue Wheel (signature)
Eight real products, laid down twice so sixteen frames fill the arc, pinned around a wheel far bigger than the screen, full bleed, each on a white frame with its name under it. The frame at the top of the arc sits highest and square; the rest fall away and lean with the curve. The second set is there to fill the curve, not to be read: its frames are `aria-hidden`, empty of alt text and out of the tab order, so a screen reader hears eight products and a keyboard stops at eight. Every frame is a link to the storefront at `/shop`, with prefetch off.

The geometry is CSS, not script. Every frame carries its index `--n`, and the stylesheet places it from that index and one inherited `--spin`: a drop of `--k × i²` (a circle, at these shallow angles) and a lean of `--step × i`, where `i` is its distance from the top of the arc. `--step` and `--k` are not independent — for a circle of radius R the drop per step is `pitch × step / 2` in radians — and both are set per breakpoint (12°/21px on a phone, 9°/17px from 48rem, 7°/15px from 62rem, 6°/16px past 90rem) because an angle cannot be clamped against a viewport unit. A `--dip` cap (`clamp(90px, 9vw, 150px)`) and a clamp on the lean keep the frames furthest round the wheel from sitting a thousand pixels down.

Because `--spin` and `--drag` are inherited and summed into one `--turn`, turning the wheel is one number: the frames re-seat themselves along the arc rather than sliding as a rigid shape. At `--spin: 0` the wheel sits square, which is what the page shows if the script never runs. The frames wrap round, so the wheel has no ends.

**The Geared-Not-Driven Rule.** The wheel has no motion of its own. The page turns it by scrubbing it to the section's pass through the viewport — scrolling down turns it left, scrolling up turns it back — bounded at ±2.2 steps — and it stops the instant the visitor stops. The visitor can also turn it by hand, on a phone with a swipe that ignores mouse pointers and coasts a little on release, and on a wide screen with two arrow buttons that move it one whole frame at a time. The arrows are drawn `hidden` and only the script reveals them, because without it they would do nothing, and they are not drawn at all below 48rem. Nothing on this page autoplays below the cover.

The row shows part of the catalogue, not all of it, and that is deliberate — the way to everything is the link above it, not this row. With motion reduced the arc flattens to a plain horizontal rail that scrolls by hand, and the arrows scroll it a frame at a time with no smooth travel, because an arc the visitor cannot turn is a row with its ends hidden.

### The Running Band (signature)
Not a room of its own: two brand-blue strips woven into the cover wall, one between each pair of photograph rows, leaning with the wall at −4° and drifting with it. Each is a flat blue ground carrying one nowrap line of the shop's words at band scale (products and occasions: Birthdays, Printed Mugs, Keyrings … Father's Day), duplicated once so the loop seams invisibly, each word separated by an amber slash. The shop's own mark (`/logo/new.png`) takes the place of a word every fourth word, so one is always on the visible side of the wall. Between the rows the band is texture, not a labelled section, and the ground is what keeps white words off a white product shot. It runs the full width with the photographs, between the first two rows.

### The Storefront (signature)
`/shop` reads top to bottom as the counter does for someone holding a photo:

- **The sign.** The homepage's device as the storefront's headline: a brand-blue band 124% of the screen wide, leaning −4°, "Your photo, / on N things" in white with the count in amber — read off the catalogue, so it is never a promise the shelves don't keep — and the lede on a slimmer band under a leather hairline, its gutter measured from the screen's edge rather than the band's. The sign lift sits under it. It does not run in: the storefront's sign is simply there.
- **The category strip.** Every shelf with live products as a pill with its mono count, one tap away; a swipe row on a phone, centred and wrapping from 46rem. It clears the band's low left end before its own space starts.
- **The photo board.** One photograph and everything it can go on. The sample customer portrait opens the board as the double cell titled "Your photo" — unbordered, because it is the visitor's picture and not a door. Every personalisable product follows as a product card, the ones the lede names first. The board ends on one blue door, "See all N side by side, by price", with an amber go disc and the blue glow: the one blue door in the board, the way Specials is the one blue tile on the homepage.
- **On special.** A blue band with a shelf of cards, shown only when the shop has flagged something.
- **Shop by budget.** Three white doors, one per price band, each with three overlapping thumbnails of its cheapest faces, the band at Statement Loud and the count with an amber go disc. Under a pointer a door turns brand blue the way a category tile does, its count soft white.
- **The size chart.** On blue: every frame size on one ladder, drawn to true scale from a shared corner, largest underneath. At rest each print is a 1.5px outline in the dark rule; the picked one takes a 2.5px amber stroke and **no fill** — a lighter fill inside it would be a second blue. Beside it, a real radio group: ruled rows at least 48px tall, a 20px ring that fills with an amber dot, the measure in mono and the price at 16px/600; the picked row and a hovered row go full white. The drawn label is mono and is hidden under 46rem, where it would fall under 16px and the list already names the size. The frames it describes stand under it as product cards.
- **Shelves.** "Frames and easels" and "Photos and albums" as shelf heads with an amber-underlined "See all" and a row of cards.
- **The prints note.** The prints the shop sells but does not price online, said plainly beside the photos shelf: a Subtitle, a 44ch paragraph and the blue WhatsApp button. Prose, not a box: one hairline above it on a phone, beside it from 62rem.

### The Catalogue (signature)
`/shop/all`, `/shop/specials` and `/shop/<category>`. The header's blue carries on into a **title band** — breadcrumbs (Shop / the shelf, amber slash, soft white, white with an amber underline on hover) over the shelf's name at headline scale — so bar and name read as one ground and everything under it is white and products.

- **The rail.** Below 62rem a full-bleed strip of category pills on white, sticky under the header with a paper hairline beneath, so any shelf is a thumb-swipe away at any depth. From 62rem a 15.5rem ruled list beside the grid, sticky, each entry a name and its mono count on a 12px shape, a 7% blue wash on hover, the current shelf filled brand blue.
- **The toolbar.** The count ("N products", plus "of M" when filtered) in soft ink with the number in ink, then the photo toggle (YourPhoto glyph, "Takes your photo", offered only where it would change something), the occasion, recipient and price selects, and sort. On a phone the filters fold behind a **Filter** pill (sliders glyph, a blue mono disc counting the filters set) beside sort, and open beneath as a stacked panel on a 5% blue wash. State lives in the URL and re-sorts in place.
- **Applied filters.** Each filter in force is a removable pill (brand-blue edge, 6% wash, ×), with "Clear all" as an inline link from two. On a phone they stand in for the folded selects; from 46rem only a filter with no control of its own (a type with no chip row) is listed. A filter value in the URL the shop does not know is dropped and said once in soft ink, never silently.
- **The card's photo line.** "Takes your photo" shows only on a shelf that mixes photo and non-photo products; where every card has it, it is dropped.
- **The grid.** Product cards, two, three or four across.
- **Nothing to show.** A filtered shelf with no match says so at Statement Loud with a Lede and a blue "Clear filters". A search with no match suggests words to try, offers to ask on WhatsApp, and shows four of the shelf's photo products ("Things your photo can go on") so it is never a dead end. A shelf with nothing priced online is not a 404: it says what is true, offers "Ask on WhatsApp" and an inline link to all products; an empty Specials says when it will fill.

**Shop motion is headroom, not a rule.** The shop has no scroll motion, no entrance and no GSAP: only the hover transitions above (lifts, the blue turn, the go disc's tilt, the photograph's 1.04) on `--ease-out`. The single orchestrator lives with the homepage; if the shop gains motion it follows the From-Visible Rule.

### Motion
All page motion is orchestrated in one client component (GSAP 3.15 + ScrollTrigger), never scattered across components. It runs inside a single `gsap.matchMedia` block and through an isomorphic layout effect, so entrance states are set before the browser paints the hydrated tree and the cover does not flash. Six moments:

1. **The cover wall** — each of the three rows travels horizontally at its own duration (116s / 148s / 92s over a loop that lays the set out twice), alternate rows reversed, each row holding its set twice so `-50%` lands exactly on the seam. The five endless loops (three rows, two strips) run only during the cover's own pass through the viewport and are paused after it, so five layers of photographs are not repainting under a page nobody is looking at them from. The whole wall drifts `yPercent: 12` and scales to 1.06, scrub-linked (0.6) to the cover's own scroll.
2. **The cover entrance** — the headline's band runs in from `xPercent: −100` along the wall's lean and stops (1.3s `expo.out`), as if a travelling strip came to rest; the lede's band follows 0.12s later. On the way out the sign drifts `y: −48`, scrubbed (0.6) to the cover's pass, a little less than the wall behind it, so it lifts off the photographs.
3. **The word strips** — 66s and 52s linear loops, each travelling against the row above it and on a duration that shares no rhythm with the rows' 116 / 148 / 92, so the wall never beats in time.
4. **One reveal grammar** — `ScrollTrigger.batch` over `[data-reveal]` (from `y: 30`, 0.9s, stagger 0.08, at 88% viewport), firing once. The category tiles enter on this batch on screens 48rem and wider, and hold still on a phone. The gifting sign is the one other authored entrance. The highlighter-marked line fills its stroke from `backgroundSize: 0% 100%` as it arrives.
5. **The catalogue wheel** — no duration of its own: `--spin` is scrubbed (0.6) from +2.2 to −2.2 across the section's pass through the viewport, so the arc turns with the visitor's scroll and stops when they do. The tween writes one custom property and the stylesheet re-seats sixteen frames from it.
6. **Turning the wheel by hand** — a touch swipe and the desktop arrows both write `--drag`, which the stylesheet adds to the scroll's `--spin`, so the hand and the page never fight over one number: the page keeps turning the wheel from wherever the hand left it. A swipe moves it by the finger's distance in frames and, on release, carries on by the finger's velocity and settles (0.9s `power3.out`); an arrow press turns it to the next whole frame (0.7s). A swipe that ends on a frame is not a tap on it.

**The From-Visible Rule.** Every tween is a `gsap.from` off an already-visible default. The markup renders complete; if the script never runs the page is intact and merely still. Nothing may be hidden in CSS and revealed by JS.

**The Single-Orchestrator Rule.** New motion goes into the existing `matchMedia` block, not into a new component effect. `prefers-reduced-motion: reduce` returns before a single tween is created — not after, and not by reverting them — and the global stylesheet additionally collapses every CSS keyframe animation to 0.001ms and cancels the hover transforms. **Reduced motion removes movement, not feedback:** colour, border and shadow transitions keep their authored duration, because the category tile turning blue and the sign-up's rule going amber are state, not animation.

## The Admin Console

Operate mode: `app/admin`, drawn by `app/admin/admin.css` on the same tokens as the shop. Brand blue is the sidebar (the one loud ground), the ink and the primary action; pages are white; Archivo is read, Geist Mono is codes, SKUs and web addresses. Amber marks one thing: a change not yet saved (and, as on the shop, a Special). Red is a status, for what needs a look. Hover on anything solid blue is one pressed blue, `--blue-deep`.

- **Navigation.** Pages are grouped by how often they are opened: Day to day (Dashboard, Orders, Products, Stock), Shop (Campaigns, Customers), Money (Payments, Courier, Analytics), Setup (Settings, View the shop), a hairline between groups. From 62rem the labels show; from 46rem to 62rem it narrows to icons with tooltips. Under 46rem the blue bar keeps only the logo (which is the way to the Dashboard) and the pages are a tab bar at the thumb: Orders, Products, Stock and More, which opens a sheet of everything else with Sign out. The floating save and bulk bars sit above it (`--tabbar`).
- **Orders.** An order's stage is a mark that fills as it goes (empty ring New, half Being made, full Ready, a quiet full dot when done) and reads without colour. To do narrows by stage with chips that count; the dashboard's stage rows open the matching one. Each row says what is in the order and how many photos wait to be printed. On the order page, the one next step is the dominant card; a phone shows the stage as "Step 2 of 5" rather than five stacked rows, and Next order walks the queue.
- **Dashboard.** For whoever is at the counter, so the work comes before the figures: one queue card (every flagged order, then the order waiting longest as the page's one tinted line with how long it has waited, then the stages), beside it the courier (a status line first, whether a courier is booked, coming or overdue, then the orders ready to send against those still being made, and the page's one primary button, Book courier collection, which opens a dialog listing the parcels and orders it will book and the collection day and hours before anything is sent; red only when the courier is overdue or not set up), the collection orders nobody has picked up (not drawn on a good day) and what has been paid today against this time yesterday; stock, deals and hidden products sit in a quieter row below. Lateness is red, the status colour, with an alert mark and the words, never amber, which stays for unsaved changes and Specials. On a phone it is one column in that order.
- **Efficiency.** `/` focuses search on Orders, Customers, Products and Stock.
- **Touch.** Under 46rem every button is at least 44px high, whatever size it is drawn at on a desk. Under 46rem no text is under 16px: the list in "The 16px floor" of `admin.css` must name any new rule that sets a smaller size.
- **Radii.** The 12px step for controls, rows, thumbnails and notes; 18px for cards; 22px for large panels; pills. Keycaps (6px) and 2-4px bars, and the dome in the print-shape diagrams, are drawn marks, not components, and keep their own.
- **Tooltips.** Help is in the place a member of staff stops. `Tip` (`app/admin/Tip.tsx`) is the circled "i" beside a heading or label whose meaning isn't plain from its word (Stock's Track, Sold out at and Low at; Courier's Waybill and Difference; Payments' Fee; Analytics' Viewed, added); it opens on hover, focus and tap, and a screen reader hears the same words. `Hint` names an icon-only or terse control on hover and focus (move up and down, Remove, Download and Print, the dashboard's count links, the month arrows), and never on touch, where the icon is all there is to press. A tooltip says what a thing is or does in one or two sentences, in the shop's words; whatever a person must know to avoid a mistake stays in the page.
- **Failures.** Say what happened to the page, that nothing was changed, and what to do; never a variable name. A live region wraps the step's title only, never a form that re-renders as it is edited.

## Do's and Don'ts

### Do:
- **Do** let a ground own its section edge to edge — brand blue (header, the cover's bands, catalogue, footer) alternating with white (the wall's ground, categories, gifting).
- **Do** spend amber on the action, the marked line, the band slashes, marks on dark, `::marker` and `::selection` — and stop there.
- **Do** set every mark, hours value, colophon and base line in Geist Mono, and everything readable as a sentence in Archivo.
- **Do** keep the cover wall unwashed and set its type only on its own blue bands. Never lay a plate, scrim or shape over the photographs.
- **Do** tune the focus ring to its ground: brand blue by default, amber inside `.on-dark`, ink on `.on-gold`. A single ring colour is invisible on one ground or the other — blue disappears into the blue panels, amber disappears into paper.
- **Do** tint secondary text from its ground's hue (brand blue at 80% / 72% on white, white at 80% on blue).
- **Do** rule lists and tables with hairlines, and reserve borders for the door cards that lead somewhere (category tile, catalogue frame, product card, budget door).
- **Do** keep the category tiles four-by-two on a wide screen and two-by-four on a phone, names only.
- **Do** gear the catalogue wheel to the visitor's own scroll rather than to a clock, and keep its turn inside the bound that holds the arc full.
- **Do** animate from an already-visible default, inside the one `matchMedia` block.
- **Do** cap prose at its measure (62ch default) no matter how wide the shell is.
- **Do** keep every new text element at 16px or more on mobile, and every input, textarea and select too (The 16px Floor).
- **Do** render product photographs with `ProductImage` at the widths it already offers (400 and 640), and let a new width join that list rather than appear at a call site.
- **Do** make a second action on a section an amber-underlined `.inline-link` rather than a second button.
- **Do** draw icons on the 24px grid at 1.6 stroke with round caps, and keep brand marks solid.
- **Do** make every shop filter a 44px pill at 16px, current or pressed in whole brand blue, and set its counts in mono.
- **Do** mark a picked state on blue with the amber edge alone, as the size chart does.

### Don't:
- **Don't** make amber the background of a region, section, card or hero. It is a highlighter, not an upholstery.
- **Don't** set body copy, headings or button labels in mono, and don't letterspace Archivo positively.
- **Don't** introduce a radius outside 12 / 18 / 22 / 999px, or square off a corner.
- **Don't** use grey or black shadows; shadows are tinted by what casts them, and only actions, the door cards, the signs and standalone photographs cast one.
- **Don't** float a coloured panel inside a differently-coloured section instead of banding the ground.
- **Don't** use a grey neutral for secondary text.
- **Don't** hide content in CSS for a JS reveal to uncover, and don't make a display row the only way to reach what it displays — the catalogue wheel shows a middle, and the link above it is the path.
- **Don't** ship a dark-mode variant; `color-scheme: light` is declared and the dark grounds are composition, not theme.
- **Don't** add a menu drawer or hamburger to the header; the bar is the wordmark and its icon controls on a phone, and the section links are a scroll away.
- **Don't** put a product photograph in `public/` or ask Cloudinary for a size outside the shared list; the free plan meters every derived size and every byte stored.
- **Don't** state a price that is not read from the catalogue, and don't add a review, a rating or a turnaround promise; none has been supplied (see `app/site/data.ts`). Shop prices come from Firestore only.
- **Don't** swap Archivo for the template's Outfit or any other default face without a reason no other face could satisfy.

<!-- Inheritance note (scope, not system): this pass shipped one surface — the homepage — by the user's explicit instruction. There was then no reusable shell, and header and footer were built inside `app/page.tsx` (since extracted; see v6). Mantine, named in PRODUCT.md as the project's primary UI foundation, is deliberately unused here: stock components inside a committed world are a lapse, and Mantine is expected to carry the upload / configure / checkout flow instead, restyled to these tokens. No order flow exists yet: Search, Account and Cart are dead ends (`#`), product cards link to `/shop/product/<slug>` (built in the product-page pass, whose Add to cart is inert until the cart ships), and the one live order channel is the `wa.me` link behind the dock's round mark and the footer's WhatsApp row, built by `whatsapp()` in `app/site/data.ts`. Repoint those when the product page and cart ship. Unspent headroom, recorded so a later pass knows where it is and not as a rule: no print-edge, white border, lab sleeve or counter material appears anywhere — the catalogue frame is a generic rounded rectangle a shop selling anything could wear; nothing measured is stated as a design element (no sheet size, no live "open now" read off the hours table); and collect-or-deliver is two icon+heading+paragraph blocks side by side, the card-scaffold shape without the card. -->

<!-- Client revision (v2, 2026-10-06): brand blue moved to #0126BA; the only logo file is /logo/new.png, used in the header and every fourth word of the cover's word bands; the gifting section is white and the catalogue brand blue; the cover is white under the blue header; "Our Services" is brand blue; the catalogue wheel has desktop arrows that drive the same `--drag` as the phone swipe; the footer is compact — no logo, a smaller "Come and find us", three columns, a one-row sign-up, and a last row sized to the dock so the docked pair rests beside the colophon. The cropped "EXPRESS" wordmark and its Montserrat face are gone. -->

<!-- Client revision (v3, 2026-10-06): the catalogue moves up to follow the cover directly. A halftone dome rising from the catalogue into the wall was built and rejected by the client the same day — it filled too much of the screen and hid the wall. It is replaced by the headline band and the leaning edge, so the cover uses only the wall's own devices. Services and gifting now sit next to each other on white; the client will look at the other sections in a later pass. -->

<!-- Client revision (v4, 2026-10-06): "Our Services" (three illustrated cards) is replaced by "Shop by category", eight compact icon tiles in a 4x2 grid with Specials in blue at rest; the header link reads "Categories" and points at #categories. The gifting section keeps its copy but takes the cover's leaning headline band, and its delivery/collection rows become a centred two-column ledger. The /public/illustrations SVGs are no longer referenced. -->

<!-- Documentation refresh (v5, 2026-10-07): re-derived from the shipped code. Product photographs moved from `public/products/web/*.webp` to Cloudinary behind `ProductImage` (widths 400 and 640). The header lost its menu button and drawer and gained Search, Account and Cart icon targets and a Shop now that appears from 62rem; the dock became a Shop now pill plus a round WhatsApp mark; the cover carries no buttons and no scroll cue; the ghost and outline buttons, the chips and the section marks are gone from the page and from the tokens. The wheel is eight products laid twice (sixteen frames), wraps, and can be turned by hand. The recorded card-lift values were corrected to the stylesheet's 0.4 / 0.5, and the header is recorded as casting no shadow. The footer is three columns plus a sign-up row. The 16px Floor was recorded, with the roles that still break it. -->

<!-- Client revision (v6, 2026-10-07): the shop ships. `/shop` is the storefront (leaning sign with the live count in amber, category pill strip, the photo board with the customer portrait and one blue "see all" door, specials when flagged, budget doors, the Royal frame size chart, frames and photos shelves, the prints note); `/shop/all`, `/shop/specials` and `/shop/<category>` are the catalogue (blue title band with breadcrumbs, sticky rail, pill toolbar with URL state, 2/3/4-column grid, empty and no-match states). Shared chrome moved out of the homepage into `SiteHeader`, `SiteFooter`, `OrderDock` and `app/site/chrome.css`; `home.css` holds only the homepage rooms. The header's and dock's Shop now go to `/shop`, the category tiles to `/shop/<slug>`, "Browse the full catalogue" to `/shop/all`, the wheel's frames to `/shop`. Inside the shop the header nav is Shop / All products / Find Us and the gold Shop now is dropped from the bar and the dock. The footer's last row is border-box. New tokens recorded from the build: card, hair and dark rules; the Price and Count roles; the product card, filter pill, Special chip, budget door, "see all" door and title band components; the sign lift. New glyph: YourPhoto. -->

<!-- Targeted refresh (v7, 2026-10-26), after a critique of `app/site`. Merged into the existing text, not regenerated; `.impeccable/design.json` has not been re-derived and still describes the v6 chrome. The header lost its gold Shop now and gained named marks from 75rem, all three marks to 360px and a 15px nav; the dock hides while a phone is scrolled down; the cart drawer gained Undo, a scrolling slip and a reassurance line; search got occasion chips and keyboard-aware sizing; the footer sign-up became a confirmed email subscription with a separate sign-in line, `/account` gained Make an account, and `/subscription` is where the emailed links land. New token: `rule-leather-strong`. Type roles Mark, Slot, Measure, Colophon, Micro and the footer's small print were raised; the footer and legal clamps now use the Statement-loud and Statement steps; the two 14px radii moved to the 12px step. The inheritance note above (Search, Account and Cart as dead ends, Order on WhatsApp) is superseded: all three work and checkout is online. -->
