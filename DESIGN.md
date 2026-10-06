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
    backgroundColor: "{colors.blue}"
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

This is a printed shop, not an app. The argument is the shop's own work: the first thing a visitor meets is a full-bleed wall of real product photographs travelling past, with one plain sentence set on the widest of the wall's own blue bands, holding still while everything around it moves. From there the page reads the way the counter reads — one catalogue row travelling past, eight category tiles that are each a door into the shop, then where to find the real door. One brand blue owns the loud surfaces whole — the header, the cover's bands, the catalogue and the footer — and white owns the rest: the wall's ground, the categories and the gifting promise, which carries its headline on one more leaning blue band. The page opens and closes on the same blue. Nothing is quiet for the sake of being quiet.

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

## Colors

Blue primary, white secondary, amber accent — the client's rule. Every ink is drawn from the blue, so nothing on the page is black or grey.

### Primary
- **Brand Deep Blue** (`{colors.blue}`): the binding brand value, supplied by the shop. It owns the cover's headline band and leaning edge, the catalogue, the running band and the find-us panel *whole* — edge to edge, not as a panel inside a lighter page. On paper it is also the default focus ring, the caret, the scrollbar thumb, the catalogue subtitle, and what every category tile becomes under the pointer (and Specials at rest). Takes white text.

### Secondary
- **Foil Amber** (`{colors.gold}`): the shop's highlighter. Primary actions, the highlighter-marked line, the slashes in the running band, section marks and block headings on dark grounds, the corporate-gifts chip, the footer phone number, `::marker` and `::selection`, and the underline under "Get directions". It pairs legibly with ink or with brand blue and never takes white text.

### Neutral
- **Leatherette** (`{colors.leather}`): the blue ground of the header, the catalogue, the cover's word strips and the footer. Same value as brand blue, named for its role so a surface and an accent are not confused at call sites.
- **There is no second blue.** A darker footer blue and a lighter hover blue were both tried and rejected by the client: only the official values may appear.
- **Shop White** (`{colors.paper}`): pure white; the body ground and the reading surface for the category tiles; also the disabled carousel arrow's disc.
- **Print White** (`{colors.print}`): product cards, the photographs' own backing, the skip link.
- **Ink** (`{colors.ink}`): deep navy; body text on white, and text on amber.
- **Soft Ink** (`{colors.ink-soft}`): secondary prose on paper — ledes, blurbs, nav at rest. Blue-leaning, never grey.
- **Faint Ink** (`{colors.ink-faint}`): the quietest paper tone — the category tile's go ring at rest.
- **On Leather** (`{colors.on-leather}`) / **Soft White** (`{colors.on-leather-soft}`): white and its softened partner on blue — headline and body versus ledes, hours values, contact glyphs.
- **Paper Rule** (`{colors.rule-paper}`) / **Leather Rule** (`{colors.rule-leather}`): the hairline dividers. The gifting ledger, the hours table and the band edges are ruled, never boxed; inside the catalogue frame the same hairline separates the photograph from its caption.

### Named Rules

**The Highlighter Rule.** Amber marks; it does not upholster. It may carry a button, a line of text, a slash, a mark, a chip, an underline or a marker glyph. Nothing may be amber larger than the gifting section's highlighted line. An amber ground was tried for the gifting section and rejected by the client: it read as a warning sign and fought the blue.

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
- **Card Title** (600, 17px): catalogue frame captions.
- **Cover Lede** (400, `clamp(1rem, 1.45vw, 1.2rem)`, 1.5, 44ch, balanced): the one sentence under the display line, on its own slimmer band.
- **Lede** (400, `clamp(1rem, 1.3vw, 1.15rem)`, 1.62, 62ch measure): section-opening prose.
- **Address** (400, `clamp(1rem, 1.5vw, 1.15rem)`, 1.65): the street address block.
- **Body** (400, 15.5px, 1.65): the collect-or-deliver paragraphs, contact rows, hours day labels.
- **Body Small** (400, 14.5px, 1.6): footer lists, footer blurb, fulfilment note.
- **Caption** (400, 14px, 1.5): chips and card blurbs.
- **Micro** (400, 13.5px): compact header actions and nav on desktop. Never used in the category or gifting sections, where every text element is 16px or more.
- **Mark** (mono, 400, 11.5px, 0.16em, uppercase): section marks, the scroll cue, the shop block headings. 11px on the footer columns.
- **Slot** (mono, 400, 12.5px): the footer base line.
- **Measure** (mono, 400, 13.5px, tabular): hours values. The hours table sets `font-variant-numeric: tabular-nums` so the times column aligns.
- **Colophon** (mono, 400, 13px): the footer phone number.

