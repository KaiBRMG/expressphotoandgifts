import { getListings } from "@/app/shop/shelves";

/**
 * The search index the header's search window loads the first time it opens:
 * every live product as a card, with its category's name and its shopper-facing
 * tags. A few dozen entries, built from the cached catalogue and served static,
 * so opening search costs one small cached request and no Firestore read.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  return Response.json(await getListings());
}
