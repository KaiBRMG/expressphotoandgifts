@AGENTS.md

**ALWAYS READ** first

# Express Photo and Gifts

E-commerce website for a photo printing and gift shop. See `PRODUCT.md` for users, positioning and stack decisions, and `DESIGN.md` for the design system (colours, type, components).

## Current scope

- The homepage and the shop exist: `/shop` (storefront) and `/shop/<slug>` (catalogue for `all`, `specials` or a category, with rail, type chips, occasion and recipient filters, sort, price band and photo filter). Product pages exist at `/shop/product/<slug>` (`app/shop/product/`), where Add to cart fills the cart (the page's only order route; WhatsApp there is only for an unpriced variant or asking about a date) and a photo-needs block shows the photo count, print area and shape from `photoSpec` before the customer commits. The cart is client-side (`app/site/cartStore.ts`, localStorage; line logic in `lib/catalog/cart.ts`): once it holds anything, the dock's gold pill becomes Cart with the unit count and opens the cart drawer (`app/site/Cart.tsx`), which re-checks prices against `/api/prices` and goes on to checkout: the photo step, or straight to details when nothing takes a photo. The photo step of checkout exists at `/checkout` (`app/checkout/`): every cart line that takes photos is drawn as its slots (count, print area and shape from `photoSpec`), beside one tray of uploads; a photo can fill any number of slots, and each slot has its own edit (crop, zoom, quarter turns, greyscale, a print turned on its side) and a gentle sharpness note below 200 dpi that never blocks the order (`lib/catalog/checkout.ts`; the threshold is for the shop to confirm); zooming out past filling shows the whole photo with white borders. Frames say the print is not included and offer the matching print (here and in the cart drawer, via `/api/needs`). Uploads go from the browser to Cloudinary under `orders/<ref>/`, signed by `/api/uploads/sign` one file per signature (the signature names the file) and rate-limited per IP (`lib/rateLimit.ts`). The photo step makes the ref with a secret key kept in localStorage; the first order saved under a ref claims it with the key's hash, and only that key can replace the unpaid order. An unpaid checkout starts over in the browser after 10 days, and a daily cron (`vercel.json` → `/api/cron/sweep-uploads`, `lib/checkout/uploads.ts`) deletes the photos of orders never paid after 14. A photo is placed whole and untouched by default (never auto-cropped), and an untouched place sends the original upload; a place the customer edits is rendered in the browser at full resolution and uploaded as its own file (`bake` in `app/checkout/images.ts`). The photo step goes on to `/checkout/details` (`app/checkout/details/`): contact, collect-or-courier (The Courier Guy rates via `lib/checkout/courier.ts`; its parcel size is a placeholder for the shop to confirm), a review with the placed photos, and payment by PayFast (`lib/checkout/payfast.ts`: Onsite window with the redirect form as fallback). Placing an order (`placeOrder`) re-prices everything on the server (orders under R5, PayFast's floor, are refused), writes `orders/{ref}` as pending and freezes it as a payment attempt (`orders/{ref}/attempts/{ref}-{n}`, PayFast's `m_payment_id`), so a payment always pays for exactly what was on screen when Pay was pressed (`lib/checkout/orders.ts`). Only the PayFast notice at `/api/payfast/notify`, after its four checks (signature with the required passphrase, PayFast's published IP ranges or hosts, amount to the cent against its attempt, and PayFast's validate), marks it paid. Every notice is recorded under `orders/{ref}/notices`; a second payment, a wrong amount or a signed notice that failed a check flags the order (`flagged`, `issues`) for the shop, and an unsigned one is never written. Once paid, the shop and the customer are emailed through Resend (`lib/checkout/paid.ts`, `lib/checkout/emails.ts`, `lib/email.ts`). A "Save my details for next time" tick under the contact fields adds a password field beside the email; paying then makes the account (before the pending order is saved, so the order carries it) and signs the customer in. The receipt is `/checkout/done?ref=&t=` and, when the order has no account, offers one (`lib/account/auth.ts`, session helpers shared with the admin in `lib/identity.ts`); `/account` signs in and shows the saved details. Checkout no longer sends orders on WhatsApp. Settings live in `.env.local`: `FIREBASE_SERVICE_ACCOUNT_KEY`, `FIREBASE_WEB_API_KEY`, `ADMIN_EMAILS`, `SITE_URL`, `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_SANDBOX`, `PAYFAST_ONSITE`, `RESEND_API_KEY`, `EMAIL_FROM`, `ORDER_EMAIL_TO`, `TCG_API_KEY`, `TCG_API_URL`, `CRON_SECRET` (the sweep refuses to run without it).
- Search: the header's search mark (`app/site/HeaderSearch.tsx`) opens a field and a results window, matching product names, category names and tag labels via `lib/catalog/search.ts`; it loads the catalogue once from `/api/search` (static, hourly). "See all" goes to `/shop/all?q=`, which the catalogue filters with the same matcher.
- The admin console is at `/admin` (`app/admin/`): staff sign in at `/admin/login` (`lib/admin/auth.ts`: Firebase Auth from the server, an httpOnly session cookie scoped to `/admin`, and an admin only by the `admin: true` claim or `ADMIN_EMAILS`). Orders (`/admin/orders`, `lib/admin/orders.ts`) lists open, flagged and recent orders; an order's page has its photos to print, the customer and delivery, the payment and every PayFast notice, its stage (new, being made, ready, done), refunds (made in PayFast's dashboard, recorded here), issues to mark as looked at, and its emails to resend, with every change logged by who made it. Products is a table with bulk status and special changes, and an editor (`app/admin/editor/`) with tabs for details, prices, photos, customer photo and filters, a live preview, a save bar, a leave guard and Duplicate. Every write is a server action in `app/admin/actions.ts` that checks the session itself; storage is `lib/admin/products.ts` (reads fresh, not cached) and the rules shared with the browser are `lib/catalog/edit.ts`. Saving refreshes the shop through the `catalog` cache tag. Product photos upload from the browser to Cloudinary, signed by `lib/admin/cloudinary.ts`, and photos staff remove are destroyed there.
- If you build backend logic, run /simplify after implementing.
- This is an e-commerce website, all implemented logic should reflect that of the industry-standard.