### Named Rules

**The Two-Families Rule.** Archivo sets everything written in prose. Geist Mono sets only marks and measurements — section marks, the scroll cue, the shop block headings, hours, the footer colophon and base line. Mono is never body copy, never a heading, never a button. Audit test: read the mono string aloud; if it is a sentence, it is in the wrong family.

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

One shell, 1400px wide, centred, with a fluid gutter of `clamp(20px, 5vw, 56px)` that every full-bleed band re-applies internally so type stays on a single left edge from header to footer. Section rhythm is `clamp(62px, 9vw, 130px)` of vertical padding, with the catalogue slightly tighter (`clamp(52px, 8vw, 100px)`) and the running band tighter still (`clamp(30px, 4.5vw, 54px)`) so it reads as a rule between rooms rather than a room.

Breakpoints are declared in rem and each one does a single job: 46rem splits collect-or-deliver into two; 56rem takes the category tiles from two-by-four to four-by-two, opens the find-us grid to `1.15fr 1fr 1fr` and the footer to `1.7fr 1fr 1fr 1fr`; 62rem is the shell breakpoint — the inline nav appears, the mobile drawer and menu button disappear, the secondary header action returns, and the header grows from 66px to 74px. Anchors compensate with `scroll-margin-top: calc(var(--header-h) + 28px)`.

The cover subtracts the sticky header's height from the viewport (`min(calc(100svh - var(--header-h)), 900px)`) because the header sits in flow above it; without that, the scroll cue lands just past the fold. The catalogue row is full bleed inside an `overflow: hidden` section while its heading, subtitle and link keep the shell's left edge, so the row alone reads as carrying on past both sides.

**The One-Edge Rule.** Every band re-applies the shell and gutter. A full-bleed background never means full-bleed content.

## Elevation & Depth

Low and warm. There is no grey drop-shadow vocabulary and no elevation ladder; depth comes from ground changes, hairline rules and two coloured glows. Actions carry a glow in their own colour, tightly negative-spread so it reads as light on the surface under the button rather than as a box floating above it. Both card kinds carry the same blue-tinted lift, which deepens on hover as the card rises. Everything else — chips, the hours table, the fulfilment blocks, the footer — is flat, separated by 1px rules at `{colors.rule-paper}` / `{colors.rule-leather}` or by a change of ground.

The header is solid brand blue with a white hairline at its foot and a soft deep-blue shadow, so it separates from the blue cover beneath it and from the paper sections below.

### Shadow Vocabulary
- **Gold action glow** (`box-shadow: 0 18px 38px -20px rgb(255 183 42 / 0.95)`; hover `0 22px 44px -20px rgb(255 183 42 / 1)`): under the amber primary action only.
- **Blue action glow** (`box-shadow: 0 18px 40px -22px rgb(1 38 186 / 0.9)`): under the blue action on paper.
- **Card lift** (`box-shadow: 0 22px 44px -32px rgb(1 38 186 / 0.55)`; hover `0 30px 54px -30px rgb(1 38 186 / 0.6)`): the category tile and the catalogue frame, at rest and raised.

### Named Rules

**The Coloured-Shadow Rule.** A shadow is tinted by the thing casting it — amber under the amber button, brand blue under the blue button and the white card. Black or neutral-grey shadows are not part of this world.

**The Rule-Not-Box Rule.** A list, a ledger or a table is separated by 1px hairlines, not by a border around each item: the gifting ledger, the hours table and the footer columns are all ruled. A card is not a list item — it is bordered when it is a *door*, something that can be pressed and that leads somewhere. Two kinds qualify and no others: the category tile and the catalogue frame. Both wear the same 1px `rgb(1 38 186 / 0.1)` border and the same blue lift. Audit test: if a bordered box on this page does not go anywhere when you press it, it is wrong.

