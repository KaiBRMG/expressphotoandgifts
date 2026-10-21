"use server";

import { headers } from "next/headers";

import { createAccount, currentCustomer, detailsFrom } from "@/lib/account/auth";
import { cartSubtotal } from "@/lib/catalog/cart";
import { clampQuantity } from "@/lib/catalog/purchase";
import { getProducts } from "@/lib/catalog/queries";
import { boxForOrder } from "@/lib/checkout/boxes";
import { quote } from "@/lib/checkout/courier";
import { addressErrors, cleanAddress, hasErrors, readAddress } from "@/lib/checkout/details";
import { readOrderInput, type Checkout, type Quote } from "@/lib/checkout/order";
import { priceOrder, startAttempt } from "@/lib/checkout/orders";
import { payfastReady, startPayment } from "@/lib/checkout/payfast";
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

/** Courier services to an address, for the cart as it stands: its worth, for the cover, and its box. */
export async function quoteDelivery(rawAddress: unknown, lines: { sku: string; quantity: number }[]): Promise<Quote> {
  const address = readAddress(rawAddress);
  if (!address || hasErrors(addressErrors(address)) || !Array.isArray(lines)) return { ok: false, reason: "no-service" };
  if (!quoteAllowed(callerIp(await headers()) ?? "unknown")) return { ok: false, reason: "unavailable" };
  const bySku = new Map((await getProducts()).flatMap((p) => p.variants.map((v) => [v.sku, { p, v }] as const)));
  const known = lines.slice(0, 100).flatMap((l) => {
    const found = bySku.get(String(l?.sku));
    return found && found.v.price !== null ? [{ ...found, quantity: clampQuantity(Number(l.quantity)) }] : [];
  });
  const value = cartSubtotal(known.map((k) => ({ price: k.v.price!, quantity: k.quantity })));
  return quote(cleanAddress(address), value, boxForOrder(known.map((k) => k.p.box)));
}

export type PlaceResult =
  | { ok: true; ref: string; token: string; checkout: Checkout }
  | { ok: false; error: string; field?: string; paid?: true };

/**
 * Prices and saves the order as pending, then starts the payment. When the
 * total differs from the one shown, nothing is saved: the customer sees the
 * new total first.
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

  const [priced, customer] = await Promise.all([priceOrder(input), currentCustomer()]);
  if (!priced.ok) return priced;
  if (priced.order.total !== input.shownTotal) {
    return { ok: false, error: "The total has changed since you started. Check the new total, then pay.", field: "total" };
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

  const started = await startAttempt(priced.order, uid, input.key);
  if (!started.ok && started.reason === "paid") return { ok: false, error: "This order has already been paid.", paid: true };
  if (!started.ok && started.reason === "too-many") return { ok: false, error: "This order has been tried too many times. Call the shop and we’ll sort it out." };
  if (!started.ok) return { ok: false, error: "This order number belongs to another order. Call the shop and we’ll sort it out." };

  const checkout = await startPayment(started.attempt, started.order.token, onsite);
  if (!checkout) return { ok: false, error: PAYMENT_OFF };
  return { ok: true, ref: started.order.ref, token: started.order.token, checkout };
}
