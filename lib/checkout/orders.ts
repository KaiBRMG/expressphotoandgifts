import "server-only";

import { randomBytes } from "node:crypto";

import { detailsFrom, saveDetails } from "@/lib/account/auth";
import { cartSubtotal } from "@/lib/catalog/cart";
import { buildNeeds, WORDS_MAX } from "@/lib/catalog/checkout";
import { orderWhat, clampQuantity } from "@/lib/catalog/purchase";
import { getProducts } from "@/lib/catalog/queries";
import { db } from "@/lib/firebase";
import { cleanAddress, cleanContact, addressErrors, contactErrors, hasErrors } from "./details";
import { quote } from "./courier";
import { pfAmount } from "./payfast";
import { REF, type Order, type OrderInput, type OrderLine } from "./order";

/**
 * Orders in Firestore (`orders/{ref}`), written only here. An order is
 * priced from the catalogue as it stands, never from what the browser says,
 * and its courier rate is quoted again at the moment it is placed.
 */

const orders = () => db().collection("orders");

export type Priced =
  | { ok: true; order: Omit<Order, "token" | "createdAt" | "updatedAt" | "uid" | "status"> }
  | { ok: false; error: string; field?: "contact" | "address" | "delivery" | "photos" | "cart" };

/**
 * Checks and prices an order (already read by `readOrderInput`): every line
 * still on sale, every place filled with a file from this order's own
 * folder, the details complete, and for delivery, a service the courier
 * still offers.
 */
export async function priceOrder(input: OrderInput): Promise<Priced> {
  if (!REF.test(input.ref)) return { ok: false, error: "This order’s reference is missing. Go back to your photos and try again.", field: "cart" };
  if (hasErrors(contactErrors(input.contact))) return { ok: false, error: "Some of your details need another look.", field: "contact" };
  if (input.lines.length === 0) return { ok: false, error: "Your cart is empty.", field: "cart" };

  const products = await getProducts();
  const needs = buildNeeds(products);
  const bySku = new Map(products.flatMap((p) => p.variants.map((v) => [v.sku, { p, v }] as const)));
  const folder = `orders/${input.ref}/`;

  const lines: OrderLine[] = [];
  for (const l of input.lines) {
    const found = bySku.get(l.sku);
    if (!found || found.v.price === null) {
      return { ok: false, error: "Something in your cart is no longer on sale. Open your cart to see what changed.", field: "cart" };
    }
    const quantity = clampQuantity(l.quantity);
    const photo = needs[l.sku]?.photo;
    const complete =
      !photo ||
      (l.sets.length === (l.sets.length > 1 ? quantity : 1) &&
        l.sets.every((s) => s.files.length === photo.slots.length && s.files.every((f) => f.publicId.startsWith(folder))));
    if (!complete) return { ok: false, error: `${found.p.name} still needs its photos. Go back to your photos to finish it.`, field: "photos" };

    lines.push({
      sku: l.sku,
      slug: found.p.slug,
      name: found.p.name,
      variant: found.p.options.length > 0 ? found.v.title : null,
      price: found.v.price,
      quantity,
      sets: photo
        ? l.sets.map((s) => ({
            words: photo.text ? s.words.trim().slice(0, WORDS_MAX) : "",
            files: s.files.map((f, slot) => ({ ...f, slot, label: photo.slots[slot].label })),
          }))
        : [],
      ...(needs[l.sku]?.frame && l.frame ? { frame: l.frame } : {}),
    });
  }

  const subtotal = cartSubtotal(lines);
  const contact = cleanContact(input.contact);
  const f = input.fulfilment;

  if (f.method === "collect") {
    return { ok: true, order: { ref: input.ref, contact, fulfilment: f, lines, subtotal, delivery: 0, total: subtotal } };
  }

  const address = cleanAddress(f.address);
  if (hasErrors(addressErrors(address))) return { ok: false, error: "The delivery address needs another look.", field: "address" };
  const q = await quote(address, subtotal);
  if (!q.ok) {
    return {
      ok: false,
      error: q.reason === "no-service" ? "The courier can’t deliver to this address. Check it, or collect from the shop." : "We couldn’t get a delivery price just now. Try again, or collect from the shop.",
      field: "delivery",
    };
  }
  const service = q.options.find((o) => o.code === f.service);
  if (!service) return { ok: false, error: "That delivery option isn’t offered any more. Choose another.", field: "delivery" };

  return {
    ok: true,
    order: { ref: input.ref, contact, fulfilment: { method: "courier", address, service }, lines, subtotal, delivery: service.price, total: subtotal + service.price },
  };
}

