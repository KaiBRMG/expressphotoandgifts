import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { api } from "@/lib/cloudinary";
import { toLine, type CartLine } from "@/lib/catalog/cart";
import { buildNeeds, type Needs, type Pixels } from "@/lib/catalog/checkout";
import { primaryPhoto } from "@/lib/catalog/listing";
import { getProducts } from "@/lib/catalog/queries";
import { maxFor } from "@/lib/catalog/stock";
import { liveAvailability } from "@/lib/stock";
import { orders } from "@/lib/checkout/orders";
import { lineWhat, orderFolder, receiptPath, refundedOf, type LogEntry, type Order } from "@/lib/checkout/order";
import { orderSettled, trackOrder, type Tracking } from "@/lib/checkout/tracking";
import type { Customer } from "./auth";
import { stillOnTheWay } from "./words";

/**
 * What a customer account does with orders: lists the ones it holds, brings
 * in the ones placed with its email before it existed (once the email is
 * proved to be theirs, `lib/account/auth.ts`), puts an old order back in
 * the cart with its photos, and lets go of the orders when the account is
 * deleted.
 *
 * An order is on an account by `orders/{ref}.uid` alone: set when it is paid
 * signed in, saved from its receipt, or claimed here. Matching by email is
 * never enough on its own, since accounts are made without proving the
 * address, and an order holds someone's photos.
 */

/** How an order stands, in a word or two, for the history's rows. */
export type Standing = { label: string; tone: "now" | "done" | "problem" | "refunded" };

/** One order as the account page shows it. */
export type AccountOrder = {
  ref: string;
  /** The receipt and tracking page, which every order email also links to. */
  receipt: string;
  /** When it was paid: what the customer remembers it by. */
  at: string;
  total: number;
  standing: Standing;
  /** "2 × Photo mug (330 ml)", one a line. */
  items: string[];
  /** Up to three of the customer's own placed photos, the first of each line first; none when nothing took a photo. */
  prints: { publicId: string; version: number }[];
  /** The first line's product photograph, when the order holds none of the customer's. */
  product: string | null;
  /** Still to reach the customer: tracked live at the top of the page. */
  live: boolean;
  tracking: Tracking | null;
  /** The order's receipt token and last change, for the live tracking's checks. */
  token: string;
  updatedAt: string;
};

/** The step's name for where the order is now, in the history's few words. */
const NOW_WORDS: Record<string, string> = { paid: "Next in line", making: "Being made", ready: "Ready to collect", booked: "Packed for the courier", collected: "On its way", out: "Out for delivery" };

function standingOf(o: Order, t: Tracking | null): Standing {
  const refunded = refundedOf(o);
  if (refunded >= o.total) return { label: "Refunded", tone: "refunded" };
  const part = refunded > 0 ? ", part refunded" : "";
  if (!t) return { label: `Paid${part}`, tone: "done" };
  if (t.problem) return { label: "Held up with the courier", tone: "problem" };
  const now = t.steps.find((s) => s.state === "now") ?? t.steps[t.steps.length - 1];
  if (t.finished) return { label: `${now.label}${part}`, tone: "done" };
  return { label: `${NOW_WORDS[now.key] ?? now.label}${part}`, tone: "now" };
}

/** Up to three placed photos, one from each line before a second from any, without repeats. */
function printsOf(o: Order) {
  const seen = new Set<string>();
  const rows = o.lines.map((l) => l.sets.flatMap((s) => s.files));
  const out: { publicId: string; version: number }[] = [];
  for (let i = 0; out.length < 3 && rows.some((r) => r.length > i); i++) {
    for (const r of rows) {
      const f = r[i];
      if (!f || seen.has(f.publicId) || out.length >= 3) continue;
      seen.add(f.publicId);
      out.push({ publicId: f.publicId, version: f.version });
    }
  }
  return out;
}

const paidOrders = (list: Order[]) => list.filter((o) => o.status === "paid").sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt));

/** The account's orders, every status or only `paid`. Equality filters only, sorted here, so the query needs no index of its own. */
const ordersOf = async (uid: string, paid = false) => {
  const mine = orders().where("uid", "==", uid);
  return (await (paid ? mine.where("status", "==", "paid") : mine).get()).docs.map((d) => d.data() as Order);
};

