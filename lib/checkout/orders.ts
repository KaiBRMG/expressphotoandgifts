import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { cartSubtotal } from "@/lib/catalog/cart";
import { buildNeeds, WORDS_MAX } from "@/lib/catalog/checkout";
import { rands } from "@/lib/catalog/listing";
import { clampQuantity } from "@/lib/catalog/purchase";
import { getProducts } from "@/lib/catalog/queries";
import { db } from "@/lib/firebase";
import { cleanAddress, cleanContact, addressErrors, contactErrors, hasErrors, LIMITS } from "./details";
import { quote } from "./courier";
import { amountMatches, pfAmount } from "./payfast";
import {
  ATTEMPT,
  MAX_ATTEMPTS,
  MIN_PAYMENT,
  REF,
  type Attempt,
  type Issue,
  type Notice,
  type NoticeOutcome,
  type NoticeRecord,
  type Order,
  type OrderInput,
  type OrderLine,
  type Payment,
} from "./order";

/**
 * Orders in Firestore (`orders/{ref}`), written only here. An order is
 * priced from the catalogue as it stands, never from what the browser says,
 * and its courier rate is quoted again at the moment it is placed.
 */

/** The orders collection, for the admin and the photo sweep as well. */
export const orders = () => db().collection("orders");

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
    const note = l.note.trim().slice(0, LIMITS.lineNote);

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
      ...(note ? { note } : {}),
    });
  }

  const subtotal = cartSubtotal(lines);
  const priced = await priceFulfilment(input.fulfilment, subtotal);
  if (!priced.ok) return priced;
  const total = subtotal + priced.delivery;
  if (total < MIN_PAYMENT) return { ok: false, error: `Orders paid online start at ${rands(MIN_PAYMENT)}. Add something to your cart, or call the shop.`, field: "cart" };

  return { ok: true, order: { ref: input.ref, contact: cleanContact(input.contact), fulfilment: priced.fulfilment, lines, subtotal, delivery: priced.delivery, total } };
}

/** Collection, free; or the courier service chosen, priced again for this address and these goods. */
async function priceFulfilment(
  f: OrderInput["fulfilment"],
  subtotal: number,
): Promise<{ ok: true; fulfilment: Order["fulfilment"]; delivery: number } | Extract<Priced, { ok: false }>> {
  if (f.method === "collect") return { ok: true, fulfilment: f, delivery: 0 };

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
  return { ok: true, fulfilment: { method: "courier", address, service }, delivery: service.price };
}

export type Started = { ok: true; order: Order; attempt: Attempt } | { ok: false; reason: "paid" | "taken" | "too-many" };

/**
 * Saves the order as pending and freezes it as a new payment attempt, in one
 * transaction. The order keeps what the customer last chose (they may come
 * back from PayFast and change something); the attempt keeps exactly what
 * this payment is for, and is what its notice will mark paid. Anything else
 * already on the order (notices, issues) is kept.
 *
 * The first save claims the ref for the browser's key, and only that key can
 * save it after, so knowing a ref (it is on receipts and PayFast's email) is
 * not enough to rewrite someone's unpaid order. A paid order is never
 * overwritten.
 */
