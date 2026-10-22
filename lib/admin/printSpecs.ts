import "server-only";

import { getProduct } from "@/lib/catalog/queries";
import { photoSpec } from "@/lib/catalog/photos";
import type { PhotoShape } from "@/lib/catalog/tags";
import type { Order } from "@/lib/checkout/order";

export type PrintSpec = { print: { w: number; h: number } | null; shape: PhotoShape };

/**
 * Each line's print area (cm) and outline, read from its product's photo tags
 * as the catalogue has them now; null for a line whose product or variant is
 * no longer live, or that takes no photo. For the print sheet and print view.
 */
export async function printSpecs(o: Pick<Order, "lines">): Promise<(PrintSpec | null)[]> {
  return Promise.all(
    o.lines.map(async (l) => {
      const p = await getProduct(l.slug);
      const v = p?.variants.find((x) => x.sku === l.sku);
      const spec = p && v ? photoSpec(p, v) : null;
      return spec ? { print: spec.print, shape: spec.shape } : null;
    }),
  );
}
