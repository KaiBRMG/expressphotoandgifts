import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { productFromDoc } from "@/lib/catalog/queries";
import {
  blockingIssues,
  cleanDraft,
  priceRange,
  readinessIssues,
  SLUG_PATTERN,
  slugify,
  normaliseCode,
  type ProductDraft,
} from "@/lib/catalog/edit";
import { tagValues } from "@/lib/catalog/tags";
import type { Category, Product } from "@/lib/catalog/types";
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
  let draft: ProductDraft;
  try {
    draft = cleanDraft(input);
  } catch (e) {
    return { ok: false, reason: "invalid", message: (e as Error).message };
  }
  const issues = [...blockingIssues(draft), ...(draft.status === "active" ? readinessIssues(draft) : [])];
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

      for (const other of all.docs) {
        if (other.id === slug) continue;
        const o = other.data() as Product;
        if (o.code === draft.code) throw new Refusal("invalid", `The code ${draft.code} already belongs to “${o.name}”.`);
        const clash = draft.variants.find((v) => o.variants?.some((ov) => ov.sku === v.sku));
        if (clash) throw new Refusal("invalid", `The code ${clash.sku} already belongs to “${o.name}”.`);
      }

      tx.set(ref, { ...draft, priceRange: priceRange(draft.variants), updatedAt: now }, { merge: true });

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

/** A new product, hidden until staff have given it what the shop needs. Returns its slug. */
export async function createProduct(input: { name: string; code: string; categoryId: string }): Promise<{ slug: string } | { error: string }> {
  const name = input.name.trim();
  const code = normaliseCode(input.code);
  if (!name) return { error: "Give the product a name." };
  if (!code) return { error: "Give the product its shop code." };
  const base = slugify(name);
  if (!base) return { error: "The name needs at least one letter or number." };

  return db().runTransaction(async (tx) => {
    const [all, category] = await Promise.all([tx.get(products()), tx.get(db().collection("categories").doc(input.categoryId))]);
    if (!category.exists) return { error: "Choose a category." };
    const clash = all.docs.find((d) => (d.data() as Product).code === code);
    if (clash) return { error: `The code ${code} already belongs to “${(clash.data() as Product).name}”.` };

    const taken = new Set(all.docs.flatMap((d) => [d.id, ...((d.data() as Product).formerSlugs ?? [])]));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

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
      tags: [],
      special: false,
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
 * Moves a product to a new web address. The document is keyed by its slug, so
 * it is copied to the new key and the old one removed; the old address is
 * kept in `formerSlugs` and the shop redirects it.
 */
export async function changeSlug(slug: string, next: string, expectedUpdatedAt: string): Promise<{ slug: string; updatedAt: string } | { error: string }> {
  if (!SLUG_PATTERN.test(next)) return { error: "Use lower-case letters, numbers and single hyphens only." };
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
