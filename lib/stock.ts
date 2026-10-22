import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { FieldValue, type DocumentReference, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";

import { REF, type Order, type OrderLine } from "@/lib/checkout/order";
import { itemCount } from "@/lib/catalog/listing";
import { siteUrl } from "@/lib/checkout/site";
import { orderWhat } from "@/lib/catalog/purchase";
import { campaignsFor, type LiveCampaign } from "@/lib/catalog/campaigns";
import { isSoldOut, sellable, type Availability, type LowItem, type StockLevel, type StockMove, type Taken } from "@/lib/catalog/stock";
import { escapeHtml as esc, sendEmail } from "@/lib/email";
import { button, C, heading, para, shell } from "@/lib/emailLayout";
import { db } from "@/lib/firebase";
import { orderRecipients } from "@/lib/settings";
import { SHOP_TZ } from "@/lib/shopTime";

/**
 * Stock in Firestore (`stock/{sku}`), the rules in `lib/catalog/stock.ts`.
 * Two caches, so a sale doesn't re-render the shop: the counts (STOCK_TAG),
 * read only by `/api/stock` for the cart and product page's limits, and
 * which SKUs are sold out (SOLD_OUT_TAG), read by every page that says
 * Sold out, and cleared only when a SKU goes in or out of it. An order is
 * checked against the counts as they stand when Pay is pressed, and paying
 * takes its units off in the transaction that marks it paid (`applyNotice`).
 */

export const STOCK_TAG = "stock";
export const SOLD_OUT_TAG = "stock-sold-out";

/** A stock document: the level, whether the shop has been warned it is low since it last rose above Low, and who changed it last. */
export type StockDoc = StockLevel & { lowSent?: boolean; updatedAt?: string; updatedBy?: string };

export const stockDocs = () => db().collection("stock");

export const levelOf = (snap: DocumentSnapshot): StockDoc | undefined => (snap.exists ? (snap.data() as StockDoc) : undefined);

const tracked = async () => (await stockDocs().where("tracked", "==", true).get()).docs.map((d) => [d.id, d.data() as StockDoc] as const);

/** How many of each tracked SKU can be sold now, for `/api/stock`. Cleared by every change of a count. */
export const getAvailability = unstable_cache(
  async (): Promise<Availability> => Object.fromEntries((await tracked()).map(([sku, s]) => [sku, sellable(s)])),
  ["stock-availability"],
  { tags: [STOCK_TAG], revalidate: 3600 },
);

/** The SKUs sold out now, each at 0, for the pages that say so. Cleared only when one goes in or out of it. */
export const getSoldOut = unstable_cache(
  async (): Promise<Availability> => Object.fromEntries((await tracked()).filter(([, s]) => isSoldOut(s)).map(([sku]) => [sku, 0])),
  ["stock-sold-out"],
  { tags: [SOLD_OUT_TAG], revalidate: 3600 },
);

/** Clears the caches after counts changed: the counts always, the pages only when something sold out or came back. */
export function stockChanged(soldOutChanged: boolean) {
  revalidateTag(STOCK_TAG, { expire: 0 });
  if (soldOutChanged) revalidateTag(SOLD_OUT_TAG, { expire: 0 });
}

/** The counts as they stand, uncached, for the SKUs an order is about to pay for. */
export async function liveAvailability(skus: string[]): Promise<Availability> {
  if (skus.length === 0) return {};
  const snaps = await db().getAll(...skus.map((s) => stockDocs().doc(s)));
  return Object.fromEntries(
    snaps.flatMap((s) => {
      const level = levelOf(s);
      return level?.tracked ? [[s.id, sellable(level)]] : [];
    }),
  );
}

/** Units of each SKU in a set of lines. */
export function unitsBySku(lines: Pick<OrderLine, "sku" | "quantity">[]): Record<string, number> {
  const units: Record<string, number> = {};
  for (const l of lines) units[l.sku] = (units[l.sku] ?? 0) + l.quantity;
  return units;
}

/** Reads, in a transaction, the stock of each SKU in the lines. Transactions read before they write, so this comes first. */
export async function readStock(tx: Transaction, lines: Pick<OrderLine, "sku">[]) {
  const refs = [...new Set(lines.map((l) => l.sku))].map((s) => stockDocs().doc(s));
  const snaps = refs.length ? await tx.getAll(...refs) : [];
  return new Map(snaps.map((s) => [s.id, { ref: s.ref, level: levelOf(s) }]));
}

/**
 * Writes a SKU's new level and its line of history, in a transaction: the one
 * way a count changes. The low-stock warning stays sent while it is still
 * low (or is sent now, `warned`), and resets once it rises above Low. Says
 * whether it went in or out of sold out, which clears the shop's pages.
 */
export function writeLevel(tx: Transaction, ref: DocumentReference, was: StockDoc | undefined, level: StockLevel, move: StockMove, warned = false): { soldOutChanged: boolean } {
  const lowSent = level.onHand <= level.lowAt && (warned || (was?.lowSent ?? false));
  tx.set(ref, { ...level, lowSent, updatedAt: move.at, updatedBy: move.by } satisfies StockDoc);
  tx.create(ref.collection("moves").doc(), move);
  return { soldOutChanged: isSoldOut(was) !== isSoldOut(level) };
}

/**
 * In the transaction that marks an order paid: takes each tracked line's units
 * off, records the sale, and notes what went low (once, until restocked) and
 * what was sold beyond what was there, which the caller flags.
 */
export function takeStock(tx: Transaction, read: Awaited<ReturnType<typeof readStock>>, lines: OrderLine[], ref: string, at: string) {
  const stock: Taken = { taken: {}, low: [], oversold: [] };
  let soldOutChanged = false;
  for (const [sku, n] of Object.entries(unitsBySku(lines))) {
    const found = read.get(sku);
    const was = found?.level;
    if (!found || !was?.tracked) continue;
    const onHand = was.onHand - n;
    const warned = onHand <= was.lowAt && !was.lowSent;
    if (n > sellable(was)) stock.oversold.push(sku);
    if (warned) {
      const line = lines.find((l) => l.sku === sku)!;
      stock.low.push({ sku, what: orderWhat(line.name, line.variant), onHand, soldOutAt: was.soldOutAt });
    }
    stock.taken[sku] = n;
    const wrote = writeLevel(tx, found.ref, was, { ...was, onHand }, { at, by: "shop", kind: "order", change: -n, onHand, ref }, warned);
    soldOutChanged ||= wrote.soldOutChanged;
  }
  return { stock, soldOutChanged };
}

/**
 * Puts what a paid order took back on the shelf, once: for an order refunded
 * or cancelled whose goods were never made or came back unused, whether the
 * refund went through PayFast or outside it.
 */
export async function returnStock(ref: string, by: string): Promise<{ returned: number } | { error: string }> {
  if (!REF.test(ref)) return { error: "There’s no such order." };
  const orderRef = db().collection("orders").doc(ref);
  let soldOutChanged = false;
  const result = await db().runTransaction(async (tx): Promise<{ returned: number } | { error: string }> => {
    soldOutChanged = false;
    const order = (await tx.get(orderRef)).data() as Order | undefined;
    if (!order) return { error: "There’s no such order." };
    if (order.stock?.returned) return { error: "This order’s items are already back in stock." };
    const taken = order.stock?.taken ?? {};
    if (Object.keys(taken).length === 0) return { error: "Nothing on this order came out of tracked stock." };
    const read = await readStock(tx, Object.keys(taken).map((sku) => ({ sku })));
    const at = new Date().toISOString();
    let returned = 0;
    for (const [sku, n] of Object.entries(taken)) {
      const found = read.get(sku);
      const was = found?.level;
      if (!found || !was?.tracked) continue;
      const onHand = was.onHand + n;
      soldOutChanged ||= writeLevel(tx, found.ref, was, { ...was, onHand }, { at, by, kind: "returned", change: n, onHand, ref: order.ref }).soldOutChanged;
      returned += n;
    }
    tx.update(orderRef, {
      "stock.returned": true,
      updatedAt: at,
      log: FieldValue.arrayUnion({ at, by, text: returned ? `Put ${itemCount(returned)} back in stock` : "Marked its items as back in stock (none is tracked any more)" }),
    });
    return { returned };
  });
  if ("returned" in result && result.returned) stockChanged(soldOutChanged);
  return result;
}

/**
 * Tells the shop, by the new-order email's addresses, what a paid order took
 * to its Low level or past it. One email per order, whatever went low on it.
 */
export async function lowStockEmail(order: Order, deals: readonly LiveCampaign[] = []): Promise<void> {
  const low = order.stock?.low ?? [];
  if (low.length === 0) return;
  const to = await orderRecipients();
  if (to.length === 0) return;
  const site = siteUrl() ?? "";
  const out = low.filter((l) => l.onHand <= l.soldOutAt);
  const state = (l: LowItem) => (out.includes(l) ? `Sold out on the shop (${l.onHand} left, sold down to ${l.soldOutAt})` : `${l.onHand} left; it sells out at ${l.soldOutAt}`);
  // A live deal on it is why it's selling, and how long it has to keep up.
  const until = (iso: string) => new Date(iso).toLocaleString("en-ZA", { timeZone: SHOP_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const onDeal = (l: LowItem) =>
    campaignsFor(l.sku, deals)
      .map((c) => `On deal in ${c.name}${c.endsAt ? `, until ${until(c.endsAt)}` : ", with no end date"}`)
      .join("; ");
  const cell = `font:400 16px/1.45 Arial,Helvetica,sans-serif;color:${C.ink}`;
  const rows = low
    .map(
      (l) => `<tr><td style="padding:12px 0;border-bottom:1px solid ${C.rule};${cell}"><strong>${esc(l.what)}</strong><br><span style="color:${C.soft}">${esc(l.sku)} · ${esc(state(l))}</span>${onDeal(l) ? `<br><span style="color:${C.ink}">${esc(onDeal(l))}</span>` : ""}</td></tr>`,
    )
    .join("");
  const names = low.map((l) => l.what);
  const lead = out.length === 0 ? "Running low" : out.length === low.length ? "Sold out" : "Low and sold out";
  const sent = await sendEmail({
    to,
    subject: `${lead}: ${low.length === 1 ? names[0] : `${low.length} items`}`,
    key: `stock-low/${order.ref}`,
    text: [
      `Order ${order.ref} took ${low.length === 1 ? "this" : "these"} to the low-stock level:`,
      "",
      ...low.map((l) => `${l.what} (${l.sku}): ${state(l)}${onDeal(l) ? `. ${onDeal(l)}` : ""}`),
      "",
      `Receive more on the Stock page: ${site}/admin/stock?show=low`,
    ].join("\n"),
    html: shell({
      base: site,
      internal: true,
      preheader: `${names.join(", ")}: order ${order.ref} took ${low.length === 1 ? "it" : "them"} to the low-stock level.`,
      body: [
        heading(low.length === 1 ? "Running low" : `${low.length} items running low`),
        para(`Order ${order.ref} took ${low.length === 1 ? "this" : "these"} to the level you set for a warning. You won’t hear about ${low.length === 1 ? "it" : "them"} again until stock goes back above it.`, { soft: true }),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>`,
        button(`${site}/admin/stock?show=low`, "Receive stock"),
      ].join(""),
    }),
  });
  if (!sent.ok) console.error("Low-stock email failed", order.ref, sent.error);
}
