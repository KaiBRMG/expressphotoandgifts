import "server-only";

import { api, signedForm } from "@/lib/cloudinary";
import { CATCH_UP_DAYS, lastCheck } from "@/lib/admin/payments";
import { db } from "@/lib/firebase";
import { shopDate } from "@/lib/shopTime";
import { changeOrder, orders } from "./orders";
import { DAY_MS, GUEST_PHOTO_DAYS, holdsPhotos, orderFolder, REF, SWEEP_AFTER_DAYS, type Order } from "./order";

/**
 * The sweep of customer photos no order paid for: Cloudinary's free plan
 * holds only what the shop will print. Run daily by the host's cron
 * (`/api/cron/sweep-uploads`), after the PayFast check: an order Pay was
 * pressed on loses its photos only once a check of PayFast's history that
 * succeeded has read past its last day (`CheckRecord.covered`).
 *
 * Customer photos carry the `checkout` tag from upload (`/api/uploads/sign`),
 * and the sweep lists by it. An order's photos are deleted when its newest is
 * older than `SWEEP_AFTER_DAYS` and the order was never paid: no order at all
 * (abandoned on the photo step), or one left pending that long and not
 * flagged for the shop (a payment that didn't match waits for them). The photo
 * step has started over by then (`KEEP_DAYS`), so no customer still holds
 * them. A paid order's photos lose the tag instead, so the listing stays the
 * size of the last fortnight's uploads, not every photo the shop has kept.
 *
 * A paid order's photos then stay until their owner deletes them, except
 * those of an order on no account, which `sweepGuestPhotos` deletes
 * `GUEST_PHOTO_DAYS` after payment. An account's are never swept.
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
async function inChunks(ids: string[], size: number, call: (chunk: string[]) => Promise<Response | void>) {
  for (let i = 0; i < ids.length; i += size) {
    const res = await call(ids.slice(i, i + size));
    if (res && !res.ok) throw new Error(`Cloudinary call failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
}

/** Deletes the photos of every order never paid for that has sat `SWEEP_AFTER_DAYS`, and untags paid ones. */
export async function sweepUnpaidUploads(): Promise<{ deleted: { orders: number; photos: number }; kept: number; held: number }> {
  const cutoff = Date.now() - SWEEP_AFTER_DAYS * DAY_MS;
  const stale = [...(await listOrderPhotos())].filter(([, e]) => e.newest < cutoff);
  if (stale.length === 0) return { deleted: { orders: 0, photos: 0 }, kept: 0, held: 0 };

  const [snaps, check] = await Promise.all([db().getAll(...stale.map(([ref]) => db().collection("orders").doc(ref)), { fieldMask: ["status", "updatedAt", "flagged"] }), lastCheck()]);
  const fate = snaps.map((snap) => {
    const order = snap.exists ? (snap.data() as Pick<Order, "status" | "updatedAt" | "flagged">) : null;
    if (order?.status === "paid") return "paid";
    // A payment the shop has still to look at may yet make it a paid order.
    if (order?.flagged) return "pending";
    if (!order) return "abandoned";
    // Pay was pressed: kept until a check of PayFast's history has read past the day, so a payment whose notice went missing is found first;
    // past what a check can still catch up on, gone regardless, so a check that never succeeds can't keep photos for ever.
    const updated = Date.parse(order.updatedAt);
    if (updated >= cutoff) return "pending";
    const checked = (!!check?.covered && check.covered > shopDate(updated)) || updated < Date.now() - CATCH_UP_DAYS * DAY_MS;
    return checked ? "abandoned" : "held";
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

  // `held`: unpaid orders kept only because PayFast's history hasn't been checked past them; many here means the PayFast check is failing.
  return { deleted: { orders: fate.filter((f) => f === "abandoned").length, photos: doomed.length }, kept: paid.length, held: fate.filter((f) => f === "held").length };
}

/**
 * Deletes the photos kept for an order: everything in its folder, and any
 * photo it placed from another order's folder (Order again), except those in
 * `keep`, which another order still places. Without `keep` it is the folder
 * alone, by prefix.
 */
export async function deleteOrderPhotos(ref: string, placed: readonly string[] = [], keep: ReadonlySet<string> = new Set()) {
  const { admin, headers } = api();
  const folder = orderFolder(ref);
  const remove = async (query: string) => {
    const res = await fetch(`${admin}/upload?${query}`, { method: "DELETE", headers, cache: "no-store" });
    if (!res.ok) throw new Error(`Cloudinary delete failed for ${ref}: ${res.status}`);
  };
  const byId = (ids: string[]) => inChunks(ids, 100, (chunk) => remove(chunk.map((id) => `public_ids[]=${encodeURIComponent(id)}`).join("&")));

  if ([...keep].some((id) => id.startsWith(folder))) {
    const ids: string[] = [];
    for (let cursor: string | undefined, page = 0; page < MAX_PAGES; page++) {
      const res = await fetch(`${admin}/upload?prefix=${encodeURIComponent(folder)}&max_results=500${cursor ? `&next_cursor=${encodeURIComponent(cursor)}` : ""}`, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`Cloudinary listing failed for ${ref}: ${res.status}`);
      const data = (await res.json()) as Listed;
      ids.push(...(data.resources ?? []).map((r) => r.public_id));
      if (!(cursor = data.next_cursor)) break;
    }
    await byId(ids.filter((id) => !keep.has(id)));
  } else {
    await remove(`prefix=${encodeURIComponent(folder)}`);
  }
  await byId(placed.filter((id) => !id.startsWith(folder) && !keep.has(id)));
}

/** Orders whose photos are deleted at once. */
export const AT_ONCE = 5;

/**
 * Deletes the photos of every paid order on no account paid more than
 * `GUEST_PHOTO_DAYS` ago. `settings/photoSweep.through` is the payment time
 * swept to, so each run reads only the orders paid since. It moves on to the
 * earliest order that failed, if any, so one that keeps failing is tried
 * again without the rest being read again; a retry is harmless.
 */
export async function sweepGuestPhotos(): Promise<{ orders: number }> {
  const cutoff = new Date(Date.now() - GUEST_PHOTO_DAYS * DAY_MS).toISOString();
  const mark = db().collection("settings").doc("photoSweep");
  const through = ((await mark.get()).data() as { through?: string } | undefined)?.through;
  const due = orders().where("paidAt", "<", cutoff);
  const snap = await (through ? due.where("paidAt", ">=", through) : due).select("ref", "uid", "lines", "photosDeletedAt", "paidAt").get();
  const guests = snap.docs.map((d) => d.data() as Pick<Order, "ref" | "uid" | "lines" | "photosDeletedAt" | "paidAt">).filter((o) => !o.uid && holdsPhotos(o));

  const failed: { ref: string; paidAt: string }[] = [];
  for (let i = 0; i < guests.length; i += AT_ONCE) {
    await Promise.all(
      guests.slice(i, i + AT_ONCE).map(async ({ ref, paidAt }) => {
        try {
          // Read again just before: an account may have claimed the order since the listing, and then its photos are kept.
          if ((await orders().doc(ref).get()).data()?.uid) return;
          await deleteOrderPhotos(ref);
          await changeOrder(ref, "Automatic clean-up", () => ({
            update: { photosDeletedAt: new Date().toISOString() },
            log: `Photos deleted automatically, ${GUEST_PHOTO_DAYS} days after payment, as the order is on no account. The order is kept for the shop’s records.`,
          }));
        } catch (e) {
          console.error("Guest photos not deleted", ref, e);
          failed.push({ ref, paidAt: paidAt! });
        }
      }),
    );
  }
  // Moved on to the earliest that failed, so the next run tries it again without reading every order since the last good run.
  const oldest = failed.map((f) => f.paidAt).sort()[0];
  await mark.set({ through: oldest ?? cutoff, at: new Date().toISOString() });
  if (failed.length) throw new Error(`Guest photos not deleted for ${failed.map((f) => f.ref).join(", ")}`);
  return { orders: guests.length };
}

/** The daily clean-up: unpaid orders' photos, then a year-old guest order's. One failing doesn't hold up the other. */
export async function sweepUploads() {
  const [unpaid, guests] = await Promise.allSettled([sweepUnpaidUploads(), sweepGuestPhotos()]);
  if (unpaid.status === "rejected") throw unpaid.reason;
  if (guests.status === "rejected") throw guests.reason;
  return { unpaid: unpaid.value, guests: guests.value };
}
