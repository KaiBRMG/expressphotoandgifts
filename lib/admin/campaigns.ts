import "server-only";

import { cache } from "react";
import { FieldValue, type Transaction } from "firebase-admin/firestore";

import {
  blankDraft,
  campaignProblems,
  draftOf,
  NAME_MAX,
  NO_USE,
  newRule,
  phaseOf,
  readDraft,
  type Campaign,
  type CampaignDraft,
  type CampaignLog,
  type CampaignStatus,
  type DealProduct,
} from "@/lib/catalog/campaigns";
import { primaryPhoto } from "@/lib/catalog/listing";
import { getCategories, getProducts, getVocabulary } from "@/lib/catalog/queries";
import { nextDays } from "@/lib/catalog/seasons";
import type { StockLevel } from "@/lib/catalog/stock";
import { FACET_LABELS, FILTER_FACETS, filterTags, tag, termLabel } from "@/lib/catalog/tags";
import { db } from "@/lib/firebase";
import { campaignDocs, campaignFromDoc } from "@/lib/campaigns";
import { readLevels } from "./stock";

/**
 * Campaigns as the admin reads and writes them, fresh from Firestore. Every
 * change is a transaction that checks the campaign hasn't changed since the
 * page loaded it (`expected`, its `updatedAt`), and leaves a line in its log
 * saying who made it.
 */

export type CampaignError = { error: string; conflict?: true };

export type CampaignResult = { ok: true; campaign: Campaign } | CampaignError;

