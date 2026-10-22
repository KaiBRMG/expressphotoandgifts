import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { getVocabulary, productFromDoc, termFromDoc, TERMS_QUERY } from "@/lib/catalog/queries";
import {
  cleanDraft,
  codeProblem,
  issuesFor,
  LIMITS,
  nameProblem,
  priceRange,
  readinessIssues,
  recodeVariants,
  SLUG_MAX,
  SLUG_PATTERN,
  slugFor,
  normaliseCode,
  toDraft,
  type ProductDraft,
} from "@/lib/catalog/edit";
import { ADDABLE_FACETS, cleanTermLabel, termProblem, termValue, tagValues, vocabularyWith, type AddableFacet, type AddedTerm } from "@/lib/catalog/tags";
import type { Category, Product, ProductStatus } from "@/lib/catalog/types";
import { destroyImages } from "./cloudinary";

/**
 * The catalogue as the admin reads and writes it: every product whatever its
 * status, read fresh rather than from the shop's hour-long cache, because
 * staff must see what they just saved. A few dozen documents, so a list costs
 * a few dozen reads of the free tier's 50k a day.
 */

const products = () => db().collection("products");

export async function listProducts(): Promise<Product[]> {
  const snap = await products().get();
  return snap.docs.map((d) => productFromDoc(d.data())).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProductForEdit(slug: string): Promise<Product | null> {
  const doc = await products().doc(slug).get();
  return doc.exists ? productFromDoc(doc.data()!) : null;
}

export async function listCategories(): Promise<Category[]> {
  const snap = await db().collection("categories").orderBy("position").get();
  return snap.docs.map((d) => d.data() as Category);
}

/**
 * A new type (on one shelf) or occasion, stored in `terms` and from then on
 * offered in every editor and shown wherever the shop lists that facet. The
 * checks run again inside the transaction, so two staff adding the same name
 * at once get one term.
 */
export async function addTerm(facet: AddableFacet, label: string, category?: string): Promise<{ term: AddedTerm } | { error: string }> {
  if (!ADDABLE_FACETS.includes(facet)) return { error: "Only types and occasions can be added." };
  const clean = cleanTermLabel(label);
  return db().runTransaction(async (tx) => {
    const [terms, shelf] = await Promise.all([
      tx.get(TERMS_QUERY()),
      facet === "type" && category ? tx.get(db().collection("categories").doc(category)) : Promise.resolve(null),
    ]);
    if (facet === "type" && !shelf?.exists) return { error: "That shelf no longer exists. Reload and try again." };
    const vocab = vocabularyWith(terms.docs.map((d) => termFromDoc(d.data())));
    const problem = termProblem(vocab, facet, clean, category);
    if (problem) return { error: problem };
    const term: AddedTerm = { facet, value: termValue(clean), label: clean, ...(facet === "type" ? { category } : {}) };
    tx.create(db().collection("terms").doc(`${facet}:${term.value}`), { ...term, createdAt: Timestamp.now() });
    return { term };
  });
}

/** The values staff have already used for the free-typed tags, offered as suggestions. */
export function tagSuggestions(all: Product[]) {
  const values = (facet: "fits" | "holds" | "process") =>
    [...new Set(all.flatMap((p) => tagValues(p.tags, facet)))].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  return { pairings: [...new Set([...values("fits"), ...values("holds")])].sort((a, b) => a.localeCompare(b, "en", { numeric: true })), processes: values("process") };
}

export type SaveResult =
  | { ok: true; updatedAt: string; removedImages: number }
  | { ok: false; reason: "conflict" | "gone" | "invalid"; message: string };

/**
 * Writes a product, refusing when someone else saved it since the editor
 * opened it (`expectedUpdatedAt`), when a check fails, or when a code or SKU
 * belongs to another product. Photographs the save drops are destroyed after.
 */
export async function saveProduct(slug: string, expectedUpdatedAt: string, input: ProductDraft): Promise<SaveResult> {
  const vocab = await getVocabulary();
  let draft: ProductDraft;
  try {
    draft = cleanDraft(input, vocab);
  } catch (e) {
    return { ok: false, reason: "invalid", message: (e as Error).message };
  }
  const issues = issuesFor(draft, vocab);
  if (issues.length) return { ok: false, reason: "invalid", message: `${issues[0].message}.` };

  const ref = products().doc(slug);
  const now = Timestamp.now();
  try {
    const dropped = await db().runTransaction(async (tx) => {
      const [doc, all] = await Promise.all([tx.get(ref), tx.get(products())]);
      if (!doc.exists) throw new Refusal("gone", "This product has been removed or moved since you opened it.");
      const current = productFromDoc(doc.data()!);
      if (current.updatedAt !== expectedUpdatedAt)
        throw new Refusal("conflict", "Someone else saved this product after you opened it.");

      const clash = codeClash(all, [draft.code, ...draft.variants.map((v) => v.sku)], slug);
      if (clash) throw new Refusal("invalid", clash);

      // Picks keep only products that still exist, and never the product itself.
      const related = draft.related.filter((s) => s !== slug && all.docs.some((d) => d.id === s)).slice(0, LIMITS.related);
      tx.set(ref, { ...draft, related, priceRange: priceRange(draft.variants), updatedAt: now }, { merge: true });

      // Photographs no product will show once this is saved.
      const kept = new Set([
        ...draft.media.map((m) => m.publicId),
        ...all.docs.filter((d) => d.id !== slug).flatMap((d) => ((d.data() as Product).media ?? []).map((m) => m.publicId)),
      ]);
      return current.media.map((m) => m.publicId).filter((id) => !kept.has(id));
    });
    await destroyImages(dropped);
    return { ok: true, updatedAt: now.toDate().toISOString(), removedImages: dropped.length };
  } catch (e) {
    if (e instanceof Refusal) return { ok: false, reason: e.reason, message: e.message };
    throw e;
  }
}

class Refusal extends Error {
  constructor(
    readonly reason: "conflict" | "gone" | "invalid",
    message: string,
  ) {
    super(message);
  }
}

/** A refusal that names the form field it belongs to, so the form can mark it. */
export type FieldError = { error: string; field?: "name" | "code" | "categoryId" };

type Snapshot = FirebaseFirestore.QuerySnapshot;

/** The first slug from `base` that no product holds or used to hold. */
function freeSlug(all: Snapshot, base: string): string {
  const taken = new Set(all.docs.flatMap((d) => [d.id, ...((d.data() as Product).formerSlugs ?? [])]));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/**
 * "The code BM1 already belongs to “Beer Mug”." when any of the codes is another
 * product's code or the code of one of its prices, else undefined. `except` is the product's own slug.
 */
function codeClash(all: Snapshot, codes: string[], except?: string): string | undefined {
  for (const doc of all.docs) {
    if (doc.id === except) continue;
    const o = doc.data() as Product;
    const taken = codes.find((c) => c === o.code || o.variants?.some((v) => v.sku === c));
    if (taken) return `The code ${taken} already belongs to “${o.name}”.`;
  }
}

/** A new product, hidden until staff have given it what the shop needs. Returns its slug. */
export async function createProduct(input: { name: string; code: string; categoryId: string }): Promise<{ slug: string } | FieldError> {
  const name = input.name.trim();
  const code = normaliseCode(input.code);
  const nameIssue = nameProblem(name);
  if (nameIssue) return { error: `${nameIssue}.`, field: "name" };
  const codeIssue = codeProblem(code);
  if (codeIssue) return { error: `${codeIssue}.`, field: "code" };
  const base = slugFor(name);
  if (!base) return { error: "The name needs at least one plain letter or number for its web address.", field: "name" };
  if (!input.categoryId) return { error: "Choose a category.", field: "categoryId" };

  return db().runTransaction(async (tx) => {
    const [all, category] = await Promise.all([tx.get(products()), tx.get(db().collection("categories").doc(input.categoryId))]);
    if (!category.exists) return { error: "Choose a category.", field: "categoryId" as const };
    const clash = codeClash(all, [code]);
    if (clash) return { error: clash, field: "code" as const };

    const slug = freeSlug(all, base);

    const now = Timestamp.now();
    tx.create(products().doc(slug), {
      slug,
      code,
      name,
      categoryId: input.categoryId,
      status: "draft",
      description: "",
      specifications: [],
      careNotes: null,
      personalisation: null,
      shipping: null,
      tags: [],
      related: [],
      currency: "ZAR",
      options: [],
      variants: [{ sku: code, title: "Default", optionValues: {}, price: null }],
      priceRange: null,
      media: [],
      createdAt: now,
      updatedAt: now,
    });
    return { slug };
  });
}

/**
 * A hidden copy of a saved product under a new code, for a family of near-identical
 * products ("Photo Mug, Black Handle" from "Photo Mug, White Handle"). It takes
 * everything but the code, slug and Special badge; SKUs built from the old code
 * follow the new one. The photos are shared, not copied: a save only destroys a
 * photo no other product shows.
 */
export async function duplicateProduct(slug: string, input: string): Promise<{ slug: string } | { error: string }> {
  const code = normaliseCode(input);
  const codeIssue = codeProblem(code);
  if (codeIssue) return { error: code ? `${codeIssue}.` : "Give the copy its own product code." };

  return db().runTransaction(async (tx) => {
    // The whole catalogue is read for the clash checks, and the source is in it.
    const all = await tx.get(products());
    const doc = all.docs.find((d) => d.id === slug);
    if (!doc) return { error: "This product has been removed or moved since you opened it." };
    const source = productFromDoc(doc.data());
    const clash = codeClash(all, [code]);
    if (clash) return { error: clash };

    // A SKU that didn't start from the old code would clash with the original's, so it is renumbered.
    const used = new Set(all.docs.flatMap((d) => ((d.data() as Product).variants ?? []).map((v) => v.sku)));
    let n = 1;
    const variants = recodeVariants(source.code, code, source.variants).map((v) => {
      let sku = v.sku;
      while (used.has(sku)) sku = `${code}-${n++}`;
      used.add(sku);
      return { ...v, sku };
    });

    // Held to the name limit, so a copy of a long name still saves.
    const name = `${source.name.slice(0, LIMITS.name - " (copy)".length).trim()} (copy)`;
    const next = freeSlug(all, slugFor(name));
    const now = Timestamp.now();
    tx.create(products().doc(next), {
      ...toDraft(source),
      slug: next,
      code,
      name,
      status: "draft",
      currency: source.currency,
      variants,
      priceRange: priceRange(variants),
      createdAt: now,
      updatedAt: now,
    });
    return { slug: next };
  });
}

/** One product's status or Special badge, as the list changes them in bulk. */
export type VisibilityChange = { slug: string; status?: ProductStatus };

export type VisibilityResult = {
  /** What each changed product was before, ready to hand back to undo it. */
  before: VisibilityChange[];
  /** Left as they were: "“Photo Mug” needs a price". */
  skipped: string[];
};

/**
 * Sets the status or Special badge of several products in one write. A product
 * moved to In the shop must be ready for it, as a save from its editor
 * would be; one that isn't is skipped and named. Each one touched gets a new
 * `updatedAt`, so an editor open on it elsewhere is told before it saves.
 */
export async function setVisibility(changes: VisibilityChange[]): Promise<VisibilityResult> {
  if (changes.length === 0) return { before: [], skipped: [] };
  const vocab = changes.some((c) => c.status === "active") ? await getVocabulary() : null;
  return db().runTransaction(async (tx) => {
    const docs = await tx.getAll(...changes.map((c) => products().doc(c.slug)));
    const now = Timestamp.now();
    const result: VisibilityResult = { before: [], skipped: [] };
    docs.forEach((doc, i) => {
      const change = changes[i];
      if (!doc.exists) return result.skipped.push(`One product was removed or moved since the list loaded`);
      const p = productFromDoc(doc.data()!);
      // Only what actually changes, and what it was, for the undo.
      const patch: Partial<Pick<Product, "status">> = {};
      const before: VisibilityChange = { slug: p.slug };
      if (change.status !== undefined && change.status !== p.status) [patch.status, before.status] = [change.status, p.status];
      if (Object.keys(patch).length === 0) return;
      if (patch.status === "active") {
        const [issue] = readinessIssues(toDraft(p), vocab!);
        if (issue) return result.skipped.push(`“${p.name}” can’t show yet: ${issue.message.toLowerCase()}`);
      }
      result.before.push(before);
      tx.update(doc.ref, { ...patch, updatedAt: now });
    });
    return result;
  });
}

/**
 * Moves a product to a new web address. The document is keyed by its slug, so
 * it is copied to the new key and the old one removed; the old address is
 * kept in `formerSlugs` and the shop redirects it.
 */
export async function changeSlug(slug: string, next: string, expectedUpdatedAt: string): Promise<{ slug: string; updatedAt: string } | { error: string }> {
  if (!SLUG_PATTERN.test(next)) return { error: "Use lower-case letters, numbers and single hyphens only." };
  if (next.length > SLUG_MAX) return { error: `Keep the address to ${SLUG_MAX} characters.` };
  if (next === slug) return { error: "That is already its web address." };

  return db().runTransaction(async (tx) => {
    const [doc, all] = await Promise.all([tx.get(products().doc(slug)), tx.get(products())]);
    if (!doc.exists) return { error: "This product has been removed or moved since you opened it." };
    const current = doc.data() as Product & { updatedAt: Timestamp };
    if (current.updatedAt.toDate().toISOString() !== expectedUpdatedAt)
      return { error: "Someone else saved this product after you opened it. Reload first." };
    const owner = all.docs.find((d) => d.id === next || ((d.data() as Product).formerSlugs ?? []).includes(next));
    if (owner && owner.id !== slug) return { error: `That address is in use by “${(owner.data() as Product).name}”.` };

    const now = Timestamp.now();
    const formerSlugs = [...new Set([...(current.formerSlugs ?? []), slug])].filter((s) => s !== next);
    tx.create(products().doc(next), { ...current, slug: next, formerSlugs, updatedAt: now });
    tx.delete(doc.ref);
    return { slug: next, updatedAt: now.toDate().toISOString() };
  });
}
