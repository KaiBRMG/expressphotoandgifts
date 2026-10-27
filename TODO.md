# Express Photo and Gifts: customer and shop audit

I read the code, ran type-check, lint and a production build, and checked the Vercel deployment list. I did not click through the live site or place a sandbox order, so the checkout items below come from reading the code. The legal points are shop-standard e-commerce practice for South Africa (CPA, ECTA, POPIA), not legal advice.

The core purchase flow is complete and unusually solid: server-side re-pricing, signed PayFast notices, stock, courier packing and booking, photo editing and tracking. What's missing is almost entirely the standard trust, legal and discovery layer around it.

## 1. Broken or blocking

| # | Finding | Evidence |
|---|---|---|
| 1 | **The next deploy will fail.** `npm run build` stops with `Processing image failed … The PNG is not in RGBA format` on `app/favicon.ico`. The file is an uncommitted change, saved today at 10:38. Production is fine at the moment (last 5 deployments are READY from committed code). | Build log; `git status` shows `M app/favicon.ico`. I moved the file aside for one build and restored it, byte-for-byte. The build then got past the favicon. |
| 2 | A second type-check error comes from stale dev output: `.next/dev/types/validator.ts` points at a deleted `app/admin/zz-preview`. It is local only and a fresh Vercel checkout won't hit it. Delete `.next/dev` if the local build still complains. | `tsc` and build output |
| 3 | **Production environment can't be confirmed.** `.env.local` has `PAYFAST_SANDBOX=true` and TCG on the sandbox URL. It also lacks `CRON_SECRET` and `TCG_WEBHOOK_SECRET`, and your CLAUDE.md says the crons refuse to run without `CRON_SECRET`. I couldn't read Vercel's env list (403), so check the production values by hand. | `.env.local` |

## 2. Missing: standard for any online shop

**Legal and trust pages.** There are none. A search found no privacy, terms, returns or cookie text anywhere in the customer app.
- **Privacy policy.** POPIA requires one, because the site collects names, phones, addresses and customer photos, which may include children.
- **Terms of sale.** Checkout has no "I agree" or link to terms before Pay. ECTA expects the supplier's details, the full price, and cancellation and return terms to be available before payment.
- **Returns, refunds and cancellation policy.** Personalised goods are generally exempt from the cooling-off right, but the site has to say so. Faulty goods are covered by the CPA's 6-month warranty. Customers currently have no stated way to cancel an order or report a fault.
- **Shipping and delivery policy.** Nothing explains how or when parcels go out, what happens if a courier delivery fails, or what a collect order means.
- **Shop details for ECTA.** The shop's registered name and any registration number are not shown. The footer has only "©year. All Rights Reserved."
- **Marketing consent.** The footer sign-up bundles "account + marketing" into one tick-less action, and POPIA wants explicit opt-in. Nothing sends marketing yet, but there is no unsubscribe mechanism, so that needs building before the first campaign.
- **Photo handling.** Say how long photos are kept (the cron deletes unpaid ones at 14 days; what about paid ones?) and who can see them.

**Discovery.**
- No `sitemap.xml`, no `robots.txt`, no web manifest.
- No custom 404 page and no customer-side `error.tsx`. Visitors get Next's default pages, and a server error on checkout is unstyled.
- No `Organization` or `LocalBusiness` schema, so hours, address and phone aren't machine-readable. The product pages do have good Product and Breadcrumb JSON-LD and canonicals.
- The root layout's OG tags have no image, so shared links show no preview. Category and shop pages have no canonical for filtered URLs (`?type=&sort=`), which creates duplicate-content risk.
- No Google Analytics, Search Console or Meta pixel. Only Vercel Analytics plus the shop's own funnel counters exist, so you can't run ads or measure conversion properly.

**Missing pages.** There is no About, Contact or FAQ page, and no dedicated "How it works" page. The footer's contact details are the only way in. The header's Cart icon links to `#` (`SiteHeader.tsx:25`), a dead link by design that only works through the dock.

**Customer account.**
- No order history, and no "reorder".
- Saved details can't be edited from the account page. Only the latest order overwrites them.
- No change-password, no delete-account and no data export. POPIA gives the customer those rights.
- The receipt link (`ref` + `t`) is the only way back to an order. Anyone who loses the email has no route to tracking except calling the shop.

