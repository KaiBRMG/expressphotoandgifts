import { after } from "next/server";

import { count } from "@/lib/analytics";
import { getProduct } from "@/lib/catalog/queries";
import { searchTerm, type Beacon } from "@/lib/funnel";
import { callerIp, rateLimit } from "@/lib/rateLimit";

/**
 * Counts one step of a customer's way to an order (`lib/funnel.ts`), sent by
 * the shop's own pages with `sendBeacon`. Only same-site browsers are
 * counted, crawlers are left out, a product must be one the shop lists, and
 * each address is held to far more than a real visit sends, so a script
 * can't fill the counters. It answers at once and counts after, since the
 * browser never reads the answer.
 */
const allowed = rateLimit(240, 60 * 60 * 1000);

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|curl|wget|python|node-fetch/i;

type Body = { step?: unknown; slug?: unknown; first?: unknown; q?: unknown } | null;

export async function POST(request: Request) {
  const h = request.headers;
  const site = h.get("sec-fetch-site");
  if (!(site && site !== "same-origin") && !BOT.test(h.get("user-agent") ?? "") && allowed(callerIp(h) ?? "unknown")) {
    const body = (await request.json().catch(() => null)) as Body;
    after(async () => {
      const beacon = await read(body);
      if (beacon) await count(beacon).catch(() => {});
    });
  }
  return new Response(null, { status: 204 });
}

async function read(body: Body): Promise<Beacon | null> {
  switch (body?.step) {
    case "miss": {
      const q = typeof body.q === "string" ? searchTerm(body.q) : "";
      return q ? { step: "miss", q } : null;
    }
    case "checkout":
    case "details":
      return { step: body.step };
    case "view":
    case "cart":
      return typeof body.slug === "string" && (await getProduct(body.slug)) ? { step: body.step, slug: body.slug, first: body.first === true } : null;
    default:
      return null;
  }
}
