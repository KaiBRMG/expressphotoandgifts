/**
 * A product's size and weight, packed, as staff enter it and the packer reads
 * it (`lib/checkout/packing.ts`). Shared by the editor in the browser and the
 * server. No secrets.
 */
import type { Measure, Measurements, Product } from "./types";

export const MEASURES: readonly Measure[] = ["length", "width", "height", "weight"];

/** The most a packed item can measure: no parcel the courier takes is longer or heavier. */
export const MEASURE_LIMITS: Record<Measure, { min: number; max: number; places: number }> = {
  length: { min: 0.1, max: 200, places: 1 },
  width: { min: 0.1, max: 200, places: 1 },
  height: { min: 0.1, max: 200, places: 1 },
  weight: { min: 0.001, max: 30, places: 3 },
};

/** A packed item's size and weight, all four known. */
export type Size = Record<Measure, number>;

const NO_MEASUREMENTS: Measurements = { length: null, width: null, height: null, weight: null, estimated: [] };

/** One measure as it may be stored: in range and rounded, or null. */
function cleanMeasure(m: Measure, x: unknown): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  const { min, max, places } = MEASURE_LIMITS[m];
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10 ** places) / 10 ** places : null;
}

/** Measurements as they may be stored, or null when none is set. Only a measure that is set can be estimated. */
export function cleanMeasurements(x: unknown): Measurements | null {
  if (!x || typeof x !== "object") return null;
  const raw = x as Partial<Measurements>;
  const out = { ...NO_MEASUREMENTS };
  for (const m of MEASURES) out[m] = cleanMeasure(m, raw[m]);
  const estimated = Array.isArray(raw.estimated) ? raw.estimated : [];
  out.estimated = MEASURES.filter((m) => out[m] !== null && estimated.includes(m));
  return MEASURES.some((m) => out[m] !== null) ? out : null;
}

/** Why a measure can't be saved, or null. Empty is allowed. */
export function measureProblem(m: Measure, x: number | null): string | null {
  if (x === null) return null;
  const { min, max } = MEASURE_LIMITS[m];
  if (!Number.isFinite(x) || x < min || x > max) return m === "weight" ? `A weight is up to ${max} kg` : `Each side is up to ${max} cm`;
  return null;
}

/**
 * What one of a product's variants measures, packed: each measure the
 * variant sets, otherwise the product's. Null unless all four are known.
 */
export function sizeOf(p: Pick<Product, "shipping" | "variants">, sku: string): Size | null {
  const own = p.variants.find((v) => v.sku === sku)?.shipping;
  const size = {} as Size;
  for (const m of MEASURES) {
    const n = own?.[m] ?? p.shipping?.[m] ?? null;
    if (n === null) return null;
    size[m] = n;
  }
  return size;
}

/** Measurements with one measure set by staff: no longer estimated. */
export function withMeasure(s: Measurements | null | undefined, m: Measure, value: number | null): Measurements {
  const base = s ?? NO_MEASUREMENTS;
  return { ...base, [m]: value, estimated: base.estimated.filter((e) => e !== m) };
}
