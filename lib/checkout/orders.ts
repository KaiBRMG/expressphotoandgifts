import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";

import { priceDeals } from "@/lib/catalog/campaigns";
import { buildNeeds, WORDS_MAX } from "@/lib/catalog/checkout";
import { rands } from "@/lib/catalog/listing";
import type { Availability } from "@/lib/catalog/stock";
import { clampQuantity } from "@/lib/catalog/purchase";
import { getProducts } from "@/lib/catalog/queries";
import { campaignsUsed, countUse } from "@/lib/campaigns";
import { dealsForOrder, readCode, redeemCode } from "@/lib/campaignCodes";
import { db } from "@/lib/firebase";
import { cleanAddress, cleanContact, cleanRecipient, addressErrors, contactErrors, hasErrors, LIMITS, recipientErrors } from "./details";
import { fullCover, packCart, quote } from "./courier";
import { amountMatches, pfAmount } from "./payfast";
import { liveAvailability, readStock, stockChanged, takeStock, unitsBySku } from "@/lib/stock";
import {
  ATTEMPT,
  awaitingNotice,
  latestAttempt,
  MAX_ATTEMPTS,
  MIN_PAYMENT,
  orderFolder,
  REF,
  refOfFile,
  type Attempt,
  type FulfilmentInput,
  type Issue,
  lineWhat,
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
  type Snapshot,
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
  | { ok: false; error: string; field?: "contact" | "address" | "recipient" | "delivery" | "photos" | "cart" | "stock" | "code"; limits?: Availability };

/**
 * Checks and prices an order (already read by `readOrderInput`): every line
 * still on sale, every place filled with a file from this order's own
 * folder or, for a reorder, a file placed on one of the signed-in `owner`'s
 * own paid orders (`reusableFiles`), the details complete, and for delivery, a service the courier
 * still offers. Campaigns are read fresh and priced by the same engine the
 * cart uses (`priceDeals`), so a deal that ended or filled since the cart
 * was drawn is gone here, and the customer sees the new total before paying.
 * A one-time code (`lib/campaignCodes.ts`) adds its campaign's deals; one that
 * can't be used is refused, and the order is left as it was. A code whose deal
 * saves nothing on this cart is left off the order, so it isn't used up.
 */
export async function priceOrder(input: OrderInput, owner: Promise<string | null> | null = null): Promise<Priced> {
  if (!REF.test(input.ref)) return { ok: false, error: "This order’s reference is missing. Go back to your photos and try again.", field: "cart" };
  if (hasErrors(contactErrors(input.contact))) return { ok: false, error: "Some of your details need another look.", field: "contact" };
  if (input.lines.length === 0) return { ok: false, error: "Your cart is empty.", field: "cart" };

  // The campaigns need only the code, so they load while everything else is checked.
  const dealsLoad = dealsForOrder(input.code, {});
  dealsLoad.catch(() => {}); // awaited below; an early return mustn't leave it unhandled
  const folder = orderFolder(input.ref);
  const outside = input.lines.flatMap((l) => l.sets.flatMap((s) => s.files.map((f) => f.publicId))).filter((id) => !id.startsWith(folder));
  // Only a reorder places files from outside its folder, so only it waits on who is signed in.
  const [products, reusable] = await Promise.all([getProducts(), outside.length ? owner?.then((uid) => reusableFiles(uid, outside)) ?? NONE : NONE]);
  const needs = buildNeeds(products);
  const bySku = new Map(products.flatMap((p) => p.variants.map((v) => [v.sku, { p, v }] as const)));

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
        l.sets.every((s) => s.files.length === photo.slots.length && s.files.every((f) => f.publicId.startsWith(folder) || reusable.has(f.publicId))));
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

  const items = lines.map((l) => ({ p: bySku.get(l.sku)!.p, sku: l.sku, quantity: l.quantity }));
  // Stock against the counts as they stand now, not the shop's cached copy; alongside the campaigns, read fresh too.
  const units = unitsBySku(lines);
  const [limits, { deals, code, error: codeError }] = await Promise.all([liveAvailability(Object.keys(units)), dealsLoad]);
  if (codeError) return { ok: false, error: codeError, field: "code" };
  const over = Object.keys(units).filter((sku) => sku in limits && units[sku] > limits[sku]);
  if (over.length) {
    const names = over.map((sku) => lines.find((l) => l.sku === sku)!.name);
    return {
      ok: false,
      error: `There isn’t enough ${names.join(" or ")} in stock for your order any more. Open your cart to choose what to do.`,
      field: "stock",
      limits: Object.fromEntries(over.map((sku) => [sku, limits[sku]])),
    };
  }

  // Every deal live now, in the order they stack; each line keeps the catalogue price a price deal took it from.
  const dealt = priceDeals(lines, deals);
  dealt.lines.forEach((d, i) => {
    lines[i] = { ...lines[i], price: d.price, ...(d.price < d.base ? { base: d.base } : {}), ...(d.net < d.price * d.quantity ? { paid: d.net } : {}) };
  });
  const coded = code !== null && dealt.savings.some((s) => s.campaign === code.campaign);
  // The courier's cover is for what the goods sold for.
  const priced = await priceFulfilment(input.fulfilment, dealt.total, items);
  if (!priced.ok) return priced;
  const total = dealt.total + priced.delivery;
  if (total < MIN_PAYMENT) return { ok: false, error: `Orders paid online start at ${rands(MIN_PAYMENT)}. Add something to your cart, or call the shop.`, field: "cart" };

  return {
    ok: true,
    order: {
      ref: input.ref,
      contact: cleanContact(input.contact),
      fulfilment: priced.fulfilment,
      lines,
      subtotal: dealt.subtotal,
      ...(dealt.discount > 0 ? { discount: dealt.discount } : {}),
      ...(dealt.savings.length ? { savings: dealt.savings } : {}),
      ...(coded ? { code: code.code } : {}),
      delivery: priced.delivery,
      total,
    },
  };
}

