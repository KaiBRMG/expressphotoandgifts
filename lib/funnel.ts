import { queryWords } from "@/lib/catalog/search";

/**
 * The shop's own counters of how far customers get, shared by the browser
 * that reports a step and the server that counts it. Nothing personal is
 * kept: a day's document holds counts. A step counts once a visit
 * (`sessionStorage`), so the funnel's steps are all visits; looking at or
 * adding a product also counts once a visit for that product, apart.
 * Pay pressed and paid aren't reported: they come from the orders.
 */

/** The steps the browser reports, in the order a customer reaches them. */
export const FUNNEL_STEPS = ["view", "cart", "checkout", "details"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** What a browser sends: a step on a product (`first` when it's the visit's first of that step), a checkout step, or a search that found nothing. */
export type Beacon = { step: "view" | "cart"; slug: string; first: boolean } | { step: "checkout" | "details" } | { step: "miss"; q: string };

/** `analytics/{YYYY-MM-DD}`: a day's counts in the shop's time. */
export type FunnelDay = Partial<Record<FunnelStep | "miss", number>> & {
  date: string;
  /** Visits that looked at or added each product, by product slug. */
  views?: Record<string, number>;
  carts?: Record<string, number>;
  /** Searches that found nothing, by what was typed. */
  misses?: Record<string, number>;
};

/** A search as it's counted: the words the shop's matcher reads it as, at most 40 characters; "" for nothing countable. */
export const searchTerm = (q: string) => queryWords(q).join(" ").slice(0, 40);
