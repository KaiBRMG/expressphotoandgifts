---
name: Express Photo and Gifts
description: A shop counter in brand blue and warm paper, where the shop's own work is the argument and amber is the only highlighter.
colors:
  blue: "#001DA4"
  blue-lift: "#0A2FD6"
  gold: "#FFB72A"
  leather: "#001DA4"
  leather-deep: "#000F5A"
  card: "#0B0D16"
  paper: "#FBFAF8"
  paper-deep: "#F2EFE9"
  print: "#FFFFFF"
  ink: "#101013"
  ink-soft: "#4C5070"
  ink-faint: "#5F6480"
  on-leather: "#FFFFFF"
  on-leather-soft: "#B9C2EE"
  on-card-soft: "#9AA0BF"
  rule-paper: "rgb(16 16 19 / 0.13)"
  rule-leather: "rgb(255 255 255 / 0.22)"
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
  drawer-link:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 500
    lineHeight: 1.3
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
  caption:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  micro:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  mark:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.16em"
  mark-sm:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.16em"
  slot:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12.5px"
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
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
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
    backgroundColor: "{colors.blue-lift}"
    textColor: "{colors.print}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.print}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.65rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.65rem"
  button-compact:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.6rem 1.05rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.05rem"
  chip-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.print}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.05rem"
  chip-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.05rem"
  card-service:
    backgroundColor: "{colors.print}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "clamp(1.05rem, 2.2vw, 1.9rem) clamp(0.85rem, 1.7vw, 1.5rem) clamp(1rem, 1.9vw, 1.6rem)"
    width: "grid column, two-up under 56rem and four-up above"
  card-frame:
    backgroundColor: "{colors.print}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.85rem 1.05rem 1rem"
    width: "clamp(186px, 23vw, 280px)"
  header:
    backgroundColor: "rgb(251 250 248 / 0.84)"
    textColor: "{colors.ink}"
    padding: "0.7rem {spacing.gutter}"
    height: "{spacing.header-h}"
  section-mark:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    typography: "{typography.mark}"
  section-mark-on-dark:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
    typography: "{typography.mark}"
  cover-image:
    rounded: "{rounded.md}"
    backgroundColor: "{colors.print}"
    height: "clamp(150px, 17vw, 258px)"
---

# Design System: Express Photo and Gifts

## Overview

**Creative North Star: "The Shop Counter"**

This is a printed shop, not an app. The argument is the shop's own work: the first thing a visitor meets is a full-bleed wall of real product photographs travelling past behind one plain sentence, and from there the page reads the way the counter reads — four service cards that are each a door into the shop, one catalogue row travelling past, then where to find the real door. Deep brand blue owns the loud surfaces whole; warm paper owns the surfaces you read on; near-black closes the page. Nothing is quiet for the sake of being quiet.

The density is deliberate and left-weighted: display type sits low-left at large clamped sizes with tight negative tracking, headings and actions hold one left edge from header to footer while the loud rows run full bleed past both, and long prose is capped at a 62ch measure so a wide shell never turns into a wide paragraph. Depth is low and warm — pill actions carry a coloured glow rather than a grey drop shadow, cards carry one soft blue-tinted lift, and everything else earns separation from its ground instead of from a shadow.

The system has one accent and uses it like a highlighter, not like a second brand colour. Amber marks the action to take and the line worth remembering; it never becomes a region. There is no dark variant — `color-scheme: light` is declared, and the dark surfaces are compositional grounds, not a theme. The confirmed rejection is the previous build's sparse gallery treatment: the failure there was under-spending the material, not choosing the wrong material.

**Key Characteristics:**
- Four grounds in rotation: brand blue (loud), warm paper and deeper paper (reading), near-black (close).
- Amber as the shop's highlighter — actions, one marked line, band slashes, marks on dark; never a region's background.
- Two families, strictly divided: Archivo for prose, Geist Mono for marks and measurements only.
- Pill actions (999px), 12/18/22px surface radii, one soft blue-tinted elevation.
- A load-bearing cover scrim that turns a wall of white-ground studio photographs into a single readable surface.
- Focus rings that change colour with their ground.
- Motion animates from an already-visible default; with JS off the page is complete and merely still.

## Colors

A two-value brand — deep blue and amber — laid over warm paper and near-black, with secondary inks tinted from the ground's own hue so nothing ever goes grey.

