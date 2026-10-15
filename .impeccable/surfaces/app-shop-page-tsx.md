---
version: 1
slug: "app-shop-page-tsx"
primary_target: "app/shop/page.tsx"
related_targets: ["app/shop/[category]/page.tsx","app/shop/shop.css"]
---

# Shop: /shop landing and the catalogue

## Scope and mode
- `/shop` (Persuade): the storefront a Shop now tap lands on. `/shop/all`, `/shop/<category>`, `/shop/specials` (Operate): the catalogue with a sticky category rail, sort, price band and a "Takes your photo" toggle, state in the URL.
- Out of scope: product pages (`/shop/product/<slug>`, cards link there), cart, upload, search, account, special-price/bundle logic.

## Audience and job
Gift-buyers with a photo on their phone who have not chosen the object yet. The store's selling point is the range of things a customer's own photo can go on; that leads.

## Decisions (user-confirmed)
- Empty categories (Batteries, Jewellery, Snacks, Cameras, Gift Wrapping) show an honest empty state; the rail lists only categories with live products.
- Specials are a `special` flag the shop sets in Firestore (future admin); the band and page hide when none is flagged. Discount logic is a later pass.
- "Sublimation" is stripped from names and kept as a tag.
- Filters: rail + sort + price band, plus the photo toggle.

## Direction contract
THESIS: One photo, many things. The storefront refuses the category-default grid of promo tiles and leads with the customer's photo standing beside every object it can go on.
OWN-WORLD: The Shop Counter, inherited: brand-blue grounds owning sections whole, white reading grounds, amber only on actions and marks, leaning blue sign bands, white door cards with the blue lift, Archivo prose, Geist Mono only on measurements.
STORY: The visitor sees their photo can become a mug, puzzle, globe or keyring; finds a gift under R100 or a frame in the right size; reaches any category in one tap; learns prints are a WhatsApp away.
FIRST VIEWPORT: Blue header; a leaning brand-blue sign band, "Your photo, on 13 things" with the count in amber, lede on a slimmer band; under it on white, the category strip, then the photo board starting: the sample customer portrait as the double cell labelled Your photo, the personalisable products filling the board as doors with prices.
FORM: Inherited world, code-led, no concept seed (structure confirmed in the shape brief). Signature interaction: the Royal frame size chart, six sizes drawn to true scale, picking one lights its outline and price.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
