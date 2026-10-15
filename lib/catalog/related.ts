import { tagValues } from "./tags";
import type { Product } from "./types";

/**
 * What physically goes with a product, for its "Goes with this" row: where
 * one's "fits:" meets the other's "holds:". A print fits the frame that holds
 * its size, a frame fits an easel, a tile fits its holder, prints fit an
 * album; and each pairing reads both ways. Two frames both hold 20×30 and
 * neither fits the other, so a frame never offers another frame.
 *
 * Only priced products qualify: a suggestion that cannot be bought is a dead
 * end. Ordered by how many values they meet on, then as `products` is ordered.
 */
export function goesWith(product: Product, products: Product[], limit = 4): Product[] {
  const fits = new Set(tagValues(product.tags, "fits"));
  const holds = new Set(tagValues(product.tags, "holds"));
  if (fits.size === 0 && holds.size === 0) return [];

  const meets = (p: Product) =>
    tagValues(p.tags, "holds").filter((v) => fits.has(v)).length +
    tagValues(p.tags, "fits").filter((v) => holds.has(v)).length;

  return products
    .filter((p) => p.slug !== product.slug && p.priceRange !== null)
    .map((p) => ({ p, shared: meets(p) }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared) // stable: ties keep the caller's order
    .slice(0, limit)
    .map((x) => x.p);
}