export type Saved = { ok: true; order: Order } | { ok: false };

/**
 * Writes the order as pending, replacing an earlier unpaid attempt under the
 * same ref (the customer came back from PayFast and changed something). An
 * order already paid is never overwritten.
 */
export async function savePending(priced: Extract<Priced, { ok: true }>["order"], uid: string | null): Promise<Saved> {
  const ref = orders().doc(priced.ref);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const was = snap.exists ? (snap.data() as Order) : null;
    if (was?.status === "paid") return { ok: false } as const;
    const now = new Date().toISOString();
    const order: Order = {
      ...priced,
      token: was?.token ?? randomBytes(16).toString("hex"),
      status: "pending",
      uid: uid ?? was?.uid ?? null,
      createdAt: was?.createdAt ?? now,
      updatedAt: now,
    };
    tx.set(ref, order);
    return { ok: true, order } as const;
  });
}

export async function getOrder(ref: string): Promise<Order | null> {
  if (!REF.test(ref)) return null;
  const snap = await orders().doc(ref).get();
  return snap.exists ? (snap.data() as Order) : null;
}

/** The order, only for someone holding its receipt link. */
export async function orderForReceipt(ref: string, token: string): Promise<Order | null> {
  const order = await getOrder(ref);
  return order && token.length === 32 && order.token === token ? order : null;
}

export type NoticeOutcome = "paid" | "already" | "unknown" | "mismatch" | "not-complete";

/**
 * Applies a checked PayFast notice. Idempotent: PayFast resends a notice
 * until it hears back, and a second one for a paid order changes nothing.
 * An amount that does not match is never marked paid; the order is flagged
 * for the shop instead. A paid order placed while signed in keeps its
 * details on the customer's account.
 */
export async function applyNotice(
  n: { ref: string; pfPaymentId: string; status: string; amountGross: string },
  amountMatches: (o: Order, gross: string) => boolean,
): Promise<NoticeOutcome> {
  if (!REF.test(n.ref)) return "unknown";
  const ref = orders().doc(n.ref);
  let paid: Order | null = null;
  const outcome = await db().runTransaction(async (tx): Promise<NoticeOutcome> => {
    const snap = await tx.get(ref);
    if (!snap.exists) return "unknown";
    const order = snap.data() as Order;
    if (order.status === "paid") return "already";
    const now = new Date().toISOString();
    const payment = { provider: "payfast" as const, pfPaymentId: n.pfPaymentId, amountGross: n.amountGross, status: n.status, at: now };
    if (!amountMatches(order, n.amountGross)) {
      tx.update(ref, { review: `PayFast reported ${n.amountGross}, the order is ${pfAmount(order.total)}`, payment, updatedAt: now });
      return "mismatch";
    }
    if (n.status !== "COMPLETE") {
      tx.update(ref, { payment, updatedAt: now });
      return "not-complete";
    }
    tx.update(ref, { status: "paid", payment, updatedAt: now });
    paid = order;
    return "paid";
  });
  const done = paid as Order | null;
  if (done?.uid) await saveDetails(done.uid, detailsFrom(done)).catch((e) => console.error("Details not saved", e));
  return outcome;
}

/** Flags an order whose notice failed a check, for the shop to look at. */
export async function flagOrder(ref: string, reason: string): Promise<void> {
  if (!REF.test(ref)) return;
  await orders()
    .doc(ref)
    .update({ review: reason, updatedAt: new Date().toISOString() })
    .catch(() => {});
}

export async function attachCustomer(ref: string, uid: string): Promise<void> {
  await orders().doc(ref).update({ uid, updatedAt: new Date().toISOString() });
}

/** "2 × Coffee Mug (1 photo)": a line as the receipt names it. */
export const lineWhat = (l: Pick<OrderLine, "name" | "variant" | "quantity">) => `${l.quantity} × ${orderWhat(l.name, l.variant)}`;

/** How many photos the shop has for a line. */
export const fileCount = (l: Pick<OrderLine, "sets">) => l.sets.reduce((n, s) => n + s.files.length, 0);