### Primary
- **Brand Deep Blue** (`{colors.blue}`): the binding brand value, supplied by the shop. It owns the cover, the running band and the find-us panel *whole* — edge to edge, not as a panel inside a lighter page. On paper it is also the default focus ring, the caret, the scrollbar thumb, the catalogue subtitle, and what a service card turns — name and go ring both — under the pointer. Takes white text.
- **Blue Lift** (`{colors.blue-lift}`): hover state for the blue action only. It exists so a blue button on paper brightens rather than darkens; it is not a palette member for surfaces.

### Secondary
- **Foil Amber** (`{colors.gold}`): the shop's highlighter. Primary actions, the highlighter-marked line, the slashes in the running band, section marks and block headings on dark grounds, the corporate-gifts chip, the footer phone number, `::marker` and `::selection`, and the underline under "Get directions". It pairs legibly with ink or with brand blue and never takes white text.

### Neutral
- **Leatherette** (`{colors.leather}`): the blue ground under the cover, its word strips and the shop panel. Same value as brand blue, named for its role so a surface and an accent are not confused at call sites.
- **Deep Leather** (`{colors.leather-deep}`): the darkest stop in the cover scrim, and the only place it appears.
- **Night Card** (`{colors.card}`): the near-black that carries collect-or-deliver and the footer, closing the page.
- **Shop Paper** (`{colors.paper}`): the body ground and the reading surface for the gifting/services section; also the translucent header base.
- **Deeper Paper** (`{colors.paper-deep}`): the catalogue's ground and the scrollbar track — one step down from paper, so the catalogue sits in a trough ruled top and bottom.
- **Print White** (`{colors.print}`): product cards, the photographs' own backing, the skip link.
- **Ink** (`{colors.ink}`): body text on paper, text on amber.
- **Soft Ink** (`{colors.ink-soft}`): secondary prose on paper — ledes, blurbs, nav at rest. Blue-leaning, never grey.
- **Faint Ink** (`{colors.ink-faint}`): the quietest paper tone — the occasions label and the service card's go ring at rest.
- **On Leather** (`{colors.on-leather}`) / **Soft Periwinkle** (`{colors.on-leather-soft}`): white and its softened partner on blue — headline and body versus ledes, hours values, contact glyphs.
- **Soft Card Ink** (`{colors.on-card-soft}`): the softened tone on near-black.
- **Paper Rule** (`{colors.rule-paper}`) / **Leather Rule** (`{colors.rule-leather}`): the hairline dividers. The handover rows, the hours table and the band edges are ruled, never boxed; inside the catalogue frame the same hairline separates the photograph from its caption.

### Named Rules

**The Highlighter Rule.** Amber marks; it does not upholster. It may carry a button, a line of text, a slash, a mark, a chip, an underline or a marker glyph — it may never be the background of a whole region, a section, a card or a hero. Audit test: if you can point at an amber area larger than a button, it is wrong.

**The Whole-Ground Rule.** A ground owns its section edge to edge. Blue, paper, deeper paper and night card alternate as full-bleed bands; a coloured panel floating inside a differently-coloured section is not part of this world.

**The Tinted-Neutral Rule.** Secondary text is tinted from its ground's hue — blue-leaning on paper, periwinkle on blue, cool slate on near-black. There is no grey in this palette.

## Typography

**Display Font:** Archivo (self-hosted via `next/font`, with `system-ui, sans-serif`)
**Body Font:** Archivo
**Label/Mono Font:** Geist Mono (with `ui-monospace, monospace`)

**Character:** Archivo is a grotesque with enough width and weight to carry a six-rem headline at 0.94 line-height without looking inflated, and enough neutrality to disappear at 14.5px. Geist Mono is the shop's stamp: small, tracked out, uppercase, and only ever attached to something counted or measured. **Why Archivo and not the template's face:** the pinned template is set in Outfit, which the project's own new-work guidance lists among the training-data default faces that require "a reason no other face could satisfy". Archivo carries the template's density and left-weighted display without inheriting its default face, and is self-hosted with `font-synthesis-weight: none` so no weight is ever faked.