## Shapes

Two shapes, and nothing between them. Anything you press or tag is a pill (999px): buttons, chips, the menu button, the cover's scroll-cue ring, the footer's social marks, the scrollbar thumb. Anything that holds content is a soft rectangle on the 12 / 18 / 22px ladder: 18px on the cover wall's photographs, 22px on both card kinds, 12px reserved for smaller surfaces. Corners are never square and never fully circular except on the round 40–42px controls, where the pill radius resolves to a circle.

Borders are 1px and low-contrast — `rgb(1 38 186 / 0.1)` around the card, `rgb(1 38 186 / 0.2)` on chips and outline buttons, `rgb(255 255 255 / 0.2–0.36)` on dark grounds. Rotation appears in exactly two places and they are opposites, so the two rows are never read as the same device: the cover wall leans as a whole (−4°) and the photographs inside it stay square, while the catalogue row has no lean of its own and every frame takes its angle from where it sits on the wheel. Hovering a frame takes it off the wheel — it squares up and lifts. Nothing else in the system rotates.

Icons are authored on a 24px grid and inherit `currentColor`. Outline marks share a 1.6 stroke with round caps and joins; brand marks (WhatsApp, Instagram, Facebook) are solid, because that is how those marks are drawn. They render at 15–22px inline with their text.

**The Two-Shape Rule.** Pill or soft rectangle. A square corner, a half-round "squircle" or a radius outside 12/18/22/999 is outside the system.

## Components

### Buttons
- **Shape:** full pill (999px), inline-flex with a 0.6rem gap so a mark can sit inside the label.
- **Primary (amber):** amber ground, ink label, 0.95rem/600, `0.95rem 1.65rem` padding, gold glow. It is the Start Order action and it carries the WhatsApp mark, because that is the channel it actually opens. Tagged `.on-gold` so the focus ring flips to ink.
- **Blue:** brand-blue ground, white label, same metrics; the primary action when it sits inside paper prose rather than on a photograph.
- **Ghost:** transparent with a `rgb(255 255 255 / 0.36)` hairline and white label — the secondary action on dark grounds only.
- **Outline:** transparent with a `rgb(1 38 186 / 0.2)` hairline and ink label — the secondary action on paper; hover tints the fill `rgb(1 38 186 / 0.06)` and turns the border brand blue.
- **Hover / Active:** every variant lifts `translateY(-2px)` over 0.45s on `cubic-bezier(0.16, 1, 0.3, 1)` and presses back to `scale(0.98)` on active. Amber deepens its glow, blue deepens its glow (there is no lighter blue to brighten into), ghost and outline gain contrast.
- **Compact:** in the header the same pills drop to `0.6rem 1.05rem` at 13.5px.

### Chips
- **Style:** pill, transparent, 1px `rgb(1 38 186 / 0.2)` border, 14px label, `0.5rem 1.05rem`. Static tags, not controls.
- **Emphasis:** exactly two chips in a row are filled — one brand blue with white, one amber with ink. The rest stay outlined; the fills are there to pace the row, not to signal state.

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** print white, on the deeper-paper catalogue ground or the paper categories ground.
- **Shadow Strategy:** the blue-tinted card lift; hover raises 4px and deepens it over 0.5s.
- **Border:** 1px `rgb(1 38 186 / 0.1)`, with a second hairline rule between the image and the body.
- **Internal Padding:** the catalogue frame sets `0.85rem 1.05rem 1rem` under a square (1:1) photograph flush to the card's edges; the category tile sets `clamp(14px, 1.5vw, 20px)` around its disc, ring and name.
- **Width:** the catalogue frame is `clamp(186px, 23vw, 280px)`; the category tile fills its grid column, two-up below 56rem and four-up above.

