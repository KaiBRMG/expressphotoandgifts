"use client";

import { useSyncExternalStore } from "react";

import { inWindow, priceDeals, stackOrder, stageOne, type DealPriced, type LiveCampaign } from "@/lib/catalog/campaigns";
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
/** A one-time code the customer entered (normalised), with the campaign it brings: this campaign is on no shelf, so the server sends it with the code. */
export type AppliedCode = { code: string; deal: LiveCampaign };

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
  /** The code entered at checkout: its campaign prices with the live ones. Kept with the cart until the order is paid, and checked again by the server whenever it is used. */
  code: AppliedCode | null;
  /** The line taken out last, and where it sat, for Undo; gone with the next change to the cart. */
  removed: { line: CartLine; index: number } | null;
};

const KEY = "epg:cart:v1";
const CODE_KEY = "epg:code:v1";
const EMPTY: CartState = { lines: [], open: false, prices: null, was: {}, available: null, deals: null, code: null, removed: null };
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

function loadCode(): AppliedCode | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CODE_KEY) ?? "null") as AppliedCode | null;
    return raw && typeof raw.code === "string" && Array.isArray(raw.deal?.rules) ? raw : null;
  } catch {
    return null;
  }
}

function current(): CartState {
  return (state ??= { ...EMPTY, lines: load(), code: loadCode() });
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
  if (next.code !== undefined && next.code !== prev.code) {
    try {
      if (next.code) window.localStorage.setItem(CODE_KEY, JSON.stringify(next.code));
      else window.localStorage.removeItem(CODE_KEY);
    } catch {
      // Private mode: the code stays for this visit.
    }
  }
  notify();
}

/** Another tab changed the cart: take its lines, keep this tab's drawer. */
function onStorage(e: StorageEvent) {
  if (e.key !== KEY && e.key !== CODE_KEY) return;
  state = { ...current(), lines: load(), code: loadCode() };
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

/**
 * The deals that apply this minute, in the order they stack: the shop's, and
 * the entered code's, whose place among them is the one the server gives it.
 * A campaign the shop now shows to everyone is not counted twice.
 */
export const dealsNow = (deals: LiveCampaign[] | null, code: AppliedCode | null) => {
  const shown = (deals ?? []).filter((c) => inWindow(c, Date.now()));
  return code && inWindow(code.deal, Date.now()) ? stackOrder([...shown.filter((c) => c.id !== code.deal.id), code.deal]) : shown;
};

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
  const priced = priceDeals(live, dealsNow(s.deals, s.code));
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
    set({ lines: addLine(current().lines, line), removed: null, ...(quiet ? {} : { open: true, was: {} }) });
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
    set({ lines: swapped, removed: null });
  },
  setQuantity(sku: string, quantity: number) {
    set({ lines: current().lines.map((l) => (l.sku === sku ? { ...l, quantity: clampQuantity(quantity) } : l)), removed: null });
  },
  /** Takes a line out, keeping it for `undo` until the cart changes again. */
  remove(sku: string) {
    const lines = current().lines;
    const index = lines.findIndex((l) => l.sku === sku);
    if (index < 0) return;
    set({ lines: lines.filter((l) => l.sku !== sku), removed: { line: lines[index], index } });
  },
  /** Puts the line removed last back where it was; merged if the same SKU has been added again since. */
  undo() {
    const { removed, lines } = current();
    if (!removed) return;
    const back = lines.some((l) => l.sku === removed.line.sku) ? addLine(lines, removed.line) : [...lines.slice(0, removed.index), removed.line, ...lines.slice(removed.index)];
    set({ lines: back, removed: null });
  },
  /** Empties the cart once its order is paid. The code goes with it: it was used up with the payment. */
  clear() {
    if (current().lines.length > 0 || current().code) set({ lines: [], was: {}, removed: null, code: null });
  },
  open() {
    set({ open: true, was: {} });
  },
  close() {
    if (current().open) set({ open: false, removed: null });
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
  /** A code the server has just accepted: the cart prices with its campaign. */
  applyCode(code: AppliedCode) {
    set({ code });
  },
  /** Takes the code off: removed by the customer, or refused by the server. */
  removeCode() {
    if (current().code) set({ code: null });
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
  const { deals, code } = useCart();
  return (sku, base) => stageOne(sku, base, dealsNow(deals, code)).price;
}