### Hierarchy
- **Display** (600, `clamp(2.8rem, 8.2vw, 6rem)`, 0.94, −0.035em): the cover headline only, two lines, lower-left.
- **Headline** (600, `clamp(1.9rem, 4.4vw, 3.6rem)`, 1.02, −0.03em): every section `h2`, balanced.
- **Band strip** (500, `clamp(0.85rem, 1.5vw, 1.25rem)`, 1.15, −0.025em): the word strips woven between the wall's photograph rows — small enough to read as one more thing travelling past rather than as a headline competing with the one fixed sentence on the cover.
- **Statement** (600, `clamp(1.2rem, 2.2vw, 1.75rem)`, 1.3): the highlighter-marked line, the only prose that takes the amber stroke.
- **Subtitle** (600, `clamp(1.1rem, 2vw, 1.4rem)`): the collect-or-deliver headings, set inline with their icon, and the catalogue's own subtitle — which takes brand blue rather than soft ink, because it is the second step in a hierarchy and not quieter prose.
- **Title** (600, `clamp(1rem, 1.25vw, 1.15rem)`): service card names. It sets at the lede's size and is told apart by weight, not scale — at a quarter of the shell there is no room for a larger step, and four names in a row do not need one.
- **Card Title** (600, 17px): catalogue frame captions.
- **Cover Lede** (400, `clamp(1rem, 1.45vw, 1.2rem)`, 1.55, 58ch): the one sentence under the display line.
- **Lede** (400, `clamp(1rem, 1.3vw, 1.15rem)`, 1.62, 62ch measure): section-opening prose.
- **Address** (400, `clamp(1rem, 1.5vw, 1.15rem)`, 1.65): the street address block.
- **Body** (400, 15.5px, 1.65): the collect-or-deliver paragraphs, contact rows, hours day labels.
- **Body Small** (400, 14.5px, 1.6): footer lists, footer blurb, fulfilment note.
- **Caption** (400, 14px, 1.5): chips and card blurbs.
- **Micro** (400, 13.5px): compact header actions and nav, service card blurbs.
- **Mark** (mono, 400, 11.5px, 0.16em, uppercase): section marks, the scroll cue, the shop block headings. 11px on the footer columns.
- **Slot** (mono, 400, 12.5px): the footer base line.
- **Measure** (mono, 400, 13.5px, tabular): hours values. The hours table sets `font-variant-numeric: tabular-nums` so the times column aligns.
- **Colophon** (mono, 400, 13px): the footer phone number.

### Named Rules

**The Two-Families Rule.** Archivo sets everything written in prose. Geist Mono sets only marks and measurements — section marks, the scroll cue, the shop block headings, hours, the footer colophon and base line. Mono is never body copy, never a heading, never a button. Audit test: read the mono string aloud; if it is a sentence, it is in the wrong family.

**The Tight-Display Rule.** The larger the type, the tighter it sets: −0.035em and 0.94 line-height at display, −0.03em at headline, normal tracking by the time it is prose. Never letterspace Archivo positively; positive tracking (0.16em) belongs to mono alone.

**The Measure Rule.** Prose is capped — 62ch for ledes, 58ch on the cover, 44ch for fulfilment paragraphs, 36ch in the footer — regardless of how wide the 1400px shell gets. The service card blurb needs no cap: its column is already narrower than any measure would set.

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

One shell, 1400px wide, centred, with a fluid gutter of `clamp(20px, 5vw, 56px)` that every full-bleed band re-applies internally so type stays on a single left edge from header to footer. Section rhythm is `clamp(62px, 9vw, 130px)` of vertical padding, with the catalogue slightly tighter (`clamp(52px, 8vw, 100px)`) and the running band tighter still (`clamp(30px, 4.5vw, 54px)`) so it reads as a rule between rooms rather than a room.

Breakpoints are declared in rem and each one does a single job: 46rem splits collect-or-deliver into two; 56rem takes the service cards from two-up to one row of four, opens the find-us grid to `1.15fr 1fr 1fr` and the footer to `1.7fr 1fr 1fr 1fr`; 60rem splits the gifting section into two columns; 62rem is the shell breakpoint — the inline nav appears, the mobile drawer and menu button disappear, the secondary header action returns, and the header grows from 66px to 74px. Anchors compensate with `scroll-margin-top: calc(var(--header-h) + 28px)`.

The cover subtracts the sticky header's height from the viewport (`min(calc(100svh - var(--header-h)), 900px)`) because the header sits in flow above it; without that, the scroll cue lands just past the fold. The catalogue row is full bleed inside an `overflow: hidden` section while its heading, subtitle and link keep the shell's left edge, so the row alone reads as carrying on past both sides.

