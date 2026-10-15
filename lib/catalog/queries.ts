import "server-only";

import { unstable_cache } from "next/cache";
import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import type { PriceList } from "./cart";
import type { Category, Product } from "./types";

/** Tag for revalidateTag() after the catalogue changes in Firestore. */
export const CATALOG_TAG = "catalog";
const CACHE = { tags: [CATALOG_TAG], revalidate: 3600 };

/**
 * TEMPORARY, for testing: SHOW_UNPRICED=1 in .env.local also lists draft
 * (unpriced) products, as "Price on request". Remove once the shop has priced
 * them. Restart the dev server after changing it.
 */
export const SHOW_UNPRICED = process.env.SHOW_UNPRICED === "1";

/** A product document as the site reads it, filling fields older documents lack. */
export function productFromDoc(data: DocumentData): Product {
  return {
    ...data,
    tags: data.tags ?? [],
    // Absent from documents imported before it existed.
    personalisation: data.personalisation ?? null,
    // Written by the shop, not the importer, so older documents lack it.
    special: data.special === true,
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
    const products = db().collection("products");
    // A retired product never shows, even while testing with unpriced drafts.
    const snap = await (SHOW_UNPRICED
      ? products.where("status", "in", ["active", "draft"])
      : products.where("status", "==", "active")
    ).get();
    return snap.docs
      .map((doc) => productFromDoc(doc.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  ["catalog-products", SHOW_UNPRICED ? "with-unpriced" : "active"],
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
