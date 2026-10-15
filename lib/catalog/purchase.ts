import { rands } from "./listing";
import { photosFor } from "./photos";
import { parseCm } from "./sizes";
import type { Product, ProductVariant } from "./types";

/**
 * What the product page's buy column needs, and all it ships to the browser:
 * the choices, the variants they resolve to, and what the customer supplies.
 */
export type PurchaseItem = Pick<Product, "name" | "personalisation" | "options" | "variants" | "tags">;

/** A size the chart can draw: its label as the shop writes it, in centimetres, and its price. */
export type ChartSize = { label: string; w: number; h: number; price: number | null };

/** The most a customer can order in one go here; past this it is a bulk enquiry. */
export const MAX_QUANTITY = 99;

/** A typed or stepped quantity, held to 1…MAX_QUANTITY. */
export const clampQuantity = (n: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(n) || 1));

/**
 * The sizes to draw to scale, when the product's only choice is a size and
 * every size is given in centimetres; otherwise null, and the sizes are pills.
 */
export function chartSizes(item: PurchaseItem): ChartSize[] | null {
  const [option, ...rest] = item.options;
  if (!option || rest.length > 0 || option.name !== "Size" || option.values.length < 2) return null;
  const sizes = option.values.map((label) => {
    const cm = parseCm(label);
    const variant = item.variants.find((v) => v.optionValues[option.name] === label);
    return cm ? { label, ...cm, price: variant?.price ?? null } : null;
  });
  return sizes.every((s) => s !== null) ? sizes : null;
}

/**
 * The variant a choice lands on: the one matching every current choice with
 * this one changed, or failing that the first carrying this value.
 */
export function pickVariant(
  variants: ProductVariant[],
  current: ProductVariant,
  option: string,
  value: string,
): ProductVariant | null {
  const want = { ...current.optionValues, [option]: value };
  return (
    variants.find((v) => Object.entries(want).every(([k, x]) => v.optionValues[k] === x)) ??
    variants.find((v) => v.optionValues[option] === value) ??
    null
  );
}

/** True when the option's values carry different prices, so each pill should name its own. */
export function pricesDiffer(variants: ProductVariant[], option: string): boolean {
  const byValue = new Map<string, number | null>();
  for (const v of variants) byValue.set(v.optionValues[option], v.price);
  return new Set(byValue.values()).size > 1;
}

/** "Takes your photo", "Takes 4 of your photos", "Takes your photos and words". */
export function takesLine(item: PurchaseItem, variant: ProductVariant): string | null {
  if (!item.personalisation) return null;
  const n = photosFor(item, variant);
  const photos = n === null || n === 1 ? "your photo" : `${n} of your photos`;
  return item.personalisation.text ? `Takes ${photos}, and your words if you like` : `Takes ${photos}`;
}

/** "20 × 30 cm", "Navy", or null for a product with no choices. */
export function variantLabel(item: PurchaseItem, variant: ProductVariant): string | null {
  return item.options.length > 0 ? variant.title : null;
}

/** "Coffee Mug (1 photo)", or the name alone for a product with no choices: one item on an order. */
export const orderWhat = (name: string, variant: string | null) => (variant ? `${name} (${variant})` : name);

/**
 * The order as the shop would write it on the counter slip, ready to send on
 * WhatsApp: what, which, how many, at what price, and the code to find it by.
 */
export function orderMessage(item: PurchaseItem, variant: ProductVariant, quantity: number): string {
  const what = orderWhat(item.name, variantLabel(item, variant));
  const each = variant.price !== null ? `, ${rands(variant.price)} each` : "";
  const lines = [`Hi! I'd like to order ${quantity} × ${what}${each}.`, `Product code: ${variant.sku}.`];
  if (variant.price === null) lines.push("Could you tell me the price?");
  if (item.personalisation) {
    const photos = photosFor(item, variant);
    lines.push(photos === 1 ? "I'll send my photo in this chat." : "I'll send my photos in this chat.");
  }
  return lines.join("\n");
}