**The One-Edge Rule.** Every band re-applies the shell and gutter. A full-bleed background never means full-bleed content.

## Elevation & Depth

Low and warm. There is no grey drop-shadow vocabulary and no elevation ladder; depth comes from ground changes, hairline rules and two coloured glows. Actions carry a glow in their own colour, tightly negative-spread so it reads as light on the surface under the button rather than as a box floating above it. Both card kinds carry the same blue-tinted lift, which deepens on hover as the card rises. Everything else — chips, the hours table, the fulfilment blocks, the footer — is flat, separated by 1px rules at `{colors.rule-paper}` / `{colors.rule-leather}` or by a change of ground.

The header is the only translucent surface: `rgb(251 250 248 / 0.84)` with a 14px backdrop blur and a hairline bottom rule.

### Shadow Vocabulary
- **Gold action glow** (`box-shadow: 0 18px 38px -20px rgb(255 183 42 / 0.95)`; hover `0 22px 44px -20px rgb(255 183 42 / 1)`): under the amber primary action only.
- **Blue action glow** (`box-shadow: 0 18px 40px -22px rgb(0 29 164 / 0.9)`): under the blue action on paper.
- **Card lift** (`box-shadow: 0 22px 44px -32px rgb(0 29 164 / 0.55)`; hover `0 30px 54px -30px rgb(0 29 164 / 0.6)`): the service card and the catalogue frame, at rest and raised.

### Named Rules

**The Coloured-Shadow Rule.** A shadow is tinted by the thing casting it — amber under the amber button, brand blue under the blue button and the white card. Black or neutral-grey shadows are not part of this world.

**The Rule-Not-Box Rule.** A list, a ledger or a table is separated by 1px hairlines, not by a border around each item: the handover rows, the hours table and the footer columns are all ruled. A card is not a list item — it is bordered when it is a *door*, something that can be pressed and that leads somewhere. Two kinds qualify and no others: the service card and the catalogue frame. Both wear the same 1px `rgb(16 16 19 / 0.09)` border, the same 22px radius, the same blue lift, and the same internal hairline between the picture and the words. Audit test: if a bordered box on this page does not go anywhere when you press it, it is wrong.

## Shapes

Two shapes, and nothing between them. Anything you press or tag is a pill (999px): buttons, chips, the menu button, the cover's scroll-cue ring, the footer's social marks, the scrollbar thumb. Anything that holds content is a soft rectangle on the 12 / 18 / 22px ladder: 18px on the cover wall's photographs, 22px on both card kinds, 12px reserved for smaller surfaces. Corners are never square and never fully circular except on the round 40–42px controls, where the pill radius resolves to a circle.

Borders are 1px and low-contrast — `rgb(16 16 19 / 0.09)` around the card, `rgb(16 16 19 / 0.16–0.20)` on chips and outline buttons, `rgb(255 255 255 / 0.2–0.36)` on dark grounds. Rotation appears in exactly two places and they are opposites, so the two rows are never read as the same device: the cover wall leans as a whole (−4°) and the photographs inside it stay square, while the catalogue row has no lean of its own and every frame takes its angle from where it sits on the wheel. Hovering a frame takes it off the wheel — it squares up and lifts. Nothing else in the system rotates.

Icons are authored on a 24px grid and inherit `currentColor`. Outline marks share a 1.6 stroke with round caps and joins; brand marks (WhatsApp, Instagram, Facebook) are solid, because that is how those marks are drawn. They render at 15–22px inline with their text.

**The Two-Shape Rule.** Pill or soft rectangle. A square corner, a half-round "squircle" or a radius outside 12/18/22/999 is outside the system.

## Components

