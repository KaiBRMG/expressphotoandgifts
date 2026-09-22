# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router, React 19) with TypeScript. **Mantine v9 is the primary UI foundation**, with Tailwind v4 available alongside it for layout and utility styling. E-commerce is built end-to-end in this codebase — no Shopify, no commerce SaaS. Payments go through **PayFast (payfast.io)**, a South African payment provider, via its API.

## Users

**Primary: individual consumers ordering personalised photo products.** They arrive with photos they care about — family, a wedding, a pet, a graduation, a gift for someone — and want them turned into a physical object. Many are buying a gift against a deadline. They are not designers; they need the upload-and-configure step to feel safe and obvious, and they need to believe the printed result will look right.

They fall into two fulfilment situations that the site must serve equally well:
- **Local customers** near the store, who may prefer to collect in person and who value knowing a real shop stands behind the order.
- **Remote customers** ordering online for delivery.

**Secondary, under consideration: bulk / corporate buyers.** Companies, schools, clubs, and event organisers ordering in quantity. Not a launch focus and not yet a confirmed line of business, but the site must not be built in a way that excludes them or makes them feel they are in the wrong place.

## Product Purpose

Express Photo and Gifts turns customers' own photos into printed products and personalised gifts. It is a real storefront that also sells online.

The site is the online storefront and the primary ordering channel. Success is a customer who finds the product they want, uploads their photo, configures it with confidence, pays, and chooses pickup or delivery — without phoning the shop to ask whether it will come out right.

## Positioning

An actual local photo and gift shop selling online, not a faceless print-on-demand pipeline. The store, its hours, and its location are real and stated, and pickup is a genuine option. The intended feel is **online-first in capability, local and inviting in character** — the convenience and completeness of an online store, with the reassurance that a nearby shop is doing the work.

## Operating Context

- **Market: South Africa.** Pricing in ZAR. PayFast is the payment rail. Delivery expectations, courier norms, and address formats are South African.
- Customers arrive with a photo already on their phone or computer. Mobile upload is a first-class path, not a fallback.
- Orders split into two fulfilment modes chosen at checkout: **collect at the store** or **ship**.
- Gift-driven demand is seasonal and deadline-bound (birthdays, Christmas, Mother's/Father's Day, matric/graduation, weddings). Turnaround time is a real purchase factor.
- A physical storefront exists and takes walk-in and counter business alongside the site.

## Capabilities and Constraints

**Confirmed for launch:**
- **Store, hours and contact — supplied by the user and binding.**
  135 Scott Street, Scottburgh, Ugu District Municipality, KwaZulu-Natal, 4180.
  Trading hours: Monday to Friday 8:30am–4pm; Saturday 9am–1pm; Sunday closed.
  Phone and WhatsApp 076 491 2300 (+27 76 491 2300); info@expressphotoandgifts.com;
  Instagram @expressphotoscottburgh; Facebook ExpressPhoto Scottburgh.
  WhatsApp is the shop's live order and enquiry channel until online checkout ships.
- Browse products and pricing — full catalogue with sizes, options, and prices.
- Upload photos and order online — select a product, upload an image, configure it, and pay.
- Find the store — location, hours, directions, contact.
- Checkout takes payment online, and the customer chooses pickup or shipping at checkout.
- Commerce is custom-built in this repo; PayFast handles the payment step.

**Open / undecided — do not present as settled:**
- The product catalogue itself: which products, which sizes, which options, and what they cost. Not yet supplied.
- Whether the bulk/corporate line launches, and what form it takes (quote request, tiered pricing, account).
- Shipping: courier, rates, zones, and turnaround times.
- Order tracking, customer accounts, and order history — not confirmed as in scope.
- Image quality handling (minimum resolution, DPI warnings, crop preview) — a known hard problem for this product type, not yet specified.

## Brand Commitments

**Name:** Express Photo and Gifts.

**Brand colours (supplied by the user, binding):**

| Value | Colour | Role |
|---|---|---|
| `#001DA4` | deep blue | primary |
| `#FFB72A` | warm amber / gold | accent |
| `#FFFFFF` | white | contrast / text |
| `#000000` | black | contrast / text |

These values and these roles are confirmed by the user and must be used as given. No colour outside this set may be introduced as a brand colour.

What is *not* fixed here: the tints, shades, and neutrals required for surfaces, borders, hover/focus/disabled states, and body copy. Those are derived work for new-work and DESIGN.md, and must extend this palette rather than replace or dilute it.

Contrast constraint carried by these values: `#001DA4` is dark enough to take white text; `#FFB72A` is not, and pairs legibly only with black or the primary blue. Any amber-filled control must therefore use dark text.

**Logo: exists and is binding, but not yet in the repository.** The user will add the file to `/public`. Until it lands, work must use a clearly-marked placeholder and must not invent a logo or wordmark that could be mistaken for the real identity.

**Tone:** friendly and local, while remaining credible to a corporate buyer. Warm, not twee; capable, not corporate-cold.

## Evidence on Hand

**None yet.** The repository is an unmodified `create-next-app` scaffold. There are no product photos, no examples of printed work, no store photography, no testimonials, no reviews, no customer names, no pricing, and no catalogue data.

Nothing in this list may be fabricated. No invented testimonials, review counts, star ratings, "trusted by" logos, customer numbers, years-in-business claims, turnaround guarantees, or sample prices. Where a real asset is required and missing, ship an explicit placeholder that names what the user must provide.

## Product Principles

1. **The customer's photo is the product.** Every surface should make the customer's own image the thing on screen, and every step should build confidence that it will print the way they expect.
2. **Local is the differentiator, not a limitation.** A real shop, real hours, and real pickup are the credibility this business has over print-on-demand. Say so plainly rather than hiding behind generic e-commerce polish.
3. **Ordering must survive a non-technical customer on a phone.** Upload, crop, configure, and pay are the critical path; anything that adds a decision to that path has to earn it.
4. **Inclusive of the corporate buyer without being built for them.** A bulk enquiry should have an obvious home, but consumer gift-buying leads.
5. **Never fabricate proof.** Missing content is marked as missing, not filled with plausible-sounding invention.

## Accessibility & Inclusion

No product-specific standard has been established. The general requirement follows from the audience: customers are non-technical, span a wide age range, and frequently buy on mobile — so touch targets, contrast, legible type at real sizes, and keyboard/screen-reader access through the upload and checkout flow are functional requirements of the ordering path, not a later polish item.
