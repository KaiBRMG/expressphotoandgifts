"use client";

import { useSyncExternalStore } from "react";

import { inWindow, priceDeals, stageOne, type DealPriced, type LiveCampaign } from "@/lib/catalog/campaigns";
import { addLine, liveLines, reprice, type CartLine, type PriceList } from "@/lib/catalog/cart";
import type { LineDraft } from "@/lib/catalog/checkout";
import { clampQuantity } from "@/lib/catalog/purchase";
import type { Availability } from "@/lib/catalog/stock";
import { track } from "./track";

/**
 * The cart, kept in this browser until checkout exists. Only the lines are
 * saved, in localStorage, so a reload or another tab keeps them; whether the
 * drawer is open and what the last price check found belong to this visit.
 * One small store read with `useSyncExternalStore`, so the dock and the
 * product page see the same cart.
 *
 * The server always renders an empty, closed cart; the stored lines are read
 * once the page is in the browser, so nothing is drawn that the server did
 * not send.
 */
type CartState = {
  lines: CartLine[];
  open: boolean;
  /** The catalogue's prices from the last check, or null before one. */
  prices: PriceList | null;
  /** Old prices of the lines the check changed since the drawer opened. */
  was: Record<string, number>;
  /** How many of each tracked SKU can be ordered now, from the last check; null before one. */
  available: Availability | null;
  /** The campaigns live or starting soon, from the last check; null before one. */
  deals: LiveCampaign[] | null;
  /** Once-per-customer campaigns checkout found this customer has had: left out of the price. */
  skip: string[];
};

const KEY = "epg:cart:v1";
const EMPTY: CartState = { lines: [], open: false, prices: null, was: {}, available: null, deals: null, skip: [] };
/** Campaigns (`/api/deals`) are rebuilt every five minutes, and come with the prices, so a check holds that long. */
const PRICES_FRESH_MS = 5 * 60 * 1000;
/** Stock moves with every sale, so it is asked again after a minute. */
const STOCK_FRESH_MS = 60 * 1000;

let state: CartState | null = null;
let pricedAt = 0;
let stockedAt = 0;
const listeners = new Set<() => void>();

function isLine(x: unknown): x is CartLine {
  const l = x as CartLine;
  return (
    typeof l === "object" &&
    l !== null &&
    typeof l.sku === "string" &&
    typeof l.slug === "string" &&
    typeof l.name === "string" &&
    typeof l.price === "number" &&
    typeof l.quantity === "number"
  );
}

function load(): CartLine[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter(isLine) : [];
  } catch {
    return [];
  }
}

function current(): CartState {
  return (state ??= { ...EMPTY, lines: load() });
}

const notify = () => listeners.forEach((fn) => fn());

function set(next: Partial<CartState>) {
  const prev = current();
  state = { ...prev, ...next };
  if (next.lines && next.lines !== prev.lines) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next.lines));
    } catch {
      // Private mode or a full disk: the cart still works for this visit.
    }
  }
  notify();
}

/** Another tab changed the cart: take its lines, keep this tab's drawer. */
function onStorage(e: StorageEvent) {
  if (e.key !== KEY) return;
  state = { ...current(), lines: load() };
  notify();
}

function subscribe(fn: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}

/** The deals that apply this minute, in the order they stack (the server sends them in it). */
export const dealsNow = (deals: LiveCampaign[] | null, skip: readonly string[]) =>
  (deals ?? []).filter((c) => inWindow(c, Date.now()) && !skip.includes(c.id));

/**
 * The lines the shop can sell, priced with the campaigns live now: each
 * line's price after the price deals, the savings of the rest, and what more
 * would bring. The same engine as the server's, so the total shown is the
 * total charged.
 */
export type PricedCart = {
  live: CartLine[];
  priced: DealPriced;
  /** A line's price per unit after the price deals. */
  unit: (line: Pick<CartLine, "sku" | "price">) => number;
};

/** One slot: the cart priced for the state it was priced from, so every part of the page shares one pricing. */
let pricedFor: { from: CartState; result: PricedCart } | null = null;

function priceState(s: CartState): PricedCart {
  if (pricedFor?.from === s) return pricedFor.result;
  const live = liveLines(s.lines, s.prices, s.available);
  const priced = priceDeals(live, dealsNow(s.deals, s.skip));
  const units = new Map(priced.lines.map((l) => [l.sku, l.price]));
  const result = { live, priced, unit: (l: Pick<CartLine, "sku" | "price">) => units.get(l.sku) ?? l.price };
  pricedFor = { from: s, result };
  return result;
}

