"use server";

import { currentCustomer } from "@/lib/account/auth";
import { cartSubtotal } from "@/lib/catalog/cart";
import { clampQuantity } from "@/lib/catalog/purchase";
import { getPriceList } from "@/lib/catalog/queries";
import { quote } from "@/lib/checkout/courier";
import { addressErrors, cleanAddress, hasErrors, readAddress } from "@/lib/checkout/details";
import { readOrderInput, type Checkout, type Quote } from "@/lib/checkout/order";
import { priceOrder, savePending } from "@/lib/checkout/orders";
import { payfastReady, startPayment } from "@/lib/checkout/payfast";

/**
 * The details step's two calls to the server. Each is a public endpoint and
 * trusts nothing it is sent: the quote prices the cart from the catalogue,
 * and placing the order prices everything again.
 */

const PAYMENT_OFF = "Online payment isn’t switched on yet. Please call the shop to place this order.";

/** Courier services to an address, for the cart as it stands. */
export async function quoteDelivery(rawAddress: unknown, lines: { sku: string; quantity: number }[]): Promise<Quote> {
  const address = readAddress(rawAddress);
  if (!address || hasErrors(addressErrors(address)) || !Array.isArray(lines)) return { ok: false, reason: "no-service" };
  const prices = await getPriceList();
  // The order's worth, for the courier's cover.
  const value = cartSubtotal(lines.slice(0, 100).map((l) => ({ price: prices[String(l.sku)] ?? 0, quantity: clampQuantity(Number(l.quantity)) })));
  return quote(cleanAddress(address), value);
}

export type PlaceResult =
  | { ok: true; ref: string; token: string; checkout: Checkout }
  | { ok: false; error: string; field?: string; paid?: true };

/**
 * Prices and saves the order as pending, then starts the payment. When the
 * total differs from the one shown, nothing is saved: the customer sees the
 * new total first.
 */
export async function placeOrder(raw: unknown, onsite: boolean): Promise<PlaceResult> {
  if (!payfastReady()) return { ok: false, error: PAYMENT_OFF };
  const input = readOrderInput(raw);
  if (!input) return { ok: false, error: "Something went wrong reading your order. Reload the page and try again." };

  const [priced, customer] = await Promise.all([priceOrder(input), currentCustomer()]);
  if (!priced.ok) return priced;
  if (priced.order.total !== input.shownTotal) {
    return { ok: false, error: "The total has changed since you started. Check the new total, then pay.", field: "total" };
  }

  const saved = await savePending(priced.order, customer?.uid ?? null);
  if (!saved.ok) return { ok: false, error: "This order has already been paid.", paid: true };

  const checkout = await startPayment(saved.order, onsite);
  if (!checkout) return { ok: false, error: PAYMENT_OFF };
  return { ok: true, ref: saved.order.ref, token: saved.order.token, checkout };
}