### Buttons
- **Shape:** full pill (999px), inline-flex with a 0.6rem gap so a mark can sit inside the label.
- **Primary (amber):** amber ground, ink label, 0.95rem/600, `0.95rem 1.65rem` padding, gold glow. It is the Start Order action and it carries the WhatsApp mark, because that is the channel it actually opens. Tagged `.on-gold` so the focus ring flips to ink.
- **Blue:** brand-blue ground, white label, same metrics; the primary action when it sits inside paper prose rather than on a photograph.
- **Ghost:** transparent with a `rgb(255 255 255 / 0.36)` hairline and white label — the secondary action on dark grounds only.
- **Outline:** transparent with a `rgb(16 16 19 / 0.2)` hairline and ink label — the secondary action on paper; hover tints the fill `rgb(0 29 164 / 0.06)` and turns the border brand blue.
- **Hover / Active:** every variant lifts `translateY(-2px)` over 0.45s on `cubic-bezier(0.16, 1, 0.3, 1)` and presses back to `scale(0.98)` on active. Amber deepens its glow, blue brightens to Blue Lift, ghost and outline gain contrast.
- **Compact:** in the header the same pills drop to `0.6rem 1.05rem` at 13.5px.

### Chips
- **Style:** pill, transparent, 1px `rgb(16 16 19 / 0.16)` border, 14px label, `0.5rem 1.05rem`. Static tags, not controls.
- **Emphasis:** exactly two chips in a row are filled — one brand blue with white, one amber with ink. The rest stay outlined; the fills are there to pace the row, not to signal state.

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** print white, on the deeper-paper catalogue ground or the paper services ground.
- **Shadow Strategy:** the blue-tinted card lift; hover raises 4px and deepens it over 0.5s.
- **Border:** 1px `rgb(16 16 19 / 0.09)`, with a second hairline rule between the image and the body.
- **Internal Padding:** the catalogue frame sets `0.85rem 1.05rem 1rem` under a square (1:1) photograph flush to the card's edges; the service card sets `clamp(1.05rem, 2.4vw, 1.55rem)` beside an illustration plate flush to its left edge.
- **Width:** the catalogue frame is `clamp(186px, 23vw, 280px)`; the service card fills its grid column, one-up below 62rem and two-up above.

### Navigation
- **Header:** sticky, translucent paper with a 14px blur and a hairline rule; the black wordmark at `clamp(30px, 3.2vw, 42px)` tall, then inline links at 13.5px in soft ink, then the actions. Links underline nothing at rest; hover darkens to ink and draws a 2px amber bottom border. The secondary outline action hides below 62rem so only the wordmark, the primary action and the menu fit on a phone.
- **Mobile:** a 42px pill menu button opens a full-width paper drawer under the bar, links at 1.05rem/500 separated by paper rules.
- **Skip link:** print white on a brand-blue 3px outline, parked off-canvas and pulled to `left: 0` on focus.

### Tables
- The hours table is ruled with leather hairlines, day labels in Archivo at 15.5px and times in mono at 13.5px, right-aligned and tabular. A closed row raises its value from periwinkle to full white, so the exception reads as the exception.

### The Cover (signature)
Full-bleed brand blue. Behind it, three rows of real product photographs at `clamp(150px, 17vw, 258px)` square, 18px radius, on print-white backing, laid in a wall inset `-10% -16%` and rotated −4° so the rows run off both edges. Over the wall, two scrims. Type sits lower-left inside the shell: display headline, cover lede, the amber primary beside the ghost secondary, then the scroll cue — a 42px hairline ring around a down arrow with a mono label beside it.

**The Scrim Rule.** The cover's 98° left-weighted gradient (`rgb(0 15 90 / 0.96)` → `rgb(0 29 164 / 0.9)` at 38% → `rgb(0 29 164 / 0.42)` at 66% → `rgb(0 29 164 / 0.12)`) plus its foot scrim (36% tall, `rgb(0 17 98 / 0.94)` to transparent) is **load-bearing, not decoration**. Studio product shots are photographed on white; without the scrim the wall is a field of white rectangles and white display type has nothing to sit on. The gradient holds the type side dark enough for white text and releases to near-clear on the right so the work still shows its true colour, and the foot scrim catches the cue and the actions. Do not delete it as "a gradient", do not flatten it to a uniform overlay, and do not re-balance it without re-checking white type against the lightest photograph in row one.

### The Service Cards (signature)
Four cards, one per service, each of them a link to that service's page under `/shop`. They are sized to arrive in one glance — a single row of four from 56rem, two-up below it, never stacked.

The composition is centred and quiet: the drawing sits on the card's own white with room around it, no tinted plate and no rule beneath it, and the name and its one line are centred under it at a 26ch measure, because centred prose turns from a caption into an accident somewhere past two lines. The drawings arrive at four aspect ratios between 2.6:1 and 0.94:1, so the band is what is fixed (`clamp(92px, 9.5vw, 136px)`) and each is contained inside it — a row of four makes any unevenness obvious.

