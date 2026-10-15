import "server-only";

import { SHOP } from "@/app/site/data";
import type { Address } from "./details";
import type { DeliveryOption, Quote } from "./order";

/**
 * Delivery quotes from The Courier Guy (the ShipLogic platform), from the
 * shop's door to the customer's. Called only from the server, with the
 * account's API key: TCG_API_KEY, and TCG_API_URL for the platform
 * (https://api.shiplogic.com/v2 is the sandbox; production is the courier's
 * own host, e.g. https://api.portal.thecourierguy.co.za).
 *
 * The rate is the courier's, VAT inclusive, passed on as it is.
 */

/**
 * PLACEHOLDER, for the shop to confirm: the box an order ships in. The
 * catalogue holds no parcel sizes or weights, and the rate depends on them.
 * Until the shop measures its packaging, every order is quoted as this one
 * box. Replace with real figures (or a box per category) before going live.
 */
const PARCEL = { submitted_length_cm: 35, submitted_width_cm: 25, submitted_height_cm: 12, submitted_weight_kg: 2 };

/** The shop, as the courier collects from it. */
const COLLECTION = {
  type: "business",
  company: SHOP.name,
  street_address: SHOP.street,
  local_area: SHOP.town,
  city: SHOP.town,
  zone: SHOP.province,
  country: "ZA",
  code: SHOP.postcode,
};

export const courierReady = () => Boolean(process.env.TCG_API_KEY);

const deliveryAddress = (a: Address) => ({
  type: "residential",
  company: "",
  street_address: a.street,
  local_area: a.suburb,
  city: a.city,
  zone: a.province,
  country: "ZA",
  code: a.code,
});

type RateReply = {
  rates?: {
    rate?: number;
    service_level?: { code?: string; name?: string; description?: string };
  }[];
  message?: string;
};

/**
 * Every service the courier offers to this address, cheapest first, in cents.
 * `declaredValue` (cents) is the order's worth, for the courier's cover.
 */
export async function quote(address: Address, declaredValue: number): Promise<Quote> {
  const key = process.env.TCG_API_KEY;
  if (!key) return { ok: false, reason: "not-set-up" };
  const base = (process.env.TCG_API_URL ?? "https://api.shiplogic.com/v2").replace(/\/$/, "");

  let reply: RateReply;
  try {
    const res = await fetch(`${base}/rates`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_address: COLLECTION,
        delivery_address: deliveryAddress(address),
        parcels: [PARCEL],
        declared_value: Math.round(declaredValue / 100),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    reply = (await res.json().catch(() => ({}))) as RateReply;
    if (!res.ok) {
      console.error("Courier rates failed", res.status, reply.message);
      return { ok: false, reason: res.status >= 500 ? "unavailable" : "no-service" };
    }
  } catch (e) {
    console.error("Courier rates unreachable", e);
    return { ok: false, reason: "unavailable" };
  }

  const options = (reply.rates ?? [])
    .flatMap((r): DeliveryOption[] => {
      const code = r.service_level?.code;
      if (!code || typeof r.rate !== "number" || !(r.rate > 0)) return [];
      return [
        {
          code,
          name: r.service_level?.name?.trim() || code,
          description: r.service_level?.description?.trim() || null,
          price: Math.round(r.rate * 100),
        },
      ];
    })
    .sort((a, b) => a.price - b.price);

  return options.length > 0 ? { ok: true, options } : { ok: false, reason: "no-service" };
}