/**
 * Collection, free; or the courier service chosen, priced again for this
 * address, these goods and the parcels they pack into, insured to the full
 * value when the customer chose that.
 */
async function priceFulfilment(
  f: FulfilmentInput,
  subtotal: number,
  items: Parameters<typeof packCart>[0],
): Promise<{ ok: true; fulfilment: Order["fulfilment"]; delivery: number } | Extract<Priced, { ok: false }>> {
  if (f.method === "collect") return { ok: true, fulfilment: f, delivery: 0 };

  const address = cleanAddress(f.address);
  if (hasErrors(addressErrors(address))) return { ok: false, error: "The delivery address needs another look.", field: "address" };
  const recipient = f.recipient ? cleanRecipient(f.recipient) : null;
  if (recipient && hasErrors(recipientErrors(recipient))) return { ok: false, error: "The recipient’s details need another look.", field: "recipient" };

  const parcels = await packCart(items);
  const q = await quote(address, subtotal, parcels);
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

  const service: Service = { code: option.code, name: option.name, description: option.description, price: priced.price, cover: priced.cover, parcels };
  return { ok: true, fulfilment: { method: "courier", address, recipient, service }, delivery: priced.price };
}

/** What pricing an attempt sets on its order, so none of an earlier attempt's (its deals, say) outlives it. */
const PRICED = new Set<string>(["contact", "fulfilment", "lines", "subtotal", "discount", "savings", "code", "delivery", "total"] satisfies (keyof Snapshot)[]);

/** `token`: a paid order's receipt token, only for the browser that placed it, so it can be sent to its receipt. */
export type Started = { ok: true; order: Order; attempt: Attempt } | { ok: false; reason: "paid" | "reported"; token?: string } | { ok: false; reason: "taken" | "too-many" };

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
 * overwritten. Both keep `terms`: the policies the customer agreed to
 * (`POLICIES_VERSION`) and when, on the attempt's own clock.
 */