## Stack

- Next.js 16 (App Router, React 19), TypeScript. Read the bundled Next docs before writing code (see AGENTS.md).
- Mantine v9 is the primary UI library, with Tailwind v4 alongside it for layout. Mantine docs: https://mantine.dev/llms.txt
- GSAP for motion.
- Firebase (Firestore) holds the product catalogue and orders; Firebase Auth signs in staff and customers (server side only). Payments go through PayFast.

## Layout

- `app/page.tsx` — the homepage; styles in `app/home.css` and `app/globals.css`.
- `app/site/` — shared chrome (`SiteHeader`, `SiteFooter`, `OrderDock`, `chrome.css`) and homepage components (`Carousel`, `CategoryCards`, `Newsletter`, `Motion`, `icons`).
- `app/shop/` — the storefront and catalogue; `shelves.ts` resolves shelves and the rail from the catalogue, `lib/catalog/listing.ts` holds card data, price formatting, sorts and price bands.
- `app/site/data.ts` — every fact the homepage states. Only verified content goes here: no invented prices, review counts, turnaround promises or capability claims.
- `public/product_list.json` — the original catalogue export; superseded by Firestore.

## Catalogue (Firebase)

- Firestore project `expressphoto-c94ab`. Schema and its conventions live in `lib/catalog/types.ts`: `categories/{id}` and `products/{slug}` with embedded options, variants (SKU + price in ZAR cents) and media (`role: "photo" | "dimension"` — dimension diagrams appear only on the detailed product page).
- Five categories (`photo-gifts`, `frames`, `photo-printing`, `jewellery`, `add-ons`); finer grouping is tags, not sub-categories. Tags are `facet:value` from the closed vocabulary in `lib/catalog/tags.ts`: `type`, `occasion` and `for` are shopper filters (in the URL as `?type=&occasion=&for=`); `process`, `fits` and `holds` are internal, and a `fits` meeting a `holds` is a "Goes with this" pairing (`lib/catalog/related.ts`). Old category URLs redirect in `next.config.ts`.
- The admin console is where the catalogue is edited, including what the customer supplies (`personalisation`), tags and the `special` flag. `scripts/catalog-merchandising.mts` only seeds personalisation and tags for the importer, which fails on a product missing from it and never writes `special`.
- Read it only on the server through `lib/catalog/queries.ts` (Admin SDK, cached under the `catalog` tag). `firestore.rules` denies all browser access; deploy changes with `firebase deploy --only firestore:rules`.
- `npm run import:catalog` seeds Firestore from `Express Photo Website Catalogue.xlsx` and refuses to write over a catalogue that already has products; `-- --replace` replaces it, discarding every admin edit, and `-- --dry-run` writes `catalog-preview.json` instead. Prices come from the "Product Catalogue" sheet, text from the "Quick List" sheet; products without a price import as `draft` and are not shown. Print-process prefixes ("Sublimation") are stripped from names and kept in `tags`.

## Images (Cloudinary)

- Product photos live in Cloudinary under `products/<code>`, not in `public/`. Render them with `ProductImage` (`app/site/ProductImage.tsx`), which uses `next-cloudinary` with a fixed set of widths.
- Credentials are in `.env.local` (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Never expose the secret to client code.
- Cloudinary is on the free tier and must stay there. Keep storage, bandwidth and transformation usage to a minimum: store assets no larger than they are displayed, deliver with f_auto/q_auto at the smallest width that renders sharply, and limit the number of distinct derived sizes (add to the shared width list in `ProductImage` rather than inventing new ones).

## Mobile text size

Text smaller than 16px on form inputs, textareas and select menus makes mobile Safari zoom in when tapped. No text element may be smaller than 16px on mobile.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
