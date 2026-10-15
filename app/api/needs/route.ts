import { buildNeeds } from "@/lib/catalog/checkout";
import { getProducts } from "@/lib/catalog/queries";

/**
 * What each variant on sale needs at checkout (its photo slots, or for a
 * frame the print that fills it), for the cart drawer to offer a frame's
 * print. Static and rebuilt hourly with the catalogue, like `/api/prices`.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  return Response.json(buildNeeds(await getProducts()));
}
