import "server-only";

import { createHash } from "node:crypto";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { FieldValue, type DocumentData, type Transaction } from "firebase-admin/firestore";

import {
  NO_CAPS,
  NO_USE,
  phaseOf,
  resolveCampaign,
  stackOrder,
  type Campaign,
  type LiveCampaign,
  type Names,
  type Saving,
} from "@/lib/catalog/campaigns";
import { getCategories, getProducts, getVocabulary } from "@/lib/catalog/queries";
import type { Availability } from "@/lib/catalog/stock";
import { termLabel, type FilterFacet } from "@/lib/catalog/tags";
import { db } from "@/lib/firebase";
import { getSoldOut } from "@/lib/stock";

/**
 * Campaigns in Firestore (`campaigns/{id}`), the rules and the engine in
 * `lib/catalog/campaigns.ts`. The shop reads the switched-on ones through a
 * cache under CAMPAIGNS_TAG, cleared by every save in the admin and by a
 * paid order that moves a capped campaign's count; whether each is live is
 * worked out at the moment of reading, from its dates. Placing an order reads
 * them fresh.
 */

export const CAMPAIGNS_TAG = "campaigns";

export const campaignDocs = () => db().collection("campaigns");

/** A campaign document, filling what older ones lack. */
export function campaignFromDoc(id: string, d: DocumentData): Campaign {
  return {
    id,
    name: d.name ?? "",
    status: d.status ?? "draft",
    startsAt: d.startsAt ?? null,
    endsAt: d.endsAt ?? null,
    rules: Array.isArray(d.rules) ? d.rules : [],
    // Picked by name: a campaign from before codes may still carry the old once-per-customer cap, which no longer does anything.
    caps: { orders: d.caps?.orders ?? NO_CAPS.orders, units: d.caps?.units ?? NO_CAPS.units, code: d.caps?.code === true },
    featured: d.featured === true,
    blurb: d.blurb ?? "",
    used: { ...NO_USE, ...d.used },
    createdAt: d.createdAt ?? "",
    updatedAt: d.updatedAt ?? "",
    updatedBy: d.updatedBy ?? "",
    ...(d.endedAt ? { endedAt: d.endedAt } : {}),
    log: Array.isArray(d.log) ? d.log : [],
  };
}

/** Switched on or paused: the only ones the shop could show, live or soon. */
const readOn = async () => (await campaignDocs().where("status", "==", "on").get()).docs.map((d) => campaignFromDoc(d.id, d.data()));

/**
 * The switched-on campaigns the shop may show. One that needs a code is never
 * among them: it is on no shelf, card, page, feed or cart until a customer
 * enters their code at checkout (`lib/campaignCodes.ts`).
 */
const getOnCampaigns = unstable_cache(async () => (await readOn()).filter((c) => !c.caps.code), ["campaigns-on"], { tags: [CAMPAIGNS_TAG], revalidate: 3600 });

/** How a target is named on the shop, from the shop's own categories and terms. */
export async function shopNames(): Promise<Names> {
  const [categories, vocabulary] = await Promise.all([getCategories(), getVocabulary()]);
  const byId = new Map(categories.map((c) => [c.id, c.name]));
  return {
    category: (id) => byId.get(id) ?? id,
    tag: (t) => {
      const [facet, value] = t.split(":") as [FilterFacet, string];
      return termLabel(vocabulary, facet, value);
    },
  };
}

/** Campaigns as the engine takes them, against the shop's catalogue. */
export async function resolveAll(cs: Campaign[], soldOut: Availability): Promise<LiveCampaign[]> {
  if (cs.length === 0) return [];
  const [products, names] = await Promise.all([getProducts(), shopNames()]);
  return stackOrder(cs).map((c) => resolveCampaign(c, products, names, soldOut));
}

/** The campaigns live now, for the pages the shop renders. Once per render. */
export const getLiveDeals = cache(async (): Promise<LiveCampaign[]> => {
  const now = Date.now();
  const [on, soldOut] = await Promise.all([getOnCampaigns(), getSoldOut()]);
  return resolveAll(on.filter((c) => phaseOf(c, now) === "live"), soldOut);
});

/** How far ahead `/api/deals` sends a scheduled campaign, so the cart picks it up on time without waiting for a rebuild. */
const AHEAD_MS = 24 * 3600_000;

/**
 * Live and starting within the day, for `/api/deals`: the browser checks each
 * one's dates itself, so a campaign starts and ends in the cart on the minute.
 */
export async function getCartDeals(): Promise<LiveCampaign[]> {
  const now = Date.now();
  const [on, soldOut] = await Promise.all([getOnCampaigns(), getSoldOut()]);
  const soon = on.filter((c) => {
    const p = phaseOf(c, now);
    return p === "live" || (p === "scheduled" && Date.parse(c.startsAt!) - now < AHEAD_MS);
  });
  return resolveAll(soon, soldOut);
}

/** "kai@example.com" → its SHA-256: how the shop knows a customer by email, without keeping it twice. */
export const customerKey = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

/** The campaigns live now, read fresh, for pricing an order: the ones the shop shows, without any that need a code. */
export const readLiveDeals = async (): Promise<Campaign[]> => {
  const now = Date.now();
  return (await readOn()).filter((c) => phaseOf(c, now) === "live" && !c.caps.code);
};

/**
 * In the transaction that marks an order paid: counts its use of each
 * campaign (orders, units, rand off, and the goods it sold). Writes only, so
 * it can follow the transaction's reads. Returns the campaigns it counted,
 * whose cached copy `campaignsUsed` then clears, so one that reached its cap
 * stops showing.
 */
export function countUse(tx: Transaction, savings: readonly Saving[] | undefined, goods: number): string[] {
  const by = new Map<string, { units: number; discount: number }>();
  for (const s of savings ?? []) {
    const u = by.get(s.campaign) ?? { units: 0, discount: 0 };
    by.set(s.campaign, { units: u.units + s.units, discount: u.discount + s.amount });
  }
  for (const [id, u] of by) {
    const ref = campaignDocs().doc(id);
    // A merge, not an update: a payment must go through even if its campaign has gone since.
    tx.set(
      ref,
      { used: { orders: FieldValue.increment(1), units: FieldValue.increment(u.units), discount: FieldValue.increment(u.discount), sales: FieldValue.increment(goods) } },
      { merge: true },
    );
  }
  return [...by.keys()];
}

/** After a paid order used campaigns: the shop's copy is read again, so a cap reached ends it there. */
export function campaignsUsed(ids: string[]) {
  if (ids.length) revalidateTag(CAMPAIGNS_TAG, { expire: 0 });
}
