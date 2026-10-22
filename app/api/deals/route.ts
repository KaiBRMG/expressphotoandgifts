import { getCartDeals } from "@/lib/campaigns";

/**
 * The campaigns live now or starting within the day, resolved to SKUs, for
 * the cart to price what it holds with the same engine the server charges
 * by. Each carries its dates, and the browser checks them itself, so a
 * campaign starts and ends in the cart on time. Served static and rebuilt
 * every five minutes, or at once when staff save a campaign.
 */
export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  return Response.json(await getCartDeals());
}
