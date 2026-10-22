/**
 * Stock, per variant (SKU), as the shop and the admin both read it. Shared
 * with the browser: the rules only, no Firestore.
 *
 *   stock/{sku}            StockLevel, with who last changed it
 *   stock/{sku}/moves/{id} StockMove: every change, newest read first
 *
 * A SKU is untracked until staff switch it on, and an untracked SKU can
 * always be sold (prints on paper, anything made to order). A tracked one is
 * sold down to its `soldOutAt` level, the stock the shop keeps back for the
 * counter or for spoils: at or under it the size shows Sold out. `lowAt` sits
 * above that and warns the shop, by email the first time a sale takes it
 * there. Paid orders take stock off (`lib/checkout/stock.ts`); unpaid ones
 * hold nothing, like Shopify's default.
 */

import type { Product } from "./types";

export type StockLevel = {
  tracked: boolean;
  /** Units on the shelf. May go below zero when two customers pay for the last one at once; that order is flagged. */
  onHand: number;
  /** At or under this, the size is Sold out on the shop. */
  soldOutAt: number;
  /** At or under this (and above `soldOutAt`), the shop is warned it is running low. */
  lowAt: number;
};

export type StockState = "untracked" | "in" | "low" | "out";

export const STATE_LABELS: Record<StockState, string> = { untracked: "Not tracked", in: "In stock", low: "Low", out: "Sold out" };

/** How far above Sold out the Low warning sits until staff choose. */
export const LOW_MARGIN = 3;

/** A SKU never tracked, as a first edit starts from. */
const UNTRACKED: StockLevel = { tracked: false, onHand: 0, soldOutAt: 0, lowAt: LOW_MARGIN };

/** The highest count the admin takes, so a slip of the keyboard can't record a million mugs. */
export const MAX_COUNT = 99_999;

/** How many a customer can order now: everything above the kept-back level. */
export const sellable = (s: Pick<StockLevel, "onHand" | "soldOutAt">) => Math.max(0, s.onHand - s.soldOutAt);

/** Tracked and with nothing to sell: what the shop shows as Sold out. */
export const isSoldOut = (s: StockLevel | undefined) => Boolean(s?.tracked) && sellable(s!) === 0;

export function stockState(s: StockLevel | undefined): StockState {
  if (!s?.tracked) return "untracked";
  if (sellable(s) === 0) return "out";
  return s.onHand <= s.lowAt ? "low" : "in";
}

/**
 * What the shop may sell now, by SKU: only tracked SKUs are listed, so a SKU
 * missing from it can always be sold.
 */
export type Availability = Record<string, number>;

/** The most of a SKU that can go in the cart now, or null when there is no limit. */
export const maxFor = (available: Availability | null | undefined, sku: string): number | null =>
  available && sku in available ? available[sku] : null;

/** A product is Sold out when every variant it sells (every priced one) is. */
export function productSoldOut(product: Pick<Product, "variants">, available: Availability): boolean {
  const priced = product.variants.filter((v) => v.price !== null);
  return priced.length > 0 && priced.every((v) => available[v.sku] === 0);
}

/** Why a count changed: a paid order, a refund put back, or staff. */
export type MoveKind = "order" | "returned" | "received" | "counted" | "levels" | "tracking";

export const MOVE_LABELS: Record<MoveKind, string> = {
  order: "Sold online",
  returned: "Back from a refund",
  received: "Received",
  counted: "Counted",
  levels: "Levels changed",
  tracking: "Tracking",
};

export type StockMove = {
  at: string;
  /** The member of staff, or "shop" for a paid order. */
  by: string;
  kind: MoveKind;
  /** Units added (negative when taken off); 0 for a change of levels or tracking. */
  change: number;
  /** On hand after the change. */
  onHand: number;
  /** The order behind it, for sales and returns. */
  ref?: string;
  /** For levels and tracking: what they became, said plainly. */
  note?: string;
};

/** One that a sale took to its Low level, for the shop's email. */
export type LowItem = { sku: string; what: string; onHand: number; soldOutAt: number };

/**
 * What paying for an order did to stock, kept on the order: the units it took
 * by SKU (so a refund puts back exactly that), what it took to Low, and what
 * it sold beyond what was there.
 */
export type Taken = { taken: Record<string, number>; low: LowItem[]; oversold: string[]; returned?: boolean };

/** Units a paid order took that can still be put back: none once they have been. */
export const unitsToReturn = (s: Taken | undefined) => (s && !s.returned ? Object.values(s.taken).reduce((n, q) => n + q, 0) : 0);

/**
 * One row's edit from the Stock page, as it is sent to be saved: what to add
 * (a delivery), or the count it was found at; its levels; and tracking.
 * `expected` is the count the page showed, so a count typed over a sale that
 * happened meanwhile is refused rather than quietly undoing it.
 */
export type StockEdit = {
  sku: string;
  expected: number | null;
  tracked?: boolean;
  receive?: number;
  count?: number;
  soldOutAt?: number;
  lowAt?: number;
};

const isCount = (n: unknown, min = 0): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= MAX_COUNT;

/** Checks one edit against its level as it stands; returns the level it makes, or what is wrong. */
export function applyEdit(was: StockLevel | undefined, e: StockEdit): { level: StockLevel } | { error: string } {
  if (e.receive !== undefined && !isCount(e.receive, 1)) return { error: "Receive a whole number of 1 or more." };
  if (e.count !== undefined && !isCount(e.count)) return { error: "A count is a whole number, 0 or more." };
  if (e.soldOutAt !== undefined && !isCount(e.soldOutAt)) return { error: "Sold out at is a whole number, 0 or more." };
  if (e.lowAt !== undefined && !isCount(e.lowAt)) return { error: "Low at is a whole number, 0 or more." };
  if (e.receive !== undefined && e.count !== undefined) return { error: "Either receive stock or set the count, not both." };

  const tracked = e.tracked ?? was?.tracked ?? false;
  const base = was ?? UNTRACKED;
  const soldOutAt = e.soldOutAt ?? base.soldOutAt;
  const lowAt = e.lowAt ?? (e.soldOutAt !== undefined && base.lowAt < soldOutAt ? soldOutAt + LOW_MARGIN : base.lowAt);
  if (lowAt < soldOutAt) return { error: "Low at can’t be under Sold out at." };
  const onHand = e.count ?? base.onHand + (e.receive ?? 0);
  if (onHand > MAX_COUNT) return { error: `That makes more than ${MAX_COUNT.toLocaleString("en-ZA")}.` };
  if (!tracked && (e.receive !== undefined || e.count !== undefined)) return { error: "Track this item before counting it." };
  return { level: { tracked, onHand, soldOutAt, lowAt } };
}