### Navigation
- **Header:** sticky, solid brand blue, ending on a clean edge over the photo wall; the logo (`/logo/new.png`, white-and-amber lettering, so it only ever sits on blue) at `clamp(35px, 3.7vw, 48px)` tall, then inline links at 13.5px in soft white, then the gold Shop now and the white icon marks. Links underline nothing at rest; hover turns white and draws a 2px amber bottom border. The secondary outline action hides below 62rem so only the wordmark, the primary action and the menu fit on a phone.
- **Mobile:** a 42px pill menu button opens a full-width paper drawer under the bar, links at 1.05rem/500 separated by paper rules.
- **Skip link:** print white on a brand-blue 3px outline, parked off-canvas and pulled to `left: 0` on focus.

### Tables
- The hours table is ruled with leather hairlines, day labels in Archivo at 15.5px and times in mono at 13.5px, right-aligned and tabular. A closed row raises its value from soft white to full white, so the exception reads as the exception.

### The Cover (signature)
Under the blue header, three rows of real product photographs at `clamp(140px, min(17vw, 22svh), 210px)` square (`clamp(130px, min(44vw, 22svh), 190px)` on a phone; sized by height too, because three rows, a strip and the sign share one screen), 18px radius, on print-white backing with the card hairline and card lift, laid in a wall inset `-10% -16% -5%` and rotated −4° so the rows run off both edges. Below 62rem the wall is packed from its foot, which guarantees a real slice of the last row above the edge and lets the header crop the first. From 62rem it is fitted instead: a one-column grid (`0 auto 1fr auto 1fr`) whose top and bottom padding is the lean, `tan(4°) × 50vw ≈ 3.5vw`, plus a margin. That keeps the word strip clear of the header at its high end and the last row whole above the leaning edge, and the two rows either side of the sign share what is left, so every print is whole at any screen height. The first row hangs above the strip in a zero-height track at about the size of the others, filling the wedge under the header. The headline drops to `clamp(2.75rem, min(9.6vw, 8.4svh), 4.5rem)` so a short screen gives up headline before work, the lede runs on one line from about 1280px, and the cover's floor is 700px.

