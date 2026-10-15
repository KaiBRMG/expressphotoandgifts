---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/home.css","app/globals.css","app/site/Motion.tsx"]
---

# Homepage — Express Photo & Gifts

**Scope:** the marketing homepage (`app/page.tsx`) only. Header and footer are built inside this page, not as a reusable shell. Nav links are on-page anchors; no other route exists. **Visitor mode: Persuade.**

**Audience & job:** a South African consumer in or near Scottburgh, KwaZulu-Natal, usually on a phone, with a photo already in their camera roll and often a deadline. Primary action: start an order. Secondary: message the shop, or find it.

**Proof on hand:** 25 verified product photographs (photo gifts, frames, easels, jewellery, the Kodak range, three family portraits), filed in Cloudinary under `products/<code>` and rendered through `ProductImage`; the real logo; the courier's mark; real store address, hours and contact. Every code ending `a` is a spec diagram, and so is `PP1` — excluded. `BP1` is biltong — excluded. `EA` is an easel, not an album.

**Uninventable:** prices, reviews, ratings, turnaround guarantees, customer counts. The shop's catalogue source data (`public/product_list.json`) now carries prices, but none appears on this page; the reviews room is cut.

**Unresolved:** the `/shop` routes, the basket, the account and search do not exist. Every control that would go there is drawn at its real size and goes nowhere (`#` or an `aria-disabled` button). The one live order channel is WhatsApp, behind the dock's round mark and the footer's row.

## Direction contract

**THESIS:** The shop's own work is the argument. The first viewport is a full-bleed wall of real products travelling past behind one plain sentence about what this shop does, and the page then reads as a shop counter: a numbered ledger of the four services, a running band of everything they turn out, and one shelf of things to look at. It refuses the sparse, quiet gallery treatment that the first build shipped — the failure there was under-spending the material, not choosing the wrong material.

**OWN-WORLD:** Three values and no others: brand blue `#0126BA` (the client's revision of `#001DA4`), white `#FFFFFF`, amber `#FFB72A`. Blue owns the loud surfaces whole — the header, the cover's bands, the catalogue, the footer — and is also the ink: there is no black, no grey and no second blue. White owns the reading surfaces: the wall's ground, the categories, the gifting section. Amber is the shop's highlighter — the Shop now action, the marked line, the slashes in the running band, marks on blue — and never a background for a whole region. Archivo carries everything set in prose; Geist Mono carries marks and measurements only. Pill buttons, 12/18/22px radii, tinted shadows. Nothing is laid over the photographs: the cover's type sits on its own blue bands.

**STORY:** A customer with a photo and a deadline lands on a wall of things this shop has actually made, understands in one line that their phone photos can become any of it, scrolls a wheel of the catalogue and eight doors into the shop, learns that it can reach them by courier or wait at the counter, and either shops, messages the shop, or finds it.

**FIRST VIEWPORT:** A solid brand-blue header with the white-and-amber wordmark and Search, Account and Cart targets (from 62rem also two section links and a gold Shop now). Beneath it a white-ground cover: three rows of real product photographs rotated −4°, travelling at three speeds, running off both edges, with one blue word strip woven between the first pair of rows. Between the second pair sits the page's one fixed sentence, set on the wall's widest blue band: "Your one-stop photo & gift shop", "gift shop" in amber, with the lede on a slimmer band under it. The cover has no buttons and no scroll cue; the docked Shop now pill and round WhatsApp mark carry the actions from the first paint. The cover ends on a leaning blue edge that the catalogue continues.

**FORM:** The user pinned the template they supplied (no longer in the repository) as the reference ("lean more heavily on the template", "I should be impressed"), which retired the earlier Album Page direction; the client has since revised the template's palette to the three-value rule above. Code-led; no image generation is available in this environment.

**MOTION:** GSAP with ScrollTrigger, orchestrated once in `app/site/Motion.tsx`, never scattered. Six moments: the three-speed cover wall with its scroll-linked drift; the cover's entrance; the running word strips; one reveal grammar across sections; the catalogue wheel geared to the page's scroll; and the wheel turned by hand (a swipe on touch, arrows on a wide screen). Everything animates from an already-visible default, so the page is intact and merely still if the script never runs, and `gsap.matchMedia` skips all of it under `prefers-reduced-motion`.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Hero revision (2026-10-06)

Shaped and confirmed with the client in two rounds. The photo wall stays, and the catalogue now follows the cover directly. A halftone dome rising from the catalogue was built first and rejected: it filled too much of the screen and hid the wall. The shipped hero uses only the wall's own devices. The headline is the wall's widest leaning blue band, between the second and third rows, in white with "gift shop" in amber. The lede rides a slimmer band under it. The sign holds still while the rows and the word strip travel. The cover ends on a leaning brand-blue edge, `tan(4°)` of the width, that the catalogue continues. The band runs in along its lean on entrance; under reduced motion everything is static. This supersedes the white plate and the lower-left type position in the FIRST VIEWPORT above. Services and gifting now sit next to each other on white and are deferred to the next pass.

## Categories and gifting revision (2026-10-06)

Services became "Shop by category": eight compact tiles (Photos, Frames, Personalised Gifts, Batteries, Jewellery, Cameras, Gift Wrapping, Specials) in a 4x2 grid, 2x4 on a phone, each an authored icon disc, a name and an arrow ring, linking to `/shop/<slug>`. Tiles turn brand blue with an amber disc under the pointer; Specials holds that state at rest. Gifting now opens on the cover's leaning blue band (headline white with "at your fingertips" in amber, lede band beneath) and closes on a centred two-column delivery/collection ledger split by one hairline. Nothing in either section is under 16px.

## Current state (2026-10-07)

This brief was re-derived from the shipped code. The Direction contract above describes what the page is now; the two revisions before it record how it got there. Changes since: product photographs moved to Cloudinary (`ProductImage`, widths 400 and 640); the header lost its menu button and drawer and gained Search, Account and Cart targets; the dock is a Shop now pill plus a round WhatsApp mark; the catalogue is a wheel of eight products laid twice (sixteen frames) that wraps and can be turned by hand; the footer is three columns plus a sign-up row, and a hard 16px minimum on mobile text now applies, which the footer's small mono and body sizes do not yet meet (see DESIGN.md, The 16px Floor).
