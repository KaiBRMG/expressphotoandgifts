"use server";

import { headers } from "next/headers";

import { createAccount, currentCustomer, detailsFrom } from "@/lib/account/auth";
import { priceDeals } from "@/lib/catalog/campaigns";
import { getLiveDeals } from "@/lib/campaigns";
import { rands } from "@/lib/catalog/listing";
import { clampQuantity } from "@/lib/catalog/purchase";
import type { Availability } from "@/lib/catalog/stock";
import { getProducts } from "@/lib/catalog/queries";
import { packCart, quote } from "@/lib/checkout/courier";
import { addressErrors, cleanAddress, hasErrors, readAddress } from "@/lib/checkout/details";
import { readOrderInput, type Checkout, type Quote } from "@/lib/checkout/order";
import { priceOrder, startAttempt } from "@/lib/checkout/orders";
import { payfastReady, startPayment } from "@/lib/checkout/payfast";
import { POLICIES_VERSION } from "@/lib/legal";
import { callerIp, rateLimit } from "@/lib/rateLimit";

/**
 * The details step's two calls to the server. Each is a public endpoint and
 * trusts nothing it is sent: the quote prices the cart from the catalogue,
 * and placing the order prices everything again.
 */

const PAYMENT_OFF = "Online payment isn’t switched on yet. Please call the shop to place this order.";

/**
 * Each press of Pay asks PayFast for a payment under the shop's name and
 * freezes the order again, so one address gets this many in ten minutes:
 * far past a customer changing their mind, short of a script.
 */
const payAllowed = rateLimit(30, 10 * 60 * 1000);

/**
 * Each quote is a call to The Courier Guy with the shop's key, whose API
 * limits its rate and forbids excessive automated use: enough here for a
 * customer trying several addresses, too few for a script to get the
 * shop's account throttled.
 */
const quoteAllowed = rateLimit(40, 10 * 60 * 1000);

/** Courier services to an address, for the cart as it stands: its worth after the live deals, for the cover, and the parcels it packs into. */
export async function quoteDelivery(rawAddress: unknown, lines: { sku: string; quantity: number }[]): Promise<Quote> {
  const address = readAddress(rawAddress);
  if (!address || hasErrors(addressErrors(address)) || !Array.isArray(lines)) return { ok: false, reason: "no-service" };
  if (!quoteAllowed(callerIp(await headers()) ?? "unknown")) return { ok: false, reason: "unavailable" };
  const [products, deals] = await Promise.all([getProducts(), getLiveDeals()]);
  const bySku = new Map(products.flatMap((p) => p.variants.map((v) => [v.sku, { p, v }] as const)));
  const known = lines.slice(0, 100).flatMap((l) => {
    const found = bySku.get(String(l?.sku));
    return found && found.v.price !== null ? [{ ...found, quantity: clampQuantity(Number(l.quantity)) }] : [];
  });
  const value = priceDeals(known.map((k) => ({ sku: k.v.sku, price: k.v.price!, quantity: k.quantity })), deals).total;
  const parcels = await packCart(known.map((k) => ({ p: k.p, sku: k.v.sku, quantity: k.quantity })));
  return quote(cleanAddress(address), value, parcels);
}

export type PlaceResult =
  | { ok: true; ref: string; token: string; checkout: Checkout }
  /**
   * `skip`: campaigns this customer has had already (once each), for the cart
   * to leave out. `total`: the server's own total when it differs from the one
   * shown, which the customer then sees and can pay: so a difference between
   * the browser's pricing and the server's can never leave them unable to.
   */
  | { ok: false; error: string; field?: string; paid?: true; limits?: Availability; skip?: string[]; total?: number };

/**
 * Prices and saves the order as pending, then starts the payment. When the
 * total differs from the one shown, nothing is saved: the customer sees the
 * new total first. Nothing is saved either without the customer's tick
 * agreeing to the policies as they stand (`POLICIES_VERSION`), which the
 * order and its payment attempt keep, with the time.
 *
 * A `password` means the customer ticked "Save my details": their account is
 * made (and they are signed in) before the order is saved, so the order
 * carries it. The password goes to Firebase only, never into the order. If
 * the account can't be made, nothing is saved and the customer is told why.
 * A customer already signed in (say, paying again after closing PayFast)
 * keeps the account they have.
 */
export async function placeOrder(raw: unknown, onsite: boolean, password?: unknown): Promise<PlaceResult> {
  if (!payfastReady()) return { ok: false, error: PAYMENT_OFF };
  if (!payAllowed(callerIp(await headers()) ?? "unknown")) return { ok: false, error: "That’s a lot of tries at once. Wait a few minutes, then pay again." };
  const input = readOrderInput(raw);
  if (!input) return { ok: false, error: "Something went wrong reading your order. Reload the page and try again." };
  // The tick is the customer's agreement to the policies as they stand; a page opened before they changed must show the new ones first.
  if (input.accepted !== POLICIES_VERSION) {
    return input.accepted
      ? { ok: false, error: "Our terms have been updated since this page opened. Reload it to see them, then tick and pay.", field: "terms" }
      : { ok: false, error: "Tick the box to agree to our terms, then pay.", field: "terms" };
  }

  // The account matters to pricing only for a reorder's old photos; priceOrder waits on it only then.
  const signedIn = currentCustomer();
  const [priced, customer] = await Promise.all([priceOrder(input, signedIn.then((c) => c?.uid ?? null)), signedIn]);
  if (!priced.ok) return priced;
  if (priced.order.total !== input.shownTotal) {
    const { skipped } = priced;
    const once = skipped.length
      ? `${new Intl.ListFormat("en-ZA").format(skipped.map((c) => c.name))} ${skipped.length === 1 ? "is" : "are"} once per customer, and ${priced.order.contact.email} has had ${skipped.length === 1 ? "it" : "them"} already. `
      : "";
    return {
      ok: false,
      error: `${once}We’ve checked the prices again: your total is now ${rands(priced.order.total)}. Check it, then pay.`,
      field: "total",
      skip: skipped.map((c) => c.id),
      total: priced.order.total,
    };
  }

  let uid = customer?.uid ?? null;
  if (!uid && typeof password === "string" && password) {
    const made = await createAccount(priced.order.contact.email, password, detailsFrom(priced.order));
    if ("error" in made) {
      const next = made.exists ? "Sign in above, or untick “Save my details” to pay without one." : "Or untick “Save my details” to pay without one.";
      return { ok: false, error: `${made.error} ${next}`, field: "password" };
    }
    uid = made.uid;
  }

  const started = await startAttempt(priced.order, uid, input.key, POLICIES_VERSION);
  if (!started.ok && started.reason === "paid") return { ok: false, error: "This order has already been paid.", paid: true };
  if (!started.ok && started.reason === "too-many") return { ok: false, error: "This order has been tried too many times. Call the shop and we’ll sort it out." };
  if (!started.ok) return { ok: false, error: "This order number belongs to another order. Call the shop and we’ll sort it out." };

  const checkout = await startPayment(started.attempt, started.order.token, onsite);
  if (!checkout) return { ok: false, error: PAYMENT_OFF };
  return { ok: true, ref: started.order.ref, token: started.order.token, checkout };
}
