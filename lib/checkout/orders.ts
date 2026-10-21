import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";

import { cartSubtotal } from "@/lib/catalog/cart";
import { buildNeeds, WORDS_MAX } from "@/lib/catalog/checkout";
import { rands } from "@/lib/catalog/listing";
import { clampQuantity } from "@/lib/catalog/purchase";
import { getProducts } from "@/lib/catalog/queries";
import { db } from "@/lib/firebase";
import { boxForOrder, type BoxId } from "./boxes";
import { cleanAddress, cleanContact, cleanRecipient, addressErrors, contactErrors, hasErrors, LIMITS, recipientErrors } from "./details";
import { fullCover, quote } from "./courier";
import { amountMatches, pfAmount } from "./payfast";
import {
  ATTEMPT,
  MAX_ATTEMPTS,
  MIN_PAYMENT,
  REF,
  type Attempt,
  type FulfilmentInput,
  type Issue,
  type LogEntry,
  type Notice,
  type NoticeOutcome,
  type NoticeRecord,
  type Order,
  type OrderActionResult,
  type OrderInput,
  type OrderLine,
  type Payment,
  type Service,
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
  | { ok: false; error: string; field?: "contact" | "address" | "recipient" | "delivery" | "photos" | "cart" };

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
  const box = boxForOrder(lines.map((l) => bySku.get(l.sku)?.p.box));
  const priced = await priceFulfilment(input.fulfilment, subtotal, box);
  if (!priced.ok) return priced;
  const total = subtotal + priced.delivery;
  if (total < MIN_PAYMENT) return { ok: false, error: `Orders paid online start at ${rands(MIN_PAYMENT)}. Add something to your cart, or call the shop.`, field: "cart" };

  return { ok: true, order: { ref: input.ref, contact: cleanContact(input.contact), fulfilment: priced.fulfilment, lines, subtotal, delivery: priced.delivery, total } };
}

/**
 * Collection, free; or the courier service chosen, priced again for this
 * address, these goods and their box, insured to the full value when the
 * customer chose that.
 */
async function priceFulfilment(
  f: FulfilmentInput,
  subtotal: number,
  box: BoxId,
): Promise<{ ok: true; fulfilment: Order["fulfilment"]; delivery: number } | Extract<Priced, { ok: false }>> {
  if (f.method === "collect") return { ok: true, fulfilment: f, delivery: 0 };

  const address = cleanAddress(f.address);
  if (hasErrors(addressErrors(address))) return { ok: false, error: "The delivery address needs another look.", field: "address" };
  const recipient = f.recipient ? cleanRecipient(f.recipient) : null;
  if (recipient && hasErrors(recipientErrors(recipient))) return { ok: false, error: "The recipient’s details need another look.", field: "recipient" };

  const q = await quote(address, subtotal, box);
  if (!q.ok) {
    return {
      ok: false,
      error: q.reason === "no-service" ? "The courier can’t deliver to this address. Check it, or collect from the shop." : "We couldn’t get a delivery price just now. Try again, or collect from the shop.",
      field: "delivery",
    };
  }
  const option = q.options.find((o) => o.code === f.service);
  if (!option) return { ok: false, error: "That delivery option isn’t offered any more. Choose another.", field: "delivery" };
  // Asked to insure the full value: its price, unless the full value is already covered at no extra cost.
  const priced = f.insure ? option.full ?? (option.cover >= fullCover(subtotal) ? option : null) : option;
  if (!priced) return { ok: false, error: "Insuring the full value isn’t offered for this delivery any more. Check the price, then pay.", field: "delivery" };

  const service: Service = { code: option.code, name: option.name, description: option.description, price: priced.price, cover: priced.cover, box };
  return { ok: true, fulfilment: { method: "courier", address, recipient, service }, delivery: priced.price };
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

/** A change to an order: what to write, the log line (in the name of whoever made it), and anything to flag for the shop. */
export type Change = { update: Record<string, unknown>; log?: string; issue?: string };

/**
 * Changes an order in a transaction: `fn` reads it and returns the change,
 * or an error. Only ever for an order that exists. Every change of the shop's
 * own side of an order (the admin's, and what the courier reports) goes
 * through here, so each is logged and flagged the same way.
 */
export async function changeOrder(ref: string, by: string, fn: (o: Order) => Change | { error: string }): Promise<OrderActionResult> {
  if (!REF.test(ref)) return { error: "There’s no such order." };
  const doc = orders().doc(ref);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(doc);
    if (!snap.exists) return { error: "There’s no such order." };
    const made = fn(snap.data() as Order);
    if ("error" in made) return made;
    const at = new Date().toISOString();
    tx.update(doc, {
      ...made.update,
      updatedAt: at,
      ...(made.log ? { log: FieldValue.arrayUnion({ at, by, text: made.log } satisfies LogEntry) } : {}),
      ...(made.issue ? { flagged: true, issues: FieldValue.arrayUnion({ at, text: made.issue } satisfies Issue) } : {}),
    });
    return { ok: true } as const;
  });
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
/**
 * In a transaction: records a notice under `recordRef` and flags its order
 * with `text`, for the shop to look at. The one way a payment problem reaches
 * an order, from a notice or from the daily check against PayFast's history.
 */
export function recordAndFlag(tx: Transaction, order: DocumentReference, recordRef: DocumentReference, record: NoticeRecord, text: string) {
  tx.create(recordRef, record);
  tx.update(order, { flagged: true, issues: FieldValue.arrayUnion({ at: record.at, text } satisfies Issue), updatedAt: record.at });
}

/** Records a payment problem the daily check found on its order, once: a record already there means it was flagged before, and nothing is written. */
export async function flagOnce(ref: string, recordId: string, record: NoticeRecord, text: string): Promise<void> {
  const order = orders().doc(ref);
  const recordRef = order.collection("notices").doc(recordId);
  await db().runTransaction(async (tx) => {
    const [snap, recorded] = await Promise.all([tx.get(order), tx.get(recordRef)]);
    if (snap.exists && !recorded.exists) recordAndFlag(tx, order, recordRef, record, text);
  });
}

/**
 * `refused`: the check a signed notice failed. `acceptedBy`: the member of
 * staff who accepted a payment from PayFast's history, logged in the same
 * write that marks the order paid.
 */
export async function applyNotice(n: Notice, opts: { refused?: string; acceptedBy?: string } = {}): Promise<Applied> {
  const { refused, acceptedBy } = opts;
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
      recordAndFlag(tx, ref, recordRef, { ...n, at: now, outcome, ...(refused ? { reason: refused } : {}) }, text);
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
    const log = acceptedBy ? { log: FieldValue.arrayUnion({ at: now, by: acceptedBy, text: `Marked paid from PayFast’s record of payment ${n.pfPaymentId} (R${n.amountGross}); its notice never arrived` } satisfies LogEntry) } : {};
    tx.update(ref, { ...update, ...log });
    return { outcome: "paid", order: { ...order, ...update } };
  });
}

export async function attachCustomer(ref: string, uid: string): Promise<void> {
  await orders().doc(ref).update({ uid, updatedAt: new Date().toISOString() });
}
