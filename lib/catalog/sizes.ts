/**
 * Sizes as the shop writes them. Free of imports, so the importer can run it
 * under plain Node as well as the site.
 */

/**
 * "20 × 30 cm", "10×10cm" and "A4 (20 × 30 cm)" all read as a 20-by-30 print,
 * short side first. Anything without centimetres ("A4" alone) does not parse.
 */
export function parseCm(value: string): { w: number; h: number } | null {
  const m = value.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*cm/i);
  if (!m) return null;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return { w: Math.min(a, b), h: Math.max(a, b) };
}

/**
 * An option value as a tag key: "A4" → "a4", "10×10cm" → "10x10cm",
 * "2 photos (½ prints)" → "2-photos-prints". Tags scoped to one choice name it
 * by a prefix of this key, e.g. "print:2-photos=10x7.5".
 */
export function optionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*×\s*/g, "x")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "29.7x21" → 29.7 wide by 21 high, as printed (not reordered). */
export function parseArea(value: string): { w: number; h: number } | null {
  const m = value.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

/** "20 × 30 cm": a size as the shop writes it. */
export const cmLabel = (s: { w: number; h: number }) => `${s.w} × ${s.h} cm`;