/** The account's paid orders, newest first, as the page shows them. */
export async function accountOrders(uid: string): Promise<AccountOrder[]> {
  const [list, products] = await Promise.all([ordersOf(uid, true), getProducts()]);
  const photoOf = new Map(products.map((p) => [p.slug, primaryPhoto(p)]));
  return paidOrders(list).map((o) => {
    const tracking = trackOrder(o);
    const standing = standingOf(o, tracking);
    return {
      ref: o.ref,
      receipt: receiptPath(o.ref, o.token),
      at: o.paidAt ?? o.createdAt,
      total: o.total,
      standing,
      items: o.lines.map(lineWhat),
      prints: printsOf(o),
      product: photoOf.get(o.lines[0]?.slug) ?? null,
      live: !orderSettled(o, tracking),
      tracking,
      token: o.token,
      updatedAt: o.updatedAt,
    };
  });
}

/* ---- Bringing in orders from before the account ----------------------- */

/**
 * Paid orders placed with the account's email and on no account, put on this
 * one. Only ever called once the email is proved (`lib/account/auth.ts`).
 * Returns how many.
 */
export async function claimGuestOrders(c: Customer): Promise<number> {
  const snap = await orders().where("contact.email", "==", c.email).where("uid", "==", null).where("status", "==", "paid").get();
  if (snap.empty) return 0;
  const now = new Date().toISOString();
  const batch = db().batch();
  for (const d of snap.docs) batch.update(d.ref, { uid: c.uid, updatedAt: now });
  await batch.commit();
  return snap.size;
}

/* ---- Ordering again ---------------------------------------------------- */

/** A photo from an old order, ready for the photo step's tray. */
export type ReusedPhoto = { publicId: string; version: number; px: Pixels; name: string };

/** A line's photos as they were placed: one set shared by every unit, or one per unit, slot by slot, by Cloudinary ID. */
export type ReusedLine = { each: boolean; sets: (string | null)[][]; words: string[] };

export type Reorder = {
  lines: CartLine[];
  photos: ReusedPhoto[];
  placed: Record<string, ReusedLine>;
  needs: Needs;
  /** What couldn't come back, in the customer's words. */
  left: string[];
  /** Places whose photo the shop no longer keeps: left empty to fill again. */
  missing: number;
};

/** Each stored photo's pixel size and current version, by ID; one Admin API call per hundred. */
async function storedPhotos(ids: string[]): Promise<Map<string, { px: Pixels; version: number }>> {
  const { admin, headers } = api();
  const found = new Map<string, { px: Pixels; version: number }>();
  for (let i = 0; i < ids.length; i += 100) {
    const query = ids.slice(i, i + 100).map((id) => `public_ids[]=${encodeURIComponent(id)}`).join("&");
    const res = await fetch(`${admin}/upload?${query}&max_results=100`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`Cloudinary lookup failed: ${res.status}`);
    const data = (await res.json()) as { resources?: { public_id: string; version: number; width: number; height: number }[] };
    for (const r of data.resources ?? []) found.set(r.public_id, { px: { w: r.width, h: r.height }, version: r.version });
  }
  return found;
}

/**
 * An old order as a new cart: the same products, sizes and quantities at
 * today's prices, with the same photos in the same places, ready to change
 * in the photo step. A line no longer on sale stays out and is named; one
 * with less in stock comes back at what there is. An edited place comes back
 * as the print it made, since only that render was kept.
 */