export async function listCampaigns(): Promise<Campaign[]> {
  const snap = await campaignDocs().get();
  return snap.docs.map((d) => campaignFromDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** One campaign, read once per request however many parts of the page ask. */
export const getCampaign = cache(async (id: string): Promise<Campaign | null> => {
  if (!/^[A-Za-z0-9]{1,40}$/.test(id)) return null;
  const doc = await campaignDocs().doc(id).get();
  return doc.exists ? campaignFromDoc(doc.id, doc.data()!) : null;
});

const entry = (by: string, text: string): CampaignLog => ({ at: new Date().toISOString(), by, text });

/** In a transaction: the campaign as it stands, or why it can't be changed. */
async function current(tx: Transaction, id: string, expected: string): Promise<Campaign | CampaignError> {
  const snap = await tx.get(campaignDocs().doc(id));
  if (!snap.exists) return { error: "This campaign has been deleted." };
  const c = campaignFromDoc(snap.id, snap.data()!);
  if (c.updatedAt !== expected) return { error: `Someone else changed this campaign (${c.updatedBy}) since you opened it.`, conflict: true };
  return c;
}

/** What makes a live campaign's change reach the shop now, for the log. */
const liveNote = (c: Campaign) => (phaseOf(c, Date.now()) === "live" ? " while live" : "");

/**
 * Saves a draft: a new campaign (`id` null) as a Draft, or the changes to one
 * that exists, whatever its status. A live one's changes reach the shop at
 * once; anything not yet whole is refused for a campaign that is switched
 * on, since the shop would show it.
 */
export async function saveCampaign(id: string | null, expected: string, raw: unknown, by: string): Promise<CampaignResult> {
  const draft = readDraft(raw);
  if (!draft) return { error: "That campaign couldn’t be read. Reload the page and try again." };
  const now = new Date().toISOString();

  if (!id) {
    const ref = campaignDocs().doc();
    const doc: Omit<Campaign, "id"> = { ...draft, status: "draft", used: NO_USE, createdAt: now, updatedAt: now, updatedBy: by, log: [entry(by, "Created it as a draft")] };
    await ref.create(doc);
    return { ok: true, campaign: { ...doc, id: ref.id } };
  }

  // The shop's own catalogue, which is what a switched-on campaign must be whole against.
  const products = await getProducts();
  return db().runTransaction(async (tx): Promise<CampaignResult> => {
    const was = await current(tx, id, expected);
    if ("error" in was) return was;
    if (was.status === "on" || was.status === "paused") {
      const [problem] = campaignProblems(draft, products, Date.now());
      if (problem) return { error: `It’s switched on, so it must stay whole: ${problem.message}` };
    }
    const log = entry(by, `Saved changes${liveNote(was)}`);
    const next: Campaign = { ...was, ...draft, updatedAt: now, updatedBy: by, log: [...(was.log ?? []), log] };
    tx.update(campaignDocs().doc(id), { ...draft, updatedAt: now, updatedBy: by, log: FieldValue.arrayUnion(log) });
    return { ok: true, campaign: next };
  });
}

export type StatusMove = "schedule" | "pause" | "resume" | "end" | "reopen";

const MOVES: Record<StatusMove, { from: CampaignStatus[]; to: CampaignStatus; say: (c: Campaign) => string }> = {
  schedule: { from: ["draft"], to: "on", say: (c) => (c.startsAt && Date.parse(c.startsAt) > Date.now() ? "Scheduled it" : "Put it live") },
  pause: { from: ["on"], to: "paused", say: () => "Paused it" },
  resume: { from: ["paused"], to: "on", say: () => "Resumed it" },
  end: { from: ["on", "paused"], to: "ended", say: () => "Ended it early" },
  /** Back to a draft, from ended: to change and run again. */
  reopen: { from: ["ended"], to: "draft", say: () => "Took it back to a draft" },
};

/**
 * Moves a campaign along: scheduled (live at its start), paused, resumed,
 * ended early, or back to a draft. Switching on checks it is whole against
 * the catalogue as it is now.
 */
export async function moveCampaign(id: string, expected: string, move: StatusMove, by: string): Promise<CampaignResult> {
  const m = MOVES[move];
  if (!m) return { error: "That can’t be done to a campaign." };
  const products = m.to === "on" ? await getProducts() : [];
  return db().runTransaction(async (tx): Promise<CampaignResult> => {
    const was = await current(tx, id, expected);
    if ("error" in was) return was;
    if (!m.from.includes(was.status)) return { error: "It has moved on since you opened it. Reload the page." };
    if (m.to === "on") {
      const problems = campaignProblems(draftOf(was), products, Date.now());
      if (problems.length) return { error: `Not yet: ${problems[0].message}` };
    }
    const now = new Date().toISOString();
    const log = entry(by, m.say(was));
    const ended = m.to === "ended" ? { endedAt: now } : m.to === "draft" ? { endedAt: FieldValue.delete() } : {};
    tx.update(campaignDocs().doc(id), { status: m.to, ...ended, updatedAt: now, updatedBy: by, log: FieldValue.arrayUnion(log) });
    const next: Campaign = { ...was, status: m.to, updatedAt: now, updatedBy: by, log: [...(was.log ?? []), log] };
    if (m.to === "ended") next.endedAt = now;
    if (m.to === "draft") delete next.endedAt;
    return { ok: true, campaign: next };
  });
}

/** Deletes a draft that never ran. Anything that has been on stays, for the orders that used it. */
export async function deleteCampaign(id: string, expected: string): Promise<{ ok: true } | CampaignError> {
  return db().runTransaction(async (tx) => {
    const was = await current(tx, id, expected);
    if ("error" in was) return was;
    if (was.status !== "draft" || was.used.orders > 0) return { error: "Only a draft that never ran can be deleted. End it instead." };
    tx.delete(campaignDocs().doc(id));
    return { ok: true } as const;
  });
}

/** A new draft with the same deals and limits, without its dates, results or history. */
export async function duplicateCampaign(id: string, by: string): Promise<CampaignResult> {
  const was = await getCampaign(id);
  if (!was) return { error: "That campaign has been deleted." };
  const name = `Copy of ${was.name}`.slice(0, NAME_MAX);
  const rules = was.rules.map((r) => ({ ...r, id: newRule(r.kind).id }));
  return saveCampaign(null, "", { ...draftOf(was), name, startsAt: null, endsAt: null, rules, featured: false }, by);
}

/** Products the shop put on Specials by hand, before campaigns: the old `special` flag still on their documents. */
export async function handSpecials(): Promise<{ slug: string; name: string }[]> {
  const snap = await db().collection("products").where("special", "==", true).get();
  return snap.docs.map((d) => ({ slug: d.id, name: String(d.data().name ?? d.id) }));
}

/**
 * Turns the hand-set Specials into one draft campaign holding those products,
 * with its price off still to choose, and clears the old flag, in one batch.
 */
export async function adoptHandSpecials(by: string): Promise<CampaignResult> {
  const found = await handSpecials();
  if (found.length === 0) return { error: "Nothing is on Specials by hand any more." };
  const rule = newRule("price");
  const draft: CampaignDraft = {
    ...blankDraft(),
    name: "Specials",
    rules: [{ ...rule, target: { kind: "products", items: found.map((p) => ({ slug: p.slug, skus: null })) }, off: { kind: "percent", value: null } } as typeof rule],
  };
  const made = await saveCampaign(null, "", draft, by);
  if (!("ok" in made)) return made;
  const batch = db().batch();
  for (const p of found) batch.update(db().collection("products").doc(p.slug), { special: FieldValue.delete() });
  await batch.commit();
  return made;
}

/* ---- What the campaign pages read ---------------------------------------- */

/** A product as the editor offers it: what the engine needs, with its code and photo to pick it by. */
export type CatalogueItem = DealProduct & { code: string; photo: string | null };

export type CampaignContext = {
  /** Products in the shop: a deal on a hidden one would reach no one. */
  catalogue: CatalogueItem[];
  categories: { id: string; name: string }[];
  /** The shopper-facing terms a deal can be aimed at, grouped by facet. */
  tags: { group: string; items: { value: string; label: string }[] }[];
  /** Tracked SKUs' levels, read fresh: the warnings must match the shelf now. */
  stock: Record<string, StockLevel>;
  /** The gifting days coming up, for the timeline and quick end dates. */
  seasons: { value: string; label: string; at: string }[];
  now: string;
};

export async function campaignContext(): Promise<CampaignContext> {
  // The shop's cached catalogue (saving a product clears it): only what's in the shop can carry a deal.
  const [products, categories, vocabulary, levels] = await Promise.all([getProducts(), getCategories(), getVocabulary(), readLevels({ trackedOnly: true })]);
  const now = new Date();
  return {
    catalogue: products.map((p) => ({
        slug: p.slug,
        name: p.name,
        code: p.code,
        categoryId: p.categoryId,
        tags: filterTags(p.tags),
        photo: primaryPhoto(p),
        variants: p.variants.map((v) => ({ sku: v.sku, title: v.title, price: v.price })),
      })),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    tags: FILTER_FACETS.map((f) => ({ group: FACET_LABELS[f], items: vocabulary[f].map((t) => ({ value: tag(f, t.value), label: t.label })) })),
    stock: Object.fromEntries([...levels].map(([sku, s]) => [sku, { tracked: s.tracked, onHand: s.onHand, soldOutAt: s.soldOutAt, lowAt: s.lowAt }])),
    seasons: nextDays(now).map((d) => ({ value: d.value, label: termLabel(vocabulary, "occasion", d.value), at: new Date(d.at).toISOString() })),
    now: now.toISOString(),
  };
}
