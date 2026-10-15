/**
 * What a personalised product needs from the customer's photos, per variant,
 * read from its "photos:", "print:" and "shape:" tags. Imports carry their
 * extension, so the importer can run it under plain Node to check every
 * variant resolves, as the site does.
 */
import { optionKey, parseArea } from "./sizes.ts";
import { PHOTO_SHAPES, tagValues, type PhotoShape } from "./tags.ts";
import type { Product, ProductVariant } from "./types";

type Tagged = Pick<Product, "tags">;

/** The variant's choices as tag keys: ["a4"], ["2-photos-prints", "colour"]. */
const choiceKeys = (variant: ProductVariant) => Object.values(variant.optionValues).map(optionKey);

/**
 * The tag values that apply to this variant: those scoped to one of its
 * choices ("a4=29.7x21" on the A4 puzzle) if any are, otherwise the unscoped
 * ones, which hold for every variant.
 */
function forVariant(values: string[], variant: ProductVariant): string[] {
  const keys = choiceKeys(variant);
  const scoped = values.flatMap((v) => {
    const [when, value] = v.split("=");
    return value !== undefined && keys.some((k) => k.startsWith(when)) ? [value] : [];
  });
  return scoped.length > 0 ? scoped : values.filter((v) => !v.includes("="));
}

/**
 * Photos the customer sends for this variant, from the product's "photos:"
 * tags: its one count, or where it takes several, the one its choice names
 * ("2 photos", "4 photos (¼ prints)"). Null when it takes no photo.
 */
export function photosFor(item: Tagged, variant: ProductVariant): number | null {
  const counts = tagValues(item.tags, "photos").map(Number);
  if (counts.length <= 1) return counts[0] ?? null;
  const keys = choiceKeys(variant);
  return counts.find((n) => keys.some((k) => k.startsWith(`${n}-photo`))) ?? counts[0];
}

/**
 * What one variant needs from the customer: how many photos, the area in cm
 * each is printed at (width first, so its orientation too), and the outline
 * it is cropped to. Null for a product that takes no photo. For the upload
 * step: the crop frame's aspect ratio, and at 300 dpi the pixels a photo
 * needs to print sharply.
 */
export type PhotoSpec = { photos: number; print: { w: number; h: number } | null; shape: PhotoShape };

export function photoSpec(item: Tagged, variant: ProductVariant): PhotoSpec | null {
  const photos = photosFor(item, variant);
  if (photos === null) return null;
  const [area] = forVariant(tagValues(item.tags, "print"), variant);
  const [shape] = tagValues(item.tags, "shape");
  return {
    photos,
    print: area ? parseArea(area) : null,
    shape: PHOTO_SHAPES.find((s) => s === shape) ?? "rect",
  };
}
