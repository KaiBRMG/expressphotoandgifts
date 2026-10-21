import { after } from "next/server";
import type { NextRequest } from "next/server";

import { orderForShipment, syncShipment } from "@/lib/checkout/shipments";
import { safeEqual } from "@/lib/secure";

/**
 * The Courier Guy's account webhooks (TCG portal: Settings > Webhook
 * subscriptions), at /api/tcg/webhook?key=<TCG_WEBHOOK_SECRET>.
 *
 * TCG signs nothing, so the key in the address is the only proof a call is
 * TCG's, and nothing in the body is believed: every event only says which
 * shipment to read again from TCG with the shop's key, and an address,
 * parcel-size or note event also flags the order for staff to check in TCG's
 * portal. Without TCG_WEBHOOK_SECRET set, nothing is accepted.
 */

type Kind = "tracking" | "note" | "address" | "dimensions";

/** What staff are asked to check, for the events that only a person can judge. */
const FLAGS: Partial<Record<Kind, string>> = {
  address: "The Courier Guy reports a change to the delivery address. Check the waybill in TCG’s portal.",
  dimensions: "The Courier Guy re-measured the parcel and may bill the account the difference. Check it in TCG’s portal.",
  note: "The Courier Guy added a note to the waybill. Read it in TCG’s portal.",
};

/** The shipment a payload is about, and what kind of event it is (by the shapes in TCG's docs). */
function readPayload(x: unknown): { id: number; kind: Kind } | null {
  const one = (Array.isArray(x) ? x[0] : x) as Record<string, unknown> | null;
  if (!one || typeof one !== "object" || typeof one.shipment_id !== "number") return null;
  const kind = Array.isArray(x) || "length_cm" in one ? "dimensions" : "new_delivery_address" in one ? "address" : "tracking_events" in one || "status" in one ? "tracking" : "note";
  return { id: one.shipment_id, kind };
}

export async function POST(request: NextRequest) {
  const secret = process.env.TCG_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("TCG_WEBHOOK_SECRET is not set", { status: 503 });
  if (!safeEqual(request.nextUrl.searchParams.get("key"), secret)) return new Response("Unauthorized", { status: 401 });

  const payload = readPayload(await request.json().catch(() => null));
  // Answered at once either way; an unknown shipment (another shop's, or a test) is not an error to retry.
  if (!payload) return new Response("ok");
  after(async () => {
    const found = await orderForShipment(payload.id);
    const issue = FLAGS[payload.kind];
    // A closed waybill (delivered, cancelled) has nothing left to read, unless TCG reports something to check.
    if (!found || (!found.open && !issue)) return;
    const synced = await syncShipment(found.ref, { which: found.which, tracking: found.tracking, issue });
    if ("error" in synced) console.error("Courier webhook: status not read", found.ref, synced.error);
  });
  return new Response("ok");
}