export async function startAttempt(priced: Extract<Priced, { ok: true }>["order"], uid: string | null, key: string): Promise<Started> {
  const ref = orders().doc(priced.ref);
  const claim = createHash("sha256").update(key).digest("hex");
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const was = snap.exists ? (snap.data() as Order) : null;
    if (was?.status === "paid") return { ok: false, reason: "paid" } as const;
    if (was && was.claim !== claim) return { ok: false, reason: "taken" } as const;
    const n = (was?.attempts ?? 0) + 1;
    if (n > MAX_ATTEMPTS) return { ok: false, reason: "too-many" } as const;

    const now = new Date().toISOString();
    const order: Order = {
      ...was,
      ...priced,
      token: was?.token ?? randomBytes(16).toString("hex"),
      status: "pending",
      uid: uid ?? was?.uid ?? null,
      claim,
      attempts: n,
      createdAt: was?.createdAt ?? now,
      updatedAt: now,
    };
    const { contact, fulfilment, lines, subtotal, delivery, total } = priced;
    const attempt: Attempt = { id: `${priced.ref}-${n}`, ref: priced.ref, contact, fulfilment, lines, subtotal, delivery, total, createdAt: now };
    tx.set(ref, order);
    tx.create(ref.collection("attempts").doc(attempt.id), attempt);
    return { ok: true, order, attempt } as const;
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

/** A notice for an order that isn't there (its attempt ID names no order), or one already recorded. */
export type Applied = { outcome: NoticeOutcome; order: Order } | { outcome: "already" | "no-order" };

/**
 * Applies a PayFast notice in one transaction, and keeps a record of it on
 * the order whatever comes of it. Idempotent: PayFast resends a notice until
 * it hears back, and one already recorded changes nothing.
 *
 * A COMPLETE payment whose amount matches its attempt marks the order paid,
 * as that attempt froze it. These flag the order for the shop and are never
 * marked paid: a notice `refused` by a check other than its signature (PayFast
 * sent it, so a customer may have paid; a notice without a good signature is
 * never written anywhere, since anyone can post one), an attempt the order
 * never made, an amount that doesn't match its attempt, and a second payment
 * for an order already paid, which is money taken twice.
 */
export async function applyNotice(n: Notice, refused?: string): Promise<Applied> {
  const m = ATTEMPT.exec(n.attempt);
  if (!m) return { outcome: "no-order" };
  const ref = orders().doc(m[1]);
  const attemptRef = ref.collection("attempts").doc(n.attempt);
  // One record per PayFast payment and status, so a resent notice finds its own; a refused one apart, so it never blocks the same payment passing later.
  const recordRef = ref.collection("notices").doc(`${refused ? "refused-" : ""}${n.pfPaymentId || "none"}-${n.status || "none"}`.replace(/\//g, "_"));

  return db().runTransaction(async (tx): Promise<Applied> => {
    const [snap, attemptSnap, recorded] = await Promise.all([tx.get(ref), tx.get(attemptRef), tx.get(recordRef)]);
    if (!snap.exists) return { outcome: "no-order" };
    if (recorded.exists) return { outcome: "already" };
    const order = snap.data() as Order;
    const attempt = attemptSnap.exists ? (attemptSnap.data() as Attempt) : null;
    const now = new Date().toISOString();
    const record = (outcome: NoticeOutcome) => tx.create(recordRef, { ...n, at: now, outcome, ...(refused ? { reason: refused } : {}) } satisfies NoticeRecord);
    const flag = (outcome: NoticeOutcome, text: string): Applied => {
      record(outcome);
      tx.update(ref, { flagged: true, issues: FieldValue.arrayUnion({ at: now, text } satisfies Issue), updatedAt: now });
      return { outcome, order };
    };
    const paid = `PayFast payment ${n.pfPaymentId} (${n.status}, R${n.amountGross})`;

    if (refused) return flag("refused", `A notice for ${paid} was refused: ${refused}. Check it in PayFast before doing anything.`);
    if (!attempt) return flag("unknown-attempt", `${paid} names an attempt this order never made (${n.attempt}). Check it in PayFast.`);
    if (!amountMatches(attempt.total, n.amountGross)) return flag("mismatch", `${paid} doesn’t match its attempt’s total of R${pfAmount(attempt.total)}. It was not marked paid.`);
    if (n.status !== "COMPLETE") {
      record("not-complete");
      return { outcome: "not-complete", order };
    }
    if (order.status === "paid") return flag("duplicate", `${paid} came in after the order was already paid by ${order.payment?.pfPaymentId}. The customer paid twice: refund one.`);

    record("paid");
    const { contact, fulfilment, lines, subtotal, delivery, total } = attempt;
    const payment: Payment = { provider: "payfast", ...n, at: now };
    const update = { contact, fulfilment, lines, subtotal, delivery, total, status: "paid", stage: "new", payment, paidAt: now, updatedAt: now } satisfies Partial<Order>;
    tx.update(ref, update);
    return { outcome: "paid", order: { ...order, ...update } };
  });
}

export async function attachCustomer(ref: string, uid: string): Promise<void> {
  await orders().doc(ref).update({ uid, updatedAt: new Date().toISOString() });
}