What that composition does not supply on its own is any sign the card can be pressed, so it keeps its 1px border and its blue lift and ends on a centred 34px hairline ring holding the arrow — the same ring the cover's scroll cue uses, which is this page's way of drawing *there is more this way*. Hovering lifts the card 4px, tints the border blue, turns the name blue, fills the ring brand blue with a white arrow and pushes it 3px along, and scales the drawing 1.04. There is no client JS behind any of it.

**The Compact-Row Rule.** These four are the shape of the offer, not four essays. A blurb that runs past a line and a half, or a fifth service, breaks the row rather than the card: shorten the copy or change the grid deliberately, and do not let the cards grow back into a stack.

### The Catalogue Wheel (signature)
Twelve real product photographs pinned around a wheel far bigger than the screen, full bleed, each on a white frame with its name under it. The frame at the top of the arc sits highest and square; the rest fall away and lean with the curve.

The geometry is CSS, not script. Every frame carries its index `--n`, and the stylesheet places it from that index and one inherited `--spin`: a drop of `--k × i²` (a circle, at these shallow angles) and a lean of `--step × i`, where `i` is its distance from the top of the arc. `--step` and `--k` are not independent — for a circle of radius R the drop per step is `pitch × step / 2` in radians — and both are set per breakpoint (12°/21px on a phone down to 6°/16px past 90rem) because an angle cannot be clamped against a viewport unit. A `min()` caps the drop and a `clamp()` caps the lean, so the frames furthest round the wheel do not sit a thousand pixels down.

Because `--spin` is inherited, turning the wheel is one number: the frames re-seat themselves along the arc rather than sliding as a rigid shape. At `--spin: 0` the wheel sits square, which is what the page shows if the script never runs.

**The Geared-Not-Driven Rule.** The wheel has no motion of its own. It is scrubbed to the section's pass through the viewport — scrolling down turns it left, scrolling up turns it back — and it stops the instant the visitor stops. Nothing on this page autoplays below the cover. The turn is bounded at ±2.2 steps each way, which is what keeps the arc full: a wide screen shows about three steps either side of the top, and with twelve frames starting at 5.5 any more would turn the last frame past the edge and open a gap in the curve.

The row shows the middle of the catalogue, not all of it, and that is deliberate — the way to everything is the link above it, not this row. With motion reduced the arc flattens to a plain horizontal rail that scrolls by hand, because a scroll-linked turn is motion and an arc the visitor cannot turn is a row with its ends hidden.

### The Running Band (signature)
Not a room of its own: two brand-blue strips woven into the cover wall, one between each pair of photograph rows, leaning with the wall at −4° and drifting with it. Each is a flat blue ground carrying: a mono mark, then one nowrap line of product words at band scale, duplicated once so the loop seams invisibly, each word separated by an amber slash. At strip scale the mono mark and the "and more" tail are dropped: between the rows the band is texture, not a labelled section, and the ground is what keeps white words off a white product shot. It sits under the scrim with the photographs, so it fades out on the type side exactly as they do.

### Motion
All page motion is orchestrated in one client component (GSAP 3.15 + ScrollTrigger), never scattered across components. It runs inside a single `gsap.matchMedia` block and through an isomorphic layout effect, so entrance states are set before the browser paints the hydrated tree and the cover does not flash. Five moments:

1. **The cover wall** — each of the three rows travels horizontally at its own duration (58s / 74s / 46s), alternate rows reversed, each row holding its set twice so `-50%` lands exactly on the seam; the whole wall drifts `yPercent: 12` and scales to 1.06, scrub-linked (0.6) to the cover's own scroll.
2. **The cover entrance** — headline, lede, actions and cue enter from `y: 26` with `autoAlpha: 0` over 1s on `expo.out`, staggered 0.09; the cue's ring bobs 7px on a 1.3s `sine.inOut` yoyo.
3. **The word strips** — 66s and 52s linear loops, each travelling against the row above it and on a duration that shares no rhythm with the rows' 58 / 74 / 46, so the wall never beats in time.
4. **One reveal grammar** — `ScrollTrigger.batch` over `[data-reveal]` (from `y: 30`, 0.9s, stagger 0.08, at 88% viewport), firing once. The service cards enter on this batch like every other revealed element; there is no second entrance for them. The highlighter-marked line fills its stroke from `backgroundSize: 0% 100%` as it arrives.
5. **The catalogue wheel** — no duration of its own: `--spin` is scrubbed (0.6) from +2.2 to −2.2 across the section's pass through the viewport, so the arc turns with the visitor's scroll and stops when they do. The tween writes one custom property and the stylesheet re-seats twelve frames from it.