export const usePricedCart = (): PricedCart => priceState(useCart());

/** One of the shop's static lists, or null when it can't be had (offline). */
async function fetchJson<T>(url: string, fresh: boolean): Promise<T | null> {
  try {
    const res = await fetch(url, fresh ? { cache: "reload" } : undefined);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const sameCounts = (a: Availability, b: Availability | null) =>
  b !== null && Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

export const cart = {
  /** Adds a line and opens the drawer on it; `quiet` adds it where the customer already is (the photo step). */
  add(line: CartLine, { quiet = false } = {}) {
    set({ lines: addLine(current().lines, line), ...(quiet ? {} : { open: true, was: {} }) });
    // A quiet add is checkout's offer of a matching print, not the customer choosing a product.
    if (!quiet) track({ step: "cart", slug: line.slug });
  },
  /** Puts another variant in a line's place, keeping its quantity: a mug's one photo for two. */
  swap(sku: string, line: LineDraft) {
    const lines = current().lines;
    const old = lines.find((l) => l.sku === sku);
    if (!old || line.sku === sku) return;
    // In place, so the line keeps its spot; merged if that variant is already in the cart.
    const swapped = lines.some((l) => l.sku === line.sku)
      ? addLine(lines.filter((l) => l !== old), { ...line, quantity: old.quantity })
      : lines.map((l) => (l === old ? { ...line, quantity: old.quantity } : l));
    set({ lines: swapped });
  },
  setQuantity(sku: string, quantity: number) {
    set({ lines: current().lines.map((l) => (l.sku === sku ? { ...l, quantity: clampQuantity(quantity) } : l)) });
  },
  remove(sku: string) {
    set({ lines: current().lines.filter((l) => l.sku !== sku) });
  },
  /** Empties the cart once its order is paid. */
  clear() {
    if (current().lines.length > 0) set({ lines: [], was: {} });
  },
  open() {
    set({ open: true, was: {} });
  },
  close() {
    if (current().open) set({ open: false });
  },
  /**
   * Re-checks every line against the catalogue's prices, at most once an
   * hour unless `force`d (checkout heard the total changed); offline, the
   * stored prices stand until the next open.
   */
  async checkPrices(force = false) {
    void cart.checkStock(force);
    if (current().lines.length === 0 || (!force && Date.now() - pricedAt < PRICES_FRESH_MS)) return;
    const [prices, deals] = await Promise.all([fetchJson<PriceList>("/api/prices", force), fetchJson<LiveCampaign[]>("/api/deals", force)]);
    // Offline: the stored prices stand until the next open.
    if (!prices) return;
    pricedAt = Date.now();
    const { lines, was } = reprice(current().lines, prices);
    set({ lines, prices, was: { ...current().was, ...was }, ...(deals ? { deals } : {}) });
  },
  /** Campaigns checkout found this customer has had already, once each: the cart prices without them. */
  skip(ids: string[]) {
    if (ids.length) set({ skip: [...new Set([...current().skip, ...ids])] });
  },
  /**
   * Re-checks how many of each tracked SKU can be ordered: on every open after
   * a minute, or now when `force`d. `any` asks with an empty cart too: the
   * product page's limit.
   */
  async checkStock(force = false, any = false) {
    if ((!any && current().lines.length === 0) || (!force && Date.now() - stockedAt < STOCK_FRESH_MS)) return;
    stockedAt = Date.now();
    const available = await fetchJson<Availability>("/api/stock", force);
    // Unchanged, nothing redraws.
    if (available && !sameCounts(available, current().available)) set({ available });
  },
  /** The limits the server found when they pressed Pay, the newest there are: shown at once, in the open cart. */
  limit(limits: Availability) {
    stockedAt = Date.now();
    set({ available: { ...(current().available ?? {}), ...limits }, open: true, was: {} });
  },
};

/** Each line's price per unit after the price deals: what checkout's lines show. */
export const useUnitPrice = () => usePricedCart().unit;

/** What a size not yet in the cart costs after the price deals live now: for an offer to add it. */
export function useDealPrice(): (sku: string, base: number) => number {
  const { deals, skip } = useCart();
  return (sku, base) => stageOne(sku, base, dealsNow(deals, skip)).price;
}