**Order lifecycle.**
- The customer can't cancel or amend an order. Even a quick "wrong photo" fix needs a phone call.
- No tax or VAT invoice. If the shop is VAT-registered (R1m turnover), customers need a tax invoice with the VAT number and amount. The emails show a total only.
- Prices appear to be shown as a single total with no statement of VAT inclusion. Confirm the shop's VAT status and state "incl. VAT" if applicable.
- No abandoned-cart recovery. The cart lives only in the browser's localStorage, so it doesn't follow the customer to another device.

**Product pages.**
- **No reviews or social proof.** Nothing from real customers, and the shop's own rule bans invented ones, which is right.
- No gift message or card option (the line `note` is the nearest), and no gift wrapping as an orderable item even though the homepage advertises "personalised gift wrapping".
- No wishlist or save-for-later. This is a minor omission.

**Promotions.** Campaigns (automatic discounts) exist, but there are no discount codes, gift vouchers or loyalty. The footer promises "exclusive member-only loyalty deals", and nothing in the codebase delivers that. Either build it or remove the promise.

## 3. Incomplete or risky

- **Unverified email accounts.** `createAccount` makes an account for any email with no verification. Someone can sign up as another person's address, record marketing consent for them, and later hold that person's saved details or block them from registering. Fix: send a verification link, and only record consent once confirmed (double opt-in).
- **Rate limiting is per server instance, in memory** (`lib/rateLimit.ts`). On Vercel's serverless runtime it slows almost nothing, as the file's own comment admits. Sign-in, the footer email lookup, password reset, `createAccountFromOrder` and receipt-token guessing have no limit at all. Use a shared store (Upstash/Vercel KV) or Vercel's firewall rules. The email lookup also confirms whether any address has an account.
- **Account made before the order.** In `placeOrder`, the account is created before `startAttempt`, so if the attempt is refused (too many tries, ref taken) the customer is left with an account and an unpaid order that failed.
- **Upload size.** Cloudinary's free plan caps files at 10 MB. Customers editing a large original and the full-resolution "baked" render could exceed that. The error handling for this was not checked, and a clear message matters because phone and camera photos are the whole product.
- **Quote vs. cost.** Insurance and packing depend on `settings/shop.boxes` placeholders until staff save real box sizes and weights. Until then courier prices may be wrong. Admin help also says shipping measures are "Estimated" until confirmed, so confirm that every live product has real measures before taking courier orders.
- **PayFast Onsite fallback.** Onsite only runs over https and falls back to the redirect form, which is fine. But the PayFast account-level sandbox flag (`PAYFAST_SANDBOX`) is a one-line difference between taking real and fake money, so it needs a launch checklist.
- **`SHOW_UNPRICED=1`** is set locally. It lets unpriced draft products show. Confirm it is not set in production.
- **Credentials in `.env.local`.** A comment holds the admin login in plain text. The file is gitignored (`.env*`), so it isn't committed, but rotate that password if the file ever left this machine.

## 4. Unclear to customers

- **When will I get it?** There is no made-by date at checkout, in the confirmation or on the receipt. Only the courier's estimate appears once booked, so collect customers never get any date.
- **What happens after I pay?** The receipt says "Questions? Call…" but never describes the sequence: shop makes it, then it is booked, then dispatched.
- **Which print goes with which frame.** The photo step handles this well. The product page only warns that the print is not included, and a customer who doesn't read it can still check out a frame with no photo, which the checkout labels "Frame only, no print".
- **Gift buyers.** The gift-recipient fields exist, but there is nowhere to say "don't include prices" or "add a card".
- **Opening hours vs. orders.** Nothing states how Sunday or after-hours orders are treated, or the cut-off time for same-day work.
- **"Collect for free".** Fine, but nothing says how customers are told it is ready, or how long it is held.

## 5. Shop (admin) gaps

