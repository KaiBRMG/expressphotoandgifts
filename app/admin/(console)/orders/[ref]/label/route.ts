import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { getOrder } from "@/lib/checkout/orders";
import { shipmentLabel } from "@/lib/checkout/courier";

/**
 * The order's waybill PDF (`?kind=waybill`) or its parcel stickers
 * (`?kind=stickers`), for its outbound waybill or (`?which=return`) its return, straight from The Courier Guy: each visit asks for a
 * new signed link, since TCG's links last 24 hours, and sends staff to it.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/admin/orders/[ref]/label">) {
  await requireAdmin();
  const { ref } = await ctx.params;
  const kind = request.nextUrl.searchParams.get("kind") === "stickers" ? "stickers" : "waybill";
  const order = await getOrder(ref);
  const waybill = request.nextUrl.searchParams.get("which") === "return" ? order?.returnShipment : order?.shipment;
  const id = waybill?.state === "booked" ? waybill.id : undefined;
  if (!id) return new Response("This order has no waybill.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const label = await shipmentLabel(id, kind);
  if ("error" in label) return new Response(label.error, { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return Response.redirect(label.url, 303);
}