**The From-Visible Rule.** Every tween is a `gsap.from` off an already-visible default. The markup renders complete; if the script never runs the page is intact and merely still. Nothing may be hidden in CSS and revealed by JS.

**The Single-Orchestrator Rule.** New motion goes into the existing `matchMedia` block, not into a new component effect. `prefers-reduced-motion: reduce` returns before a single tween is created — not after, and not by reverting them — and the global stylesheet additionally collapses any CSS animation or transition to 0.001ms.

## Do's and Don'ts

### Do:
- **Do** let a ground own its section edge to edge — blue for loud, `{colors.paper}` / `{colors.paper-deep}` for reading, `{colors.card}` to close.
- **Do** spend amber on the action, the marked line, the band slashes, marks on dark, `::marker` and `::selection` — and stop there.
- **Do** set every mark, hours value, colophon and base line in Geist Mono, and everything readable as a sentence in Archivo.
- **Do** keep the cover scrim as a load-bearing gradient, and re-check white type against the lightest photograph whenever the wall's contents change.
- **Do** tune the focus ring to its ground: brand blue by default, amber inside `.on-dark`, ink on `.on-gold`. A single ring colour is invisible on one ground or the other — blue disappears into the blue panels, amber disappears into paper.
- **Do** tint secondary text from its ground's hue (soft ink and faint ink on paper, periwinkle on blue, soft card ink on near-black).
- **Do** rule lists and tables with hairlines, and reserve borders for the two card kinds that lead somewhere.
- **Do** keep the four service cards on one row across a wide screen and two-up on a phone; their copy is written to that budget.
- **Do** gear the catalogue wheel to the visitor's own scroll rather than to a clock, and keep its turn inside the bound that holds the arc full.
- **Do** animate from an already-visible default, inside the one `matchMedia` block.
- **Do** cap prose at its measure (62ch default) no matter how wide the shell is.
- **Do** draw icons on the 24px grid at 1.6 stroke with round caps, and keep brand marks solid.

### Don't:
- **Don't** make amber the background of a region, section, card or hero. It is a highlighter, not an upholstery.
- **Don't** set body copy, headings or button labels in mono, and don't letterspace Archivo positively.
- **Don't** introduce a radius outside 12 / 18 / 22 / 999px, or square off a corner.
- **Don't** use grey or black shadows; shadows are tinted by what casts them, and only actions and the two card kinds cast one.
- **Don't** float a coloured panel inside a differently-coloured section instead of banding the ground.
- **Don't** use a grey neutral for secondary text.
- **Don't** hide content in CSS for a JS reveal to uncover, and don't make a display row the only way to reach what it displays — the catalogue wheel shows a middle, and the link above it is the path.
- **Don't** ship a dark-mode variant; `color-scheme: light` is declared and the dark grounds are composition, not theme.
- **Don't** swap Archivo for the template's Outfit or any other default face without a reason no other face could satisfy.

<!-- Inheritance note (scope, not system): this pass shipped one surface — the homepage — by the user's explicit instruction. There is no reusable shell, no route stubs, and header and footer are built inside `app/page.tsx`. Mantine, named in PRODUCT.md as the project's primary UI foundation, is deliberately unused here: stock components inside a committed world are a lapse, and Mantine is expected to carry the upload / configure / checkout flow instead, restyled to these tokens. Every order action is a `wa.me` deep link through one `ORDER_HREF` constant, because no catalogue or checkout exists yet; repoint that constant when ordering ships. Unspent headroom, recorded so a later pass knows where it is and not as a rule: no print-edge, white border, lab sleeve or counter material appears anywhere — the shelf card is a generic rounded rectangle a shop selling anything could wear; nothing measured is stated as a design element (no sheet size, no live "open now" read off the hours table); and collect-or-deliver is two icon+heading+paragraph blocks side by side, the card-scaffold shape without the card, the region that spends least. -->
