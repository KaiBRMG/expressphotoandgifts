import { getAvailability } from "@/lib/stock";

/**
 * How many of each tracked SKU the shop can sell now, for the cart to check
 * what it holds each time it opens. Served static and cleared with the stock
 * cache whenever a count changes, so a check costs no Firestore read.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  return Response.json(await getAvailability());
}
