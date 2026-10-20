import "server-only";

import { api, signedForm } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { DAY_MS, REF, SWEEP_AFTER_DAYS, type Order } from "./order";

/**
 * The sweep of customer photos no order paid for: Cloudinary's free plan
 * holds only what the shop will print. Run daily by the host's cron
 * (`/api/cron/sweep-uploads`).
 *
 * Customer photos carry the `checkout` tag from upload (`/api/uploads/sign`),
 * and the sweep lists by it. An order's photos are deleted when its newest is
 * older than `SWEEP_AFTER_DAYS` and the order was never paid: no order at all
 * (abandoned on the photo step), or one left pending that long and not
 * flagged for the shop (a payment that didn't match waits for them). The photo
 * step has started over by then (`KEEP_DAYS`), so no customer still holds
 * them. A paid order's photos lose the tag instead, so the listing stays the
 * size of the last fortnight's uploads, not every photo the shop has kept.
 */

/** Pages of 500 listed per run, well within the free plan's 500 Admin API calls an hour. */
const MAX_PAGES = 20;

type Listed = { resources?: { public_id: string; created_at: string }[]; next_cursor?: string };

/** Every tagged customer photo's ID by order, with the newest upload's time. */
async function listOrderPhotos() {
  const { admin, headers } = api();
  const byRef = new Map<string, { ids: string[]; newest: number }>();
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${admin}/tags/checkout?max_results=500${cursor ? `&next_cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`Cloudinary listing failed: ${res.status}`);
    const data = (await res.json()) as Listed;
    for (const r of data.resources ?? []) {
      const [folder, ref] = r.public_id.split("/");
      if (folder !== "orders" || !REF.test(ref)) continue;
      const entry = byRef.get(ref) ?? { ids: [], newest: 0 };
      entry.ids.push(r.public_id);
      entry.newest = Math.max(entry.newest, Date.parse(r.created_at));
      byRef.set(ref, entry);
    }
    cursor = data.next_cursor;
    if (!cursor) break;
  }
  return byRef;
}

/** `size` at a time: what one call of each endpoint takes. */
async function inChunks(ids: string[], size: number, call: (chunk: string[]) => Promise<Response>) {
  for (let i = 0; i < ids.length; i += size) {
    const res = await call(ids.slice(i, i + size));
    if (!res.ok) throw new Error(`Cloudinary call failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
}

/** Deletes the photos of every order never paid for that has sat `SWEEP_AFTER_DAYS`, and untags paid ones. */
export async function sweepUnpaidUploads(): Promise<{ deleted: { orders: number; photos: number }; kept: number }> {
  const cutoff = Date.now() - SWEEP_AFTER_DAYS * DAY_MS;
  const stale = [...(await listOrderPhotos())].filter(([, e]) => e.newest < cutoff);
  if (stale.length === 0) return { deleted: { orders: 0, photos: 0 }, kept: 0 };

  const snaps = await db().getAll(...stale.map(([ref]) => db().collection("orders").doc(ref)), { fieldMask: ["status", "updatedAt", "flagged"] });
  const fate = snaps.map((snap) => {
    const order = snap.exists ? (snap.data() as Pick<Order, "status" | "updatedAt" | "flagged">) : null;
    if (order?.status === "paid") return "paid";
    // A payment the shop has still to look at may yet make it a paid order.
    if (order?.flagged) return "pending";
    return !order || Date.parse(order.updatedAt) < cutoff ? "abandoned" : "pending";
  });
  const ids = (f: string) => stale.filter((_, i) => fate[i] === f).flatMap(([, e]) => e.ids);
  const doomed = ids("abandoned");
  const paid = ids("paid");

  const { base, admin, headers } = api();
  // The Admin API deletes 100 a call; the tags endpoint takes 1000.
  await inChunks(doomed, 100, (chunk) =>
    fetch(`${admin}/upload?${chunk.map((id) => `public_ids[]=${encodeURIComponent(id)}`).join("&")}`, { method: "DELETE", headers, cache: "no-store" }),
  );
  await inChunks(paid, 1000, (chunk) => {
    const body = signedForm({ command: "remove", public_ids: chunk, tag: "checkout" });
    return fetch(`${base}/tags`, { method: "POST", body, cache: "no-store" });
  });

  return { deleted: { orders: fate.filter((f) => f === "abandoned").length, photos: doomed.length }, kept: paid.length };
}
