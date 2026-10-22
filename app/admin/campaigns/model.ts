import type { Campaign } from "@/lib/catalog/campaigns";
import { orderWhat } from "@/lib/catalog/purchase";
import { isSoldOut, sellable as sellableOf, stockState, type StockLevel, type StockState } from "@/lib/catalog/stock";
import type { CatalogueItem } from "@/lib/admin/campaigns";
import { at, dayMonth, short } from "../when";

/**
 * The campaign pages' small rules, shared by the list and the editor: dates
 * as the shop reads them, and a campaign's reach into stock.
 */

/** "24 Dec, 23:59", or with its year when it isn't this year's: a campaign's boundary, in the shop's time. */
export const moment = (iso: string, nowIso: string) =>
  new Date(iso).getUTCFullYear() === new Date(nowIso).getUTCFullYear() ? short(new Date(iso)) : at(iso);

/** "24 Dec": a day, in the shop's time. */
export const dayOf = (iso: string) => dayMonth(new Date(iso));

/** Whether two campaigns could be live at the same moment. */
export function overlaps(a: Pick<Campaign, "startsAt" | "endsAt">, b: Pick<Campaign, "startsAt" | "endsAt">): boolean {
  const s = (x: string | null) => (x ? Date.parse(x) : -Infinity);
  const e = (x: string | null) => (x ? Date.parse(x) : Infinity);
  return s(a.startsAt) < e(b.endsAt) && s(b.startsAt) < e(a.endsAt);
}

/** One size as the editor names it: "Royal Frame (A4)". */
export type SkuInfo = { sku: string; product: CatalogueItem; title: string | null; what: string };

export function skuIndex(catalogue: CatalogueItem[]): Map<string, SkuInfo> {
  return new Map(
    catalogue.flatMap((p) =>
      p.variants.map((v) => {
        const title = p.variants.length > 1 || v.title !== "Default" ? v.title : null;
        return [v.sku, { sku: v.sku, product: p, title, what: orderWhat(p.name, title) }] as const;
      }),
    ),
  );
}

/** A size's stock: its state, and the count when it is tracked. */
export const stockOf = (stock: Record<string, StockLevel>, sku: string): { state: StockState; onHand: number | null } => {
  const level = stock[sku];
  return { state: stockState(level), onHand: level?.tracked ? level.onHand : null };
};

/** How a set of sizes stands: how many are sold out, how many low, and how many can be sold in all (null when any is untracked). */
export type StockSummary = { sizes: number; out: string[]; low: string[]; sellable: number | null };

export function summarise(skus: Iterable<string>, stock: Record<string, StockLevel>): StockSummary {
  const out: string[] = [];
  const low: string[] = [];
  let sizes = 0;
  let sellable: number | null = 0;
  for (const sku of skus) {
    sizes++;
    const level = stock[sku];
    const state = stockState(level);
    if (state === "out") out.push(sku);
    if (state === "low") low.push(sku);
    sellable = level?.tracked && sellable !== null ? sellable + sellableOf(level) : null;
  }
  return { sizes, out, low, sellable };
}

/** "24 sizes · 2 sold out · 3 low": a set of sizes, said in a line. */
export function stockLine(s: StockSummary): string {
  const parts = [`${s.sizes} ${s.sizes === 1 ? "size" : "sizes"}`];
  if (s.out.length) parts.push(`${s.out.length} sold out`);
  if (s.low.length) parts.push(`${s.low.length} low`);
  return parts.join(" · ");
}

/** "2 sold out · 3 low": only what needs seeing to. */
export const stockAlert = (s: StockSummary) => [s.out.length ? `${s.out.length} sold out` : "", s.low.length ? `${s.low.length} low` : ""].filter(Boolean).join(" · ");

/** The sold-out sizes, each at 0, as the engine takes them. */
export const soldOutOf = (stock: Record<string, StockLevel>) => Object.fromEntries(Object.keys(stock).filter((s) => isSoldOut(stock[s])).map((s) => [s, 0]));
