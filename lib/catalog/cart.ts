import { clampQuantity, takesLine, variantLabel, type PurchaseItem } from "./purchase";
import { maxFor, type Availability } from "./stock";
import type { ProductVariant } from "./types";

/**
 * One line of the cart: a variant and how many, with what the drawer shows
 * and the order message needs written down at the moment it was added, so the
 * cart can be drawn without the catalogue. The price is re-checked against the
 * catalogue each time the drawer opens (`reprice`).
 */
export type CartLine = {
  sku: string;
  slug: string;
  name: string;
  /** "20 × 30 cm", or null for a product with no choices. */
  variant: string | null;
  /** Price in cents, VAT inclusive. */
  price: number;
  quantity: number;
  /** The Cloudinary code of the product's first photograph. */
  photo: string | null;
  /** "Takes your photo", or null when the customer supplies nothing. */
  takes: string | null;
};

/** The catalogue's current price for every variant on sale, keyed by SKU. */
export type PriceList = Record<string, number | null>;

/** Builds the line a product page adds, for a variant with a price. */
export function toLine(
  item: PurchaseItem,
  variant: ProductVariant,
  price: number,
  quantity: number,
  slug: string,
  photo: string | null,
): CartLine {
  return {
    sku: variant.sku,
    slug,
    name: item.name,
    variant: variantLabel(item, variant),
    price,
    quantity,
    photo,
    takes: takesLine(item, variant),
  };
}

/**
 * Lines the shop can still sell. Until a price list has been fetched, all of
 * them; after, a variant that is gone or has lost its price is left out, and
 * so is one that has sold out.
 */
export const liveLines = (lines: CartLine[], prices: PriceList | null, available?: Availability | null) =>
  lines.filter((l) => (!prices || prices[l.sku] != null) && maxFor(available, l.sku) !== 0);

/** The most a line can have now, when it asks for more than that; null when it fits. */
export function overStock(line: Pick<CartLine, "sku" | "quantity">, available: Availability | null | undefined): number | null {
  const max = maxFor(available, line.sku);
  return max !== null && max > 0 && line.quantity > max ? max : null;
}

/** Units, not lines: two mugs and a frame are 3. */
export const cartUnits = (lines: Pick<CartLine, "quantity">[]) => lines.reduce((n, l) => n + l.quantity, 0);

export const cartSubtotal = (lines: Pick<CartLine, "price" | "quantity">[]) => lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

/** "3", or "99+" once the count would crowd the pill. */
export const unitsLabel = (units: number) => (units > 99 ? "99+" : String(units));

/** Adds a line, merging into one already holding the same variant. */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const at = lines.findIndex((l) => l.sku === line.sku);
  if (at === -1) return [...lines, { ...line, quantity: clampQuantity(line.quantity) }];
  const merged = { ...line, quantity: clampQuantity(lines[at].quantity + line.quantity) };
  return lines.map((l, i) => (i === at ? merged : l));
}

/**
 * Brings each line's price in line with the catalogue, returning the lines
 * (the same array when nothing moved) and the old price of each that changed.
 * A variant no longer on sale keeps its line; `liveLines` leaves it out.
 */
export function reprice(lines: CartLine[], prices: PriceList) {
  const was: Record<string, number> = {};
  const next = lines.map((l) => {
    const now = prices[l.sku];
    if (now == null || now === l.price) return l;
    was[l.sku] = l.price;
    return { ...l, price: now };
  });
  return { lines: Object.keys(was).length > 0 ? next : lines, was };
}
