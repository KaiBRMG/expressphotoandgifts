import { getPriceList } from "@/lib/catalog/queries";

/**
 * Every variant on sale and its price in cents, keyed by SKU, for the cart
 * drawer to re-check what it holds each time it opens. Built from the cached
 * catalogue and served static, so a check costs one small cached request and
 * no Firestore read.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  return Response.json(await getPriceList());
}