Woven between the rows, in order: row, the travelling word strip, row, **the sign**, row. The sign is the headline set on the wall's own device: a full-width brand-blue band at the wall's lean, display headline in white with "gift shop" in amber, centred; under it, split by a leather hairline, a slimmer band carrying the lede at a 44ch measure (its inline padding adds the wall's ~12.2% overhang so the text never runs off a phone). The pair lifts off the photographs on a soft blue drop shadow. It holds still while the rows and the strip travel: the contrast in motion is what marks it as the one fixed sentence. The docked pair carries the actions.

At the foot, **the leaning edge**: a triangle of brand blue, `tan(4°)` of the width tall, rising left to right with the wall, meeting the catalogue with no seam. The catalogue's blue reads as the widest band, the one the wall comes to rest on.

**The Wall's-Own-Devices Rule.** Every element of the cover is something the wall already has: prints, blue bands, the lean. Nothing is laid over the photographs: no plate, no scrim, no gradient, no shape that is not a band. A white plate, a foot fade, a side scrim, a 35mm film frame and a halftone dome rising from the catalogue were all tried and rejected; the dome covered two-thirds of the wall. If the headline grows, the rows shrink by the `svh` term before the sign may cover a row.

### The Category Tiles (signature)
"Shop by category": eight compact tiles — Photos, Frames, Personalised Gifts, Batteries, Jewellery, Cameras, Gift Wrapping, Specials — each a link to `/shop/<slug>`. Four by two from 56rem, two by four below it, inside a 1180px cap, heading centred over the grid as the catalogue's is.

A tile is three things: a 48–58px icon disc (brand blue at 7% over white, holding a blue authored glyph at 28px) top-left, the 32px hairline arrow ring top-right, and the name on the tile's floor at `clamp(1.05rem, 1.45vw, 1.3rem)`/600. No blurb. 18px radius, card hairline, card lift, `clamp(128px, 10.5vw, 150px)` tall.

Under a hovering pointer (`@media (hover: hover)` only, so a tap never leaves it stuck) the tile becomes a piece of the catalogue's blue: white name, amber disc with a blue glyph tilted to the page's -4deg lean, the ring filled white. **Specials wears that state at rest** — one blue tile in eight is an accent; a second would be a pattern.

**The Icon Rule.** Category glyphs are drawn in `app/site/icons.tsx` on the shared 24px grid at the 1.6 stroke, as the object on the counter (two prints, a mitred frame, a photo mug, a cell, a ring, a camera, a wrapped box, a price tag). A new category gets a new drawing in the same hand, never a library icon.

### The Gifting Sign (signature)
The page's second sign, on the cover's own device: a brand-blue band 124% of the screen wide, leaning -4deg, the headline in white with "at your fingertips" in amber, the lede on a slimmer band under a leather hairline, the same blue drop-shadow. It runs in along its lean (`xPercent: -100`, 1.3s expo-out, staggered) when the section reaches 78% of the viewport; with reduced motion it is simply there. The section clips on x so the overhang is never a sideways scroll.

Under it on white: the highlighter line, then the two ways an order reaches its person as one two-column ledger split by a single vertical hairline (stacked with a horizontal one under 46rem). Each way is centred — the category tiles' disc at rest, name, blurb at 16px, slot — on a subgrid, so the courier's mark and the directions link share a floor. Every text element in the section is at least 16px.

### The Catalogue Wheel (signature)
Twelve real product photographs pinned around a wheel far bigger than the screen, full bleed, each on a white frame with its name under it. The frame at the top of the arc sits highest and square; the rest fall away and lean with the curve.

The geometry is CSS, not script. Every frame carries its index `--n`, and the stylesheet places it from that index and one inherited `--spin`: a drop of `--k × i²` (a circle, at these shallow angles) and a lean of `--step × i`, where `i` is its distance from the top of the arc. `--step` and `--k` are not independent — for a circle of radius R the drop per step is `pitch × step / 2` in radians — and both are set per breakpoint (12°/21px on a phone down to 6°/16px past 90rem) because an angle cannot be clamped against a viewport unit. A `min()` caps the drop and a `clamp()` caps the lean, so the frames furthest round the wheel do not sit a thousand pixels down.

Because `--spin` is inherited, turning the wheel is one number: the frames re-seat themselves along the arc rather than sliding as a rigid shape. At `--spin: 0` the wheel sits square, which is what the page shows if the script never runs.

**The Geared-Not-Driven Rule.** The wheel has no motion of its own. It is scrubbed to the section's pass through the viewport — scrolling down turns it left, scrolling up turns it back — and it stops the instant the visitor stops. Nothing on this page autoplays below the cover. The turn is bounded at ±2.2 steps each way, which is what keeps the arc full: a wide screen shows about three steps either side of the top, and with twelve frames starting at 5.5 any more would turn the last frame past the edge and open a gap in the curve.

The row shows the middle of the catalogue, not all of it, and that is deliberate — the way to everything is the link above it, not this row. With motion reduced the arc flattens to a plain horizontal rail that scrolls by hand, because a scroll-linked turn is motion and an arc the visitor cannot turn is a row with its ends hidden.

### The Running Band (signature)
Not a room of its own: two brand-blue strips woven into the cover wall, one between each pair of photograph rows, leaning with the wall at −4° and drifting with it. Each is a flat blue ground carrying: a mono mark, then one nowrap line of product words at band scale, duplicated once so the loop seams invisibly, each word separated by an amber slash. At strip scale the mono mark and the "and more" tail are dropped: between the rows the band is texture, not a labelled section, and the ground is what keeps white words off a white product shot. It runs the full width with the photographs, between the first two rows.

### Motion
All page motion is orchestrated in one client component (GSAP 3.15 + ScrollTrigger), never scattered across components. It runs inside a single `gsap.matchMedia` block and through an isomorphic layout effect, so entrance states are set before the browser paints the hydrated tree and the cover does not flash. Five moments:

1. **The cover wall** — each of the three rows travels horizontally at its own duration (116s / 148s / 92s over a loop that lays the set out twice), alternate rows reversed, each row holding its set twice so `-50%` lands exactly on the seam; the whole wall drifts `yPercent: 12` and scales to 1.06, scrub-linked (0.6) to the cover's own scroll.
2. **The cover entrance** — the headline's band runs in from `xPercent: −100` along the wall's lean and stops (1.3s `expo.out`), as if a travelling strip came to rest; the lede's band follows 0.12s later. On the way out the sign drifts `y: −48`, scrubbed (0.6) to the cover's pass, a little less than the wall behind it, so it lifts off the photographs.
3. **The word strips** — 66s and 52s linear loops, each travelling against the row above it and on a duration that shares no rhythm with the rows' 58 / 74 / 46, so the wall never beats in time.
4. **One reveal grammar** — `ScrollTrigger.batch` over `[data-reveal]` (from `y: 30`, 0.9s, stagger 0.08, at 88% viewport), firing once. The category tiles enter on this batch on screens 48rem and wider, and hold still on a phone. The gifting sign is the one other authored entrance. The highlighter-marked line fills its stroke from `backgroundSize: 0% 100%` as it arrives.
5. **The catalogue wheel** — no duration of its own: `--spin` is scrubbed (0.6) from +2.2 to −2.2 across the section's pass through the viewport, so the arc turns with the visitor's scroll and stops when they do. The tween writes one custom property and the stylesheet re-seats twelve frames from it.

**The From-Visible Rule.** Every tween is a `gsap.from` off an already-visible default. The markup renders complete; if the script never runs the page is intact and merely still. Nothing may be hidden in CSS and revealed by JS.

**The Single-Orchestrator Rule.** New motion goes into the existing `matchMedia` block, not into a new component effect. `prefers-reduced-motion: reduce` returns before a single tween is created — not after, and not by reverting them — and the global stylesheet additionally collapses any CSS animation or transition to 0.001ms.

## Do's and Don'ts

### Do:
- **Do** let a ground own its section edge to edge — brand blue (header, the cover's bands, catalogue, footer) alternating with white (the wall's ground, categories, gifting).
- **Do** spend amber on the action, the marked line, the band slashes, marks on dark, `::marker` and `::selection` — and stop there.
- **Do** set every mark, hours value, colophon and base line in Geist Mono, and everything readable as a sentence in Archivo.
- **Do** keep the cover wall unwashed and set its type only on its own blue bands. Never lay a plate, scrim or shape over the photographs.
- **Do** tune the focus ring to its ground: brand blue by default, amber inside `.on-dark`, ink on `.on-gold`. A single ring colour is invisible on one ground or the other — blue disappears into the blue panels, amber disappears into paper.
- **Do** tint secondary text from its ground's hue (brand blue at 80% / 72% on white, white at 80% on blue).
- **Do** rule lists and tables with hairlines, and reserve borders for the two card kinds that lead somewhere.
- **Do** keep the category tiles four-by-two on a wide screen and two-by-four on a phone, names only.
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

<!-- Client revision (v2, 2026-10-06): brand blue moved to #0126BA; the only logo file is /logo/new.png, used in the header and every fourth word of the cover's word bands; the gifting section is white and the catalogue brand blue; the cover is white under the blue header; "Our Services" is brand blue; the catalogue wheel has desktop arrows that drive the same `--drag` as the phone swipe; the footer is compact — no logo, a smaller "Come and find us", three columns, a one-row sign-up, and a last row sized to the dock so the docked pair rests beside the colophon. The cropped "EXPRESS" wordmark and its Montserrat face are gone. -->

<!-- Client revision (v3, 2026-10-06): the catalogue moves up to follow the cover directly. A halftone dome rising from the catalogue into the wall was built and rejected by the client the same day — it filled too much of the screen and hid the wall. It is replaced by the headline band and the leaning edge, so the cover uses only the wall's own devices. Services and gifting now sit next to each other on white; the client will look at the other sections in a later pass. -->

<!-- Client revision (v4, 2026-10-06): "Our Services" (three illustrated cards) is replaced by "Shop by category", eight compact icon tiles in a 4x2 grid with Specials in blue at rest; the header link reads "Categories" and points at #categories. The gifting section keeps its copy but takes the cover's leaning headline band, and its delivery/collection rows become a centred two-column ledger. The /public/illustrations SVGs are no longer referenced. -->
