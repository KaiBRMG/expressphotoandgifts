import { tagValues } from "./tags";
import type { Product } from "./types";

/** What the "Goes with this" row needs to know about a product. */
type Candidate = Pick<Product, "slug" | "tags" | "priceRange"> & { formerSlugs?: string[] };

/** How many cards the row shows when size matches fill it; picked products always all show. */
export const GOES_WITH_ROW = 4;

/**
 * Products that physically go with this one by size: where one's "fits:"
 * meets the other's "holds:". A print fits the frame that holds its size, a
 * frame fits an easel, a tile fits its holder, prints fit an album; and each
 * pairing reads both ways. Two frames both hold 20×30 and neither fits the
 * other, so a frame never offers another frame.
 *
 * Each comes with the values it meets on, best match first; ties keep the
 * order `products` is in. Whether it can be bought is the caller's to judge.
 */
export function sizeMatches<T extends Candidate>(product: Candidate, products: T[]): { product: T; on: string[] }[] {
  const fits = new Set(tagValues(product.tags, "fits"));
  const holds = new Set(tagValues(product.tags, "holds"));
  if (fits.size === 0 && holds.size === 0) return [];
  return products
    .filter((p) => p.slug !== product.slug)
    .map((p) => ({
      product: p,
      on: [...tagValues(p.tags, "holds").filter((v) => fits.has(v)), ...tagValues(p.tags, "fits").filter((v) => holds.has(v))],
    }))
    .filter((m) => m.on.length > 0)
    .sort((a, b) => b.on.length - a.on.length); // stable: ties keep the caller's order
}

/** The product a picked slug names, by its web address now or one it had before. */
export const findPicked = <T extends Candidate>(slug: string, products: T[]) =>
  products.find((p) => p.slug === slug || p.formerSlugs?.includes(slug));

/**
 * Its "Goes with this" row: the products staff picked for it, in their order,
 * then size matches until the row holds GOES_WITH_ROW. Only priced products
 * qualify, because a suggestion that can't be bought is a dead end; pass the
 * products the shop shows, and hidden ones are left out with them.
 */
export function goesWith<T extends Candidate>(product: Candidate & { related: string[] }, products: T[]): T[] {
  const buyable = (p: T | undefined): p is T => p !== undefined && p.slug !== product.slug && p.priceRange !== null;
  const picked = [...new Set(product.related.map((s) => findPicked(s, products)).filter(buyable))];
  const matched = sizeMatches(product, products)
    .map((m) => m.product)
    .filter((p) => buyable(p) && !picked.includes(p));
  return [...picked, ...matched.slice(0, Math.max(0, GOES_WITH_ROW - picked.length))];
}
