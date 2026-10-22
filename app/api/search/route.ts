import { getListings } from "@/app/shop/shelves";
import { getVocabulary } from "@/lib/catalog/queries";
import type { Listing } from "@/lib/catalog/listing";
import type { Vocabulary } from "@/lib/catalog/tags";

/** What the header's search loads: the cards, and the terms their tags are named by. */
export type SearchIndex = { listings: Listing[]; vocabulary: Vocabulary };

/**
 * The search index the header's search window loads the first time it opens:
 * every live product as a card, with its category's name and its shopper-facing
 * tags, with the shop's terms to name them. A few dozen entries, built from the cached catalogue and served static,
 * so opening search costs one small cached request and no Firestore read.
 */
export const dynamic = "force-static";
/** Five minutes: a campaign starts and ends on its own time, so the prices it sets can't wait an hour. */
export const revalidate = 300;

export async function GET() {
  const [listings, vocabulary] = await Promise.all([getListings(), getVocabulary()]);
  return Response.json({ listings, vocabulary } satisfies SearchIndex);
}
