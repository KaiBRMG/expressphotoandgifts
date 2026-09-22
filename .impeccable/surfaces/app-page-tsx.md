---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/home.css","app/globals.css","app/site/Motion.tsx"]
---

# Homepage — Express Photo & Gifts

**Scope:** the marketing homepage (`app/page.tsx`) only. Header and footer are built inside this page, not as a reusable shell. Nav links are on-page anchors; no other route exists. **Visitor mode: Persuade.**

**Audience & job:** a South African consumer in or near Scottburgh, KwaZulu-Natal, usually on a phone, with a photo already in their camera roll and often a deadline. Primary action: start an order. Secondary: message the shop, or find it.

**Proof on hand:** 25 verified product photographs (photo gifts, frames, albums, easels, ID sheets, jewellery, the Kodak range); the real logo in two weights; real store address, hours and contact. Every `public/products/*a.png` is a spec diagram, and so is `PP1.png` — excluded. `BP1.png` is biltong — excluded. `EA` is an easel, not an album.

**Uninventable:** prices, reviews, ratings, turnaround guarantees, customer counts. No price appears on this page; the reviews room is cut. The shelf carries an explicit placeholder naming the catalogue as outstanding.

**Unresolved:** the product catalogue, sizes, prices and print-services products all arrive later. Every order action opens WhatsApp, because no catalogue or checkout exists yet.

## Direction contract

**THESIS:** The shop's own work is the argument. The first viewport is a full-bleed wall of real products travelling past behind one plain sentence about what this shop does, and the page then reads as a shop counter: a numbered ledger of the four services, a running band of everything they turn out, and one shelf of things to look at. It refuses the sparse, quiet gallery treatment that the first build shipped — the failure there was under-spending the material, not choosing the wrong material.

**OWN-WORLD:** Brand blue `#001DA4` owns the loud surfaces whole (cover, running band, the find-us panel); warm paper `#FBFAF8` and `#F2EFE9` own the reading surfaces; near-black `#0B0D16` closes the page. Amber `#FFB72A` is the shop's highlighter — primary actions, the marked line, the slashes in the running band, the section marks on dark — and never a background for a whole region. Archivo carries everything set in prose; Geist Mono carries marks and measurements only: section marks, index numbers, hours, the reserved slot. Pill buttons, 18–22px radii, one soft elevation. A blue scrim over the cover wall is load-bearing, not decoration: it is what lets a wall of white-ground studio shots read as one surface behind white type.

**STORY:** A customer with a photo and a deadline lands on a wall of things this shop has actually made, understands in one line that their phone photos can become any of it, sees the four counters and what each covers, and either starts an order on WhatsApp or scrolls one shelf and then starts one.

**FIRST VIEWPORT:** Light translucent header with the black wordmark, nav, and a gold Start Order carrying the WhatsApp mark. Beneath it a full-bleed blue cover: three rows of real product photographs rotated −4°, travelling horizontally at three different speeds, running off both edges, with a blue word strip woven between each pair of rows carrying the shop's products and occasions past at its own speed. A left-weighted scrim holds the type side dark and releases to near-clear on the right so the work shows its true colour. The headline sits lower-left at display scale across two lines, a one-sentence lede under it, then the gold primary and a ghost secondary, then a bobbing scroll cue. The cover gives back the header's height so the cue lands inside the fold.

**FORM:** The user reviewed the first build against the supplied template in `public/template/` and pinned the template: "lean more heavily on the template", "I should be impressed". That pin retires the rolled direction (The Album Page, seed key `40cbc32e`) — a user-pinned decision beats the roll. The corner-mounted print, the album grounds and the zero-radius rule are withdrawn with it. Code-led; no image generation is available in this environment.

**MOTION:** GSAP with ScrollTrigger, orchestrated once in `app/site/Motion.tsx`, never scattered. Four moments: the three-speed cover wall plus its scrub-linked drift; the cover's entrance; the running word band; and one reveal grammar batched across sections and shelf cards. Everything animates from an already-visible default, so the page is intact and merely still if the script never runs, and `gsap.matchMedia` skips all of it under `prefers-reduced-motion`.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