export async function startAttempt(priced: Extract<Priced, { ok: true }>["order"], uid: string | null, key: string, policies: string): Promise<Started> {
  const ref = orders().doc(priced.ref);
  const claim = createHash("sha256").update(key).digest("hex");
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const was = snap.exists ? (snap.data() as Order) : null;
    if (was?.status === "paid") return { ok: false, reason: "paid", ...(was.claim === claim ? { token: was.token } : {}) } as const;
    // PayFast's window said the last attempt was paid: wait for its notice (or the daily check) rather than take a second payment.
    if (was && awaitingNotice(was) && was.claim === claim) return { ok: false, reason: "reported", token: was.token } as const;
    if (was && was.claim !== claim) return { ok: false, reason: "taken" } as const;
    const n = (was?.attempts ?? 0) + 1;
    if (n > MAX_ATTEMPTS) return { ok: false, reason: "too-many" } as const;

    const now = new Date().toISOString();
    const terms = { version: policies, at: now };
    // What the order keeps from before (its token, notices, issues…); everything priced comes from this attempt alone.
    const kept = Object.fromEntries(Object.entries(was ?? {}).filter(([k]) => !PRICED.has(k))) as Partial<Order>;
    const order: Order = {
      ...kept,
      ...priced,
      token: was?.token ?? randomBytes(16).toString("hex"),
      status: "pending",
      uid: uid ?? was?.uid ?? null,
      claim,
      attempts: n,
      terms,
      createdAt: was?.createdAt ?? now,
      updatedAt: now,
    };
    const { contact, fulfilment, lines, subtotal, discount, savings, code, delivery, total } = priced;
    const deals = { ...(discount ? { discount } : {}), ...(savings ? { savings } : {}), ...(code ? { code } : {}) };
    const attempt: Attempt = { id: `${priced.ref}-${n}`, ref: priced.ref, contact, fulfilment, lines, subtotal, ...deals, delivery, total, createdAt: now, terms };
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

/**
 * The customer's browser saying PayFast's Onsite window reported the order's
 * latest attempt paid. Only for the holder of its receipt token, and only on
 * a pending order: it marks nothing paid, takes no stock and sends nothing,
 * and only stops `startAttempt` taking a second payment until the notice
 * comes (`awaitingNotice`). Keyed to the attempt, so a later one never
 * inherits it.
 */
export async function reportPaid(ref: string, token: unknown): Promise<void> {
  await changeOrder(ref, "The customer", (o) => {
    if (typeof token !== "string" || token.length !== 32 || o.token !== token) return { error: "Not this order’s." };
    if (o.status !== "pending" || !o.attempts) return { error: "Nothing to wait for." };
    const attempt = latestAttempt(o);
    if (o.reportedPaid?.attempt === attempt) return { error: "Already reported." };
    return { update: { reportedPaid: { attempt, at: new Date().toISOString() } }, log: `PayFast’s window told the customer attempt ${attempt} was paid. Waiting for PayFast’s notice; Pay isn’t offered again meanwhile.` };
  });
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

  let soldOutChanged = false;
  let used: string[] = [];
  const applied = await db().runTransaction(async (tx): Promise<Applied> => {
    soldOutChanged = false;
    used = [];
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

    // Read before any write, as a transaction must.
    const [shelf, code] = await Promise.all([readStock(tx, attempt.lines), attempt.code ? readCode(tx, attempt.code) : null]);
    record("paid");
    const { contact, fulfilment, lines, subtotal, delivery, total } = attempt;
    // The order takes on exactly what was paid for, deals included; an attempt from before campaigns had none.
    const deals = { discount: attempt.discount ?? FieldValue.delete(), savings: attempt.savings ?? FieldValue.delete(), code: attempt.code ?? FieldValue.delete() };
    const payment: Payment = { provider: "payfast", ...n, at: now };
    const took = takeStock(tx, shelf, lines, order.ref, now);
    const { stock } = took;
    soldOutChanged = took.soldOutChanged;
    used = countUse(tx, attempt.savings, subtotal - (attempt.discount ?? 0));
    // The code is used up with the payment: a payment that failed or was never made leaves it as it was.
    const codeIssue = code ? redeemCode(tx, code, attempt.code!, order.ref, now) : null;
    const update = { contact, fulfilment, lines, subtotal, delivery, total, status: "paid", stage: "new", payment, paidAt: now, updatedAt: now, ...(Object.keys(stock.taken).length ? { stock } : {}) } satisfies Partial<Order>;
    const log = acceptedBy ? { log: FieldValue.arrayUnion({ at: now, by: acceptedBy, text: `Marked paid from PayFast’s record of payment ${n.pfPaymentId} (R${n.amountGross}); its notice never arrived` } satisfies LogEntry) } : {};
    // Two customers paid for the last one at once, or for the same code: the money is taken, so the shop decides (make more, or refund).
    const problems: Issue[] = [
      ...(stock.oversold.length
        ? [{ at: now, text: `Oversold: ${stock.oversold.map((sku) => lineWhat(lines.find((l) => l.sku === sku)!)).join(", ")}. Stock ran out before this payment came in. Make more, or tell the customer and cancel it, or refund that item, from the Payment tab.` }]
        : []),
      ...(codeIssue ? [{ at: now, text: codeIssue }] : []),
    ];
    const flagged = problems.length ? { flagged: true, issues: FieldValue.arrayUnion(...problems) } : {};
    tx.update(ref, { ...update, ...deals, ...log, ...flagged });
    const { discount, savings, code: coupon } = attempt;
    return { outcome: "paid", order: { ...order, ...update, discount, savings, code: coupon } };
  });
  if (applied.outcome === "paid" && applied.order.stock) stockChanged(soldOutChanged);
  if (applied.outcome === "paid") campaignsUsed(used);
  return applied;
}

const NONE: ReadonlySet<string> = new Set();

/**
 * Which of `publicIds` an order may place from outside its own folder: those
 * placed on a paid order on the same account, at the version placed. What
 * lets Order again (`lib/account/orders.ts`) send the old photos, and nobody
 * else's.
 */
export async function reusableFiles(uid: string | null, publicIds: string[]): Promise<ReadonlySet<string>> {
  const refs = [...new Set(publicIds.map(refOfFile).filter((r) => REF.test(r)))];
  if (!uid || refs.length === 0) return NONE;
  const ok = new Set<string>();
  for (const s of await db().getAll(...refs.map((r) => orders().doc(r)))) {
    const o = s.data() as Order | undefined;
    if (o?.uid !== uid || o.status !== "paid") continue;
    for (const l of o.lines) for (const set of l.sets) for (const f of set.files) ok.add(f.publicId);
  }
  return ok;
}

export async function attachCustomer(ref: string, uid: string): Promise<void> {
  await orders().doc(ref).update({ uid, updatedAt: new Date().toISOString() });
}
