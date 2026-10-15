import "server-only";

import { cache } from "react";

import { getCategories, getProducts } from "@/lib/catalog/queries";
import { toListings, type Listing } from "@/lib/catalog/listing";
import type { ChartSize } from "@/lib/catalog/purchase";
import { parseCm } from "@/lib/catalog/sizes";
import type { Product } from "@/lib/catalog/types";
import { CATEGORIES as HOME_TILES } from "@/app/site/data";

/**
 * A place under /shop: everything, a category, or the specials. `listings` is
 * empty for a category with nothing live yet, which renders as its honest
 * empty state rather than a 404, because the homepage links to it.
 */
export type Shelf = {
  slug: string;
  name: string;
  kind: "all" | "category" | "specials";
  listings: Listing[];
};

/** The rail's entry for a shelf. */
type RailItem = { slug: string; name: string; count: number };

const ALL_SLUG = "all";
const SPECIALS_SLUG = "specials";

/**
 * The catalogue as cards, built once per render: the storefront, a shelf, its
 * metadata, the rail and the search index all read the same list. Each card
 * carries its category's name, which search matches on.
 */
export const getListings = cache(async () => {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return toListings(products, new Map(categories.map((c) => [c.id, c.name])));
});

/**
 * Every slug /shop answers to: the Firestore categories, plus the homepage
 * tiles that have no category document yet (Cameras, Gift Wrapping), so a tile
 * never lands on a 404.
 */
export async function shelfSlugs(): Promise<string[]> {
  const categories = await getCategories();
  return [
    ...new Set([
      ALL_SLUG,
      SPECIALS_SLUG,
      ...categories.map((c) => c.id),
      ...HOME_TILES.map((t) => t.slug),
    ]),
  ];
}

function categoryName(slug: string, names: Map<string, string>): string | null {
  return names.get(slug) ?? HOME_TILES.find((t) => t.slug === slug)?.name ?? null;
}

export async function getShelf(slug: string): Promise<Shelf | null> {
  const [categories, listings] = await Promise.all([getCategories(), getListings()]);

  if (slug === ALL_SLUG) {
    return { slug, name: "All products", kind: "all", listings };
  }
  if (slug === SPECIALS_SLUG) {
    return { slug, name: "Specials", kind: "specials", listings: listings.filter((l) => l.special) };
  }
  const name = categoryName(slug, new Map(categories.map((c) => [c.id, c.name])));
  if (!name) return null;
  return {
    slug,
    name,
    kind: "category",
    listings: listings.filter((l) => l.categoryId === slug),
  };
}

/**
 * The rail: All, then every category in the shop's order that has something
 * live, then Specials when the shop has flagged anything. Shelves with nothing
 * to show are left off, so the rail never leads to an empty page.
 */
export async function getRail(): Promise<RailItem[]> {
  const [categories, listings] = await Promise.all([getCategories(), getListings()]);
  const count = (id: string) => listings.filter((l) => l.categoryId === id).length;
  const specials = listings.filter((l) => l.special).length;
  return [
    { slug: ALL_SLUG, name: "All products", count: listings.length },
    // In the shop's own order, which puts the photo gifts first.
    ...categories
      .map((c) => ({ slug: c.id, name: c.name, count: count(c.id) }))
      .filter((c) => c.count > 0),
    ...(specials > 0 ? [{ slug: SPECIALS_SLUG, name: "Specials", count: specials }] : []),
  ];
}

/**
 * The frames that share one size ladder, for the size chart. Found from the
 * data, not named: the largest group of frames whose Size options parse as
 * centimetres and whose sizes and prices are identical.
 */
type SizeFamily = { products: Product[]; sizes: ChartSize[] };

export function sizeFamily(products: Product[]): SizeFamily | null {
  const ladders = new Map<string, SizeFamily>();
  for (const p of products) {
    if (p.categoryId !== "frames") continue;
    const sizes = p.variants.flatMap((v): ChartSize[] => {
      const cm = parseCm(v.optionValues["Size"] ?? "");
      if (!cm || v.price === null) return [];
      return [{ label: `${cm.w} × ${cm.h} cm`, ...cm, price: v.price }];
    });
    if (sizes.length < 4 || sizes.length !== p.variants.length) continue;
    const key = sizes.map((s) => `${s.label}:${s.price}`).join("|");
    const group = ladders.get(key) ?? { products: [], sizes };
    group.products.push(p);
    ladders.set(key, group);
  }
  return [...ladders.values()].sort((a, b) => b.products.length - a.products.length)[0] ?? null;
}