What exists is strong: orders workbench, courier booking, payment reconciliation, stock, campaigns, analytics, print sheets. Gaps against standard shop-owner needs:
- **No customers view.** You can't look up a customer, see their orders together or handle a data-deletion request.
- **No manual or phone order entry.** The shop's real channel is walk-in and WhatsApp, so counter sales and phone orders have nowhere to go.
- **Refunds are recorded but made in PayFast's dashboard.** That is workable, but it is two steps and a risk of the two disagreeing, which the payments page mitigates.
- **No order cancel action** that releases stock and refunds in one go. There is a stock-return on refund, but nothing for "customer asked to cancel before printing".
- **No printable invoice or packing slip**, only the photo print sheet.
- **No CSV export** of orders for accounting (analytics has an export, orders don't).
- **No email-list tool** and no unsubscribe handling, matching the consent gap above.
- **Single shared admin login** appears to be in use (the comment in `.env.local`). Per-person accounts through `ADMIN_EMAILS` exist, so use them for the audit trail.

## 6. What's in good shape

Server-side price and stock re-checks, PayFast's four-check notice validation, duplicate-payment flagging, daily reconciliation, resumable unpaid checkouts, a 14-day sweep of orphaned uploads, mobile-safe 16px inputs, honest "no invented claims" copy rules, Product JSON-LD with live availability, and a clean lint and type-check.

## Suggested order of work

1. **Today:** re-export `favicon.ico` as a valid RGBA PNG-in-ICO, or revert it, before the next push.
2. **Before launch:** confirm production env values (live PayFast, live TCG, `CRON_SECRET`, `TCG_WEBHOOK_SECRET`, `SHOW_UNPRICED` unset) and the real box sizes.
3. **Legal pack:** privacy, terms, returns and delivery policy pages, a footer link row, a "by paying you agree" line with links at checkout, and the shop's trading details. Have the owner and an adviser sign off on the wording.
4. **Delivery time:** the product page states 3–5 business days (`DELIVERY_TIME`); show it at checkout and in the confirmation email too.
5. **Safety:** email verification and double opt-in, and shared-store rate limiting.
6. **Polish:** `sitemap.ts`, `robots.ts`, a custom `not-found.tsx` and `error.tsx`, LocalBusiness schema, an OG image.
7. **Later:** order history and account editing, customer cancel requests, a customers page and counter-sale entry in the admin, vouchers.

I can start on any of these. The favicon fix, the policy-page scaffolding with a checkout agreement line, and the sitemap, robots and 404 pages are the quickest. Tell me which, and whether the shop is VAT-registered, since that changes the invoice and price wording.

## 7. Security audit (2026-10-26)

A source-only audit of the whole codebase (reduced, lighter pass at the owner's request). **No code was run, so nothing below is confirmed by a reproduction.** Each item was read through and checked by a fresh reviewer against the source; the "if real" column is that reviewer's estimate of the damage, not a severity. Full traces, evidence and test plans are in `~/security-audit-skill/expressphotoandgifts/run-1/` (`REPORT.md`, `NEEDS-VALIDATION.md`). Not run: a second coverage pass, and `npm audit` (dependency CVEs are unchecked).

### Fix first

- [x] **Admin console pages are checked only by the shared layout** (`app/admin/(console)/layout.tsx:6`). If a forged `Next-Router-State-Tree` request skips the layout, an anonymous caller could read every customer, order and payment record. None of the 15 console `page.tsx` files or the `lib/admin` readers (`listCustomers`, `getCustomer`, `getOrderForAdmin`) check the session. Only the five download routes, `/admin/print/[ref]` and the server actions do. *If real: high.* **Fix:** call `await requireAdmin()` at the top of each console page, or inside the `lib/admin` readers. **Check:** from a private window, replay the RSC request against a preview deploy and see whether customer fields come back. *Done: every console `page.tsx` (and the `generateMetadata` that reads data) calls `requireAdmin()` itself; the layout keeps it for the sidebar. Still worth the replay **Check** on a preview deploy.*
- [x] **A customer account can become an admin.** `createAccount` blocks staff emails only when the account is created (`lib/account/auth.ts:67`), and `isAdmin` accepts any account whose email is in `ADMIN_EMAILS` with no `email_verified` check (`lib/admin/auth.ts:35`). Someone who signs up with a future staff address keeps their password once you add it to the list. *If real: high, but needs you to list an address someone else registered first.* **Fix:** require `email_verified` or the `admin: true` claim only for admin, and mark staff accounts. **Check now:** in Firebase Auth, confirm each address in `ADMIN_EMAILS` was created by you in the console and has no `customers/{uid}` or `marketing/{uid}` record. Also confirm public sign-up is off. *Done: `createAccount` marks every account `customer: true` (`CUSTOMER_CLAIMS`, `lib/identity.ts`) and `isAdmin` ignores the allowlist for a marked account. Accounts made before need `node --env-file=.env.local scripts/mark-customer-accounts.mts` (try `--dry-run` first), run before anyone is added to `ADMIN_EMAILS`. The **Check now** in Firebase Auth still stands.*
- [x] **PayFast notice parser trusts fields after the signature** (`lib/checkout/payfast.ts:215-230`). The signature covers only the pairs before `signature`, but the notice is built from every pair, and the shop hands browsers a form signed with the same passphrase. Anyone can write forged "payment refused" flags and long text onto any order (needs only the order ref) and bloat its document. Marking an order paid still rests on the PayFast IP and validate checks. *If real: medium.* **Fix:** build the notice from the signed prefix only, and treat pairs after `signature`, duplicate keys, and checkout-only keys (`merchant_key`, `return_url`, `cancel_url`, `notify_url`) as unsigned. Cap the length of `pf_payment_id`, status and amount before they are recorded. *Done: `readNotice` reads only the pairs before `signature`, refuses repeated keys and checkout-form keys (unsigned, so never recorded), and cuts each recorded field at 100 characters.*
- [x] **Footer sign-up has no rate limit and no email proof** (`app/account/actions.ts:84`). Anyone can create accounts for other people's emails, record marketing consent for them, and send the welcome email through your Resend account (shared with order emails). The consent then shows on Email all and the opted-in CSV as if the person agreed. *If real: medium (POPIA exposure, Resend quota and sender reputation).* **Fix:** send a verification link and record consent only after it is clicked (double opt-in); rate-limit with the shared store from section 3; have `optedIn()` skip unverified accounts. This is the same gap as "Unverified email accounts" in section 3. *Already fixed by the "Email me specials" sign-up: it makes no account, is rate-limited, and records consent only after the emailed link is followed (`app/subscription`, `lib/subscribers.ts`). The remaining gap is the welcome email sent for "Make an account" (rate-limited at 5 an hour per instance), which is section 3's "Unverified email accounts".*

### Then

- [ ] **Sign-out leaves personal data in the browser.** The `/account` Sign out and Delete account clear nothing client-side, so the next person on that browser sees the saved name, phone, address and past order photos pre-filled (`epg:details:v1`, `epg:photos:v2`, cart), plus the unpaid order's claim key. The code says it is forgotten on sign-out (`app/checkout/draft.ts:6`). *If real: medium on shared devices.* **Fix:** clear those keys in `SignOutButton` (`app/account/AccountForms.tsx`) and after account deletion. The checkout's own sign-out also leaves the merged details in state, so the next keystroke writes them back.
- [ ] **CSV exports can carry spreadsheet formulas.** `toCsv` skips its guard for any cell starting with `-` and a digit, so a name like `-1+HYPERLINK(...)` passes, and a lone carriage return is not quoted (`lib/admin/csv.ts:9-10`). Names flow into the analytics and marketing exports. *If real: medium.* **Fix:** neuter unless the whole cell matches `/^-?\d+(\.\d+)?$/`, and add `\r` to the quoting test.
- [ ] **Upload signing is not tied to an order** (`app/api/uploads/sign/route.ts`). Anyone can get a signature for any order ref (refs appear on receipts and emails), so strangers can plant files in someone's `orders/<ref>/` folder, fill Cloudinary storage (no size is signed; the only limit is 300/h per IP per instance), and keep files out of the sweep (a folder is judged by its newest upload; the listing stops at 10,000 files). They cannot read or overwrite the victim's files. *If real: low to medium.* **Fix:** check the claim hash and refuse paid orders before signing; sign `max_file_size`; add a global or per-ref cap.
- [ ] **Photo deletion may leave files behind.** `deleteOrderPhotos` makes one delete-by-prefix call, checks only that it returned OK, then records the photos as deleted (`lib/checkout/uploads.ts:106-121`). If Cloudinary caps the call, the rest stay publicly reachable while the account, receipt and print sheet say they are gone. *If real: low.* **Fix:** loop on `partial` / `next_cursor`, and only then write `photosDeletedAt`. **Check:** the delete-by-prefix limit in Cloudinary's Admin API docs.
- [ ] **Campaign caps are checked only when pricing** (`lib/campaigns.ts:146`). Several checkouts opened before the first payment all keep the deal, so a capped or once-per-customer campaign can be exceeded. The once-per-customer key is the typed, unverified email, so another address also works. *If real: low.* **Fix:** re-check caps inside `applyNotice`, or reserve capacity when the attempt starts.
- [ ] **Payment attempts never expire** (`lib/checkout/orders.ts:233,350`). A saved PayFast form paid weeks later is honoured at the old price and deal, and can mark an order paid after its photos were swept. *If real: low.* **Fix:** reject notices for attempts older than a set window or older than the order's newest attempt.
- [ ] **Analytics can be filled with junk search terms** (`lib/analytics.ts:21`, `/api/track`). Each new term adds a field to one document per day; past Firestore's limits that day's funnel counters stop recording. Orders are not affected. *If real: low.* **Fix:** cap the number of distinct terms per day, or only count terms the catalogue search really missed.

### Also noted

- Rate limits are per instance and use the first `x-forwarded-for` entry (section 3 already covers moving to a shared store). Sign-in, password reset and `lookupSignUpEmail` have no limit in code and rely on Firebase.
- No security headers or CSP are set (`next.config.ts`). Cookies are `SameSite=Lax`, so framing is not an immediate risk; add `frame-ancestors 'none'` anyway.
- `PAYFAST_SANDBOX=true` or a sandbox TCG URL in production is only shown in the UI, not refused. Consider refusing sandbox when `VERCEL_ENV=production`.
- Removing `admin: true` or signing out does not end an existing admin session (5 days). Also call `revokeRefreshTokens` when offboarding staff. Customer sign-out has the same gap (14 days).
- Staff cannot record an out-of-band marketing opt-out (reply or in person) in the admin; the emails do link to the account switch.
- `lib/checkout/packing.ts`: a cart of unmeasured products is quoted as one standard box whatever the quantity. Add real measures to every courier product.
- Run `npm audit` against `package-lock.json`.
- Fill `LEGAL` in `app/site/data.ts` (registered name, legal form, registration and VAT numbers if any, Information Officer). The terms and privacy pages now leave unset facts out instead of showing "[to be supplied by the shop]", so nothing on them says the page is incomplete; ECTA s43 expects the registered name and legal form. Better: move `LEGAL` into Settings (`settings/shop`) with a dashboard note while it is empty.
- Marketing consent lives in two places, `marketing/{uid}` (accounts) and `subscribers/{customerKey}` (email-only, `lib/subscribers.ts`), kept in step by hand (confirm, withdraw, `adoptSubscription`). One doc per address, `marketing/{customerKey(email)}`, would remove `accountUid` lookups and the merge in `lib/admin/customers.ts`. Confirm links could be signed instead of stored, which removes the pending records and their sweep.
- The unsubscribe links are signed with a key derived from `FIREBASE_SERVICE_ACCOUNT_KEY` (`lib/unsubscribe.ts`): rotating that credential breaks the links in emails already delivered. Give them their own `LINK_SECRET`, and consider signing the `customerKey` hash so no address is in the URL.
- The legal pages' contents list sits above the first clause on phones under 34rem; fold it behind "On this page".
- The `/shop` storefront sign (`shop.css:34`, `clamp(2rem, 8.4vw, 4.75rem)`) and its gold chip radius (`shop.css:351`, 14px) sit off DESIGN.md's ramp and radius steps.
- About page (built, hidden in `app/_about/`; rename to `app/about` and re-add the footer, sitemap and `/llms.txt` links to launch) still needs from the shop, all `null` in `ABOUT` in `app/site/data.ts` (each is left off the live page until set; dev and previews show a dashed "To supply" slot): who runs the shop (`ownerName`, `ownerRole`), the year it opened (`opened`), how it started (`story`), what a visit is like (`visit`), a shop photograph filed in Cloudinary under `products/<code>` (`shopPhoto`), how long an order takes to make if the shop will keep to it (`makeTime`), and how bulk orders work once that line is confirmed (`businessCustomers`). Its "Who is behind the shop" ledger also reads `LEGAL` (above). Its promises section restates `/terms` and `/privacy`: change one, change the other.
- The product page says "Delivery takes 3–5 business days" (`DELIVERY_TIME`) while `/terms` promises no date unless confirmed in writing. The About page follows the terms; reconcile the two.
