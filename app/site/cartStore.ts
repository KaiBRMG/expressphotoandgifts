"use client";

import { useSyncExternalStore } from "react";

import { addLine, reprice, type CartLine, type PriceList } from "@/lib/catalog/cart";
import type { LineDraft } from "@/lib/catalog/checkout";
import { clampQuantity } from "@/lib/catalog/purchase";

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
};

const KEY = "epg:cart:v1";
const EMPTY: CartState = { lines: [], open: false, prices: null, was: {} };
/** The price list is rebuilt hourly (`/api/prices`), so a check holds that long. */
const PRICES_FRESH_MS = 60 * 60 * 1000;

let state: CartState | null = null;
let pricedAt = 0;
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

export const cart = {
  /** Adds a line and opens the drawer on it; `quiet` adds it where the customer already is (the photo step). */
  add(line: CartLine, { quiet = false } = {}) {
    set({ lines: addLine(current().lines, line), ...(quiet ? {} : { open: true, was: {} }) });
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
    if (current().lines.length === 0 || (!force && Date.now() - pricedAt < PRICES_FRESH_MS)) return;
    try {
      const res = await fetch("/api/prices", force ? { cache: "reload" } : undefined);
      if (!res.ok) return;
      const prices: PriceList = await res.json();
      pricedAt = Date.now();
      const { lines, was } = reprice(current().lines, prices);
      set({ lines, prices, was: { ...current().was, ...was } });
    } catch {
      // Offline: try again on the next open.
    }
  },
};
