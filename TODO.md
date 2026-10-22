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
- **No stated turnaround.** `MAKE_TIME` is `null` (`data.ts:281`), so product pages say "Check with the shop before you order". PRODUCT.md calls turnaround a real purchase factor for gift-deadline buyers. Checkout also never states when an order will be ready, and neither does the confirmation email. This is the biggest conversion gap and it's a decision for the shop, not code.
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
4. **Turnaround:** the owner confirms a make time, set `MAKE_TIME`, and show it at checkout and in the confirmation email.
5. **Safety:** email verification and double opt-in, and shared-store rate limiting.
6. **Polish:** `sitemap.ts`, `robots.ts`, a custom `not-found.tsx` and `error.tsx`, LocalBusiness schema, an OG image.
7. **Later:** order history and account editing, customer cancel requests, a customers page and counter-sale entry in the admin, vouchers.

I can start on any of these. The favicon fix, the policy-page scaffolding with a checkout agreement line, and the sitemap, robots and 404 pages are the quickest. Tell me which, and whether the shop is VAT-registered, since that changes the invoice and price wording.