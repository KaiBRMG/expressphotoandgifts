import { filterTags } from "./tags";
import type { Product } from "./types";

/**
 * What a product card needs and nothing more. The catalogue is filtered in the
 * browser, so every field here is shipped to it; descriptions, specifications
 * and dimension diagrams stay on the server for the product page.
 */
export type Listing = {
  slug: string;
  name: string;
  categoryId: string;
  /** The category's name, which search matches on. */
  category: string;
  /** Made with the customer's own photo. */
  personalisable: boolean;
  /** Only the shopper-facing tags ("type:", "occasion:", "for:"), for the catalogue's filters. */
  tags: string[];
  special: boolean;
  /** Cents; null for a product the shop has not priced. */
  min: number | null;
  max: number | null;
  /** The primary photograph's code under `products/` (what `ProductImage` takes), or null when the shop has not supplied one. */
  photo: string | null;
  /** e.g. "6 sizes", "3 colours"; null for a single-variant product. */
  hint: string | null;
  /** Index in the shop's own order, for the Featured sort. */
  rank: number;
};

/** Plural nouns for the options the catalogue uses. */
const OPTION_NOUNS: Record<string, [string, string]> = {
  Size: ["size", "sizes"],
  Colour: ["colour", "colours"],
  Background: ["background", "backgrounds"],
  Photos: ["photo layout", "photo layouts"],
  "Print sides": ["print option", "print options"],
};

/** The option with the most choices, said plainly: "6 sizes". */
function optionHint(product: Product): string | null {
  const widest = [...product.options].sort((a, b) => b.values.length - a.values.length)[0];
  if (!widest || widest.values.length < 2) return null;
  const [, plural] = OPTION_NOUNS[widest.name] ?? ["option", "options"];
  return `${widest.values.length} ${plural}`;
}

function toListing(product: Product, rank: number, category: string): Listing {
  return {
    slug: product.slug,
    name: product.name,
    categoryId: product.categoryId,
    category,
    personalisable: product.personalisation !== null,
    tags: filterTags(product.tags),
    special: product.special,
    min: product.priceRange?.min ?? null,
    max: product.priceRange?.max ?? null,
    photo: primaryPhoto(product),
    hint: optionHint(product),
    rank,
  };
}

/**
 * The shop's own running order: what takes a customer's photo first, because
 * that is what the shop is for, then cheapest first within each group.
 */
function featuredOrder(a: Product, b: Product): number {
  return (
    Number(b.personalisation !== null) - Number(a.personalisation !== null) ||
    (a.priceRange?.min ?? 0) - (b.priceRange?.min ?? 0)
  );
}

/** Cards in the shop's running order; `categoryNames` maps category ID to name. */
export function toListings(products: Product[], categoryNames: ReadonlyMap<string, string>): Listing[] {
  return [...products]
    .sort(featuredOrder)
    .map((p, rank) => toListing(p, rank, categoryNames.get(p.categoryId) ?? ""));
}

export const productHref = (slug: string) => `/shop/product/${slug}`;

/** A shelf, optionally filtered by one tag facet: "/shop/frames?type=easels". */
export const shelfHref = (shelf: string, facet?: string, value?: string) =>
  facet && value ? `/shop/${shelf}?${facet}=${value}` : `/shop/${shelf}`;

/** "R68", "R1 250", "R12,50": whole rands are written without cents, as the shop prices them. */
export function rands(cents: number): string {
  const whole = cents % 100 === 0;
  const value = (cents / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
  return `R${value}`;
}

/** `rands` with a true minus for money going out: "−R10", never "R-10". */
export const signedRands = (cents: number) => (cents < 0 ? `−${rands(-cents)}` : rands(cents));

/** "R75", or "from R68" when the variants differ. */
export function priceLabel(l: Pick<Listing, "min" | "max">): string {
  if (l.min === null) return "Price on request";
  return l.min === l.max ? rands(l.min) : `from ${rands(l.min)}`;
}

/**
 * The price bands the catalogue filters by, read off the range's own spread.
 * A product sits in the band of its lowest price: that is what "from" offers.
 */
export const PRICE_BANDS = [
  { id: "under-100", label: "Under R100", phrase: "under R100", test: (min: number | null) => min !== null && min < 10000 },
  { id: "100-200", label: "R100 to R200", phrase: "between R100 and R200", test: (min: number | null) => min !== null && min >= 10000 && min <= 20000 },
  { id: "over-200", label: "Over R200", phrase: "over R200", test: (min: number | null) => min !== null && min > 20000 },
] as const;

export type PriceBandId = (typeof PRICE_BANDS)[number]["id"];

export const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price, low to high" },
  { id: "price-desc", label: "Price, high to low" },
  { id: "name", label: "Name, A to Z" },
] as const;

export type SortId = (typeof SORTS)[number]["id"];

/** "1 item", "3 items": units in a cart or on an order. */
export function itemCount(n: number): string {
  return `${n} ${n === 1 ? "item" : "items"}`;
}

/** "1 photo", "3 photos". */
export function photoCount(n: number): string {
  return `${n} ${n === 1 ? "photo" : "photos"}`;
}

/** The Cloudinary code of a product's first photograph, as `ProductImage` takes it. */
export const primaryPhoto = (p: Pick<Product, "media">) =>
  photoCode(p.media.find((m) => m.role === "photo")?.publicId ?? "") || null;

/** "products/BM1" → "BM1": a photo's Cloudinary id as ProductImage takes it. */
export const photoCode = (publicId: string) => publicId.replace(/^products\//, "");

/** "1 product", "16 products". */
export function productCount(n: number): string {
  return `${n} ${n === 1 ? "product" : "products"}`;
}
