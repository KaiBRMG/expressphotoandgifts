import "server-only";

import { unstable_cache } from "next/cache";
import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import type { PriceList } from "./cart";
import { cleanMeasurements } from "./measures";
import { vocabularyWith, type AddedTerm, type Vocabulary } from "./tags";
import type { Category, Product } from "./types";

/** Tag for revalidateTag() after the catalogue changes in Firestore. */
export const CATALOG_TAG = "catalog";
const CACHE = { tags: [CATALOG_TAG], revalidate: 3600 };

/** A product document as the site reads it, filling fields older documents lack. */
export function productFromDoc(data: DocumentData): Product {
  return {
    ...data,
    tags: data.tags ?? [],
    // Absent from documents imported before it existed.
    personalisation: data.personalisation ?? null,
    // Measured in the admin; older documents have none.
    shipping: cleanMeasurements(data.shipping),
    // Picked in the admin; older documents have none.
    related: Array.isArray(data.related) ? data.related : [],
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
  } as Product;
}

/**
 * The whole active catalogue is a few dozen documents, so it is read once and
 * cached for an hour rather than queried per page — Firestore's free tier
 * allows 50k reads a day.
 */
const getActiveProducts = unstable_cache(
  async (): Promise<Product[]> => {
    // Only what staff put in the shop: hidden and retired products never show.
    const snap = await db().collection("products").where("status", "==", "active").get();
    return snap.docs
      .map((doc) => productFromDoc(doc.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  ["catalog-products", "active"],
  CACHE,
);

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const snap = await db().collection("categories").orderBy("position").get();
    return snap.docs.map((doc) => doc.data() as Category);
  },
  ["catalog-categories"],
  CACHE,
);

/** An added term as stored in `terms`, without its timestamp. */
export function termFromDoc(data: DocumentData): AddedTerm {
  const { facet, value, label, category } = data;
  return category ? { facet, value, label, category } : { facet, value, label };
}

/** Added terms oldest first, so each facet keeps the order they were added in. */
export const TERMS_QUERY = () => db().collection("terms").orderBy("createdAt");

/**
 * The shop's vocabulary: the built-in terms and the added ones. Cached with
 * the catalogue; adding a term clears the cache, so the admin reads it too.
 */
export const getVocabulary = unstable_cache(
  async (): Promise<Vocabulary> => vocabularyWith((await TERMS_QUERY().get()).docs.map((d) => termFromDoc(d.data()))),
  ["catalog-vocabulary"],
  CACHE,
);

export async function getProducts(categoryId?: string): Promise<Product[]> {
  const products = await getActiveProducts();
  return categoryId ? products.filter((p) => p.categoryId === categoryId) : products;
}

/** Every variant on sale and its price in cents, keyed by SKU. */
export async function getPriceList(): Promise<PriceList> {
  return Object.fromEntries((await getActiveProducts()).flatMap((p) => p.variants.map((v) => [v.sku, v.price])));
}

export async function getProduct(slug: string): Promise<Product | null> {
  return (await getActiveProducts()).find((p) => p.slug === slug) ?? null;
}

/**
 * The product a retired web address now belongs to, for a permanent redirect
 * after staff change a product's address in the admin.
 */
export async function getMovedProduct(slug: string): Promise<Product | null> {
  return (await getActiveProducts()).find((p) => p.formerSlugs?.includes(slug)) ?? null;
}