export async function reorder(c: Customer, ref: string): Promise<Reorder | { error: string }> {
  const [snap, products] = await Promise.all([orders().doc(ref).get(), getProducts()]);
  const order = snap.exists ? (snap.data() as Order) : null;
  if (!order || order.uid !== c.uid || order.status !== "paid") return { error: "We can’t find that order on your account." };

  const bySku = new Map(products.flatMap((p) => p.variants.map((v) => [v.sku, { p, v }] as const)));
  const needs = buildNeeds(products);
  const [available, stored] = await Promise.all([
    liveAvailability(order.lines.map((l) => l.sku)),
    storedPhotos([...new Set(order.lines.flatMap((l) => l.sets.flatMap((s) => s.files.map((f) => f.publicId))))]).catch((e) => {
      console.error("Reorder photo lookup failed", ref, e);
      return null;
    }),
  ]);
  if (!stored) return { error: "We couldn’t fetch your photos just now. Try again in a minute." };

  const out: Reorder = { lines: [], photos: [], placed: {}, needs: {}, left: [], missing: 0 };
  const named = new Map<string, number>();
  for (const l of order.lines) {
    const found = bySku.get(l.sku);
    if (!found || found.v.price === null) {
      out.left.push(`${lineWhat(l)}, no longer sold online`);
      continue;
    }
    const max = maxFor(available, l.sku);
    if (max === 0) {
      out.left.push(`${lineWhat(l)}, sold out for now`);
      continue;
    }
    const quantity = max !== null ? Math.min(l.quantity, max) : l.quantity;
    if (quantity < l.quantity) out.left.push(`${l.quantity - quantity} of the ${lineWhat(l)}, only ${quantity} in stock`);
    out.lines.push(toLine(found.p, found.v, found.v.price, quantity, found.p.slug, primaryPhoto(found.p)));
    if (needs[l.sku]) out.needs[l.sku] = needs[l.sku];

    const slots = needs[l.sku]?.photo?.slots.length ?? 0;
    if (slots === 0 || l.sets.length === 0) continue;
    const each = l.sets.length > 1;
    const sets = (each ? l.sets.slice(0, quantity) : l.sets).map((s) =>
      Array.from({ length: slots }, (_, slot) => {
        const f = s.files.find((x) => x.slot === slot);
        const kept = f && stored.get(f.publicId);
        if (!f || !kept) {
          out.missing++;
          return null;
        }
        if (!named.has(f.publicId)) {
          named.set(f.publicId, named.size + 1);
          out.photos.push({ publicId: f.publicId, version: kept.version, px: kept.px, name: `${order.ref} photo ${named.size}` });
        }
        return f.publicId;
      }),
    );
    out.placed[l.sku] = { each, sets, words: (each ? l.sets.slice(0, quantity) : l.sets).map((s) => s.words) };
  }
  if (out.lines.length === 0) return { error: `Nothing from ${order.ref} can be ordered online now: ${out.left.join("; ")}.` };
  return out;
}

/* ---- Leaving ----------------------------------------------------------- */

/** How many order folders are deleted from Cloudinary at once. */
const DELETING = 5;

/** Every customer photo under one order's folder, deleted; the Admin API takes a prefix. */
async function deleteOrderPhotos(ref: string) {
  const { admin, headers } = api();
  const res = await fetch(`${admin}/upload?prefix=${encodeURIComponent(orderFolder(ref))}`, { method: "DELETE", headers, cache: "no-store" });
  if (!res.ok) throw new Error(`Cloudinary delete failed for ${ref}: ${res.status}`);
}

/**
 * The orders' side of deleting an account (`deleteAccount` in auth.ts), once
 * nothing on it is still on its way: the photos of every order on it are
 * deleted, and the orders stay with the shop, which must keep its sales
 * records, unlinked from any account, each with a note in its history saying
 * why its photos are gone.
 */
export async function releaseOrders(uid: string): Promise<{ ok: true } | { error: string }> {
  const list = await ordersOf(uid);
  const busy = paidOrders(list).filter((o) => !orderSettled(o));
  if (busy.length) return { error: stillOnTheWay(busy.map((o) => o.ref)) };

  try {
    for (let i = 0; i < list.length; i += DELETING) await Promise.all(list.slice(i, i + DELETING).map((o) => deleteOrderPhotos(o.ref)));
  } catch (e) {
    console.error("Account photos not deleted", uid, e);
    return { error: "We couldn’t delete your photos just now, so nothing has changed. Try again in a few minutes." };
  }

  const now = new Date().toISOString();
  const note: LogEntry = { at: now, by: "The customer", text: "Deleted their account. This order’s photos were deleted with it; the order is kept for the shop’s records." };
  const batch = db().batch();
  for (const o of list) batch.update(orders().doc(o.ref), { uid: null, updatedAt: now, log: FieldValue.arrayUnion(note) });
  await batch.commit();
  return { ok: true };
}
