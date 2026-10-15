/**
 * Editing a product in the admin: what can be changed, how variants follow
 * from options, and what must be true before a product shows in the shop.
 *
 * Shared by the editor in the browser (live checks, the save bar) and the
 * server action that writes it (the same checks, enforced), so it holds no
 * secrets and no server imports.
 */
import { optionKey } from "./sizes";
import { findTerm, isKnownFilterTag, tagValues, type Facet } from "./tags";
import type { Product, ProductOption, ProductVariant } from "./types";

/** Everything staff edit. Slug, timestamps and the price range are not typed by hand. */
export type ProductDraft = Pick<
  Product,
  | "name"
  | "code"
  | "categoryId"
  | "status"
  | "special"
  | "description"
  | "specifications"
  | "careNotes"
  | "personalisation"
  | "tags"
  | "options"
  | "variants"
  | "media"
>;

export function toDraft(p: Product): ProductDraft {
  return {
    name: p.name,
    code: p.code,
    categoryId: p.categoryId,
    status: p.status,
    special: p.special,
    description: p.description,
    specifications: p.specifications,
    careNotes: p.careNotes,
    personalisation: p.personalisation,
    tags: p.tags,
    options: p.options,
    variants: p.variants,
    media: p.media,
  };
}

/** A status as staff say it. */
export const STATUS_LABELS: Record<Product["status"], string> = {
  active: "Showing in shop",
  draft: "Hidden",
  archived: "Retired",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export const TABS = [
  { id: "details", label: "Details" },
  { id: "photos", label: "Photos" },
  { id: "prices", label: "Sizes & prices" },
  { id: "customer", label: "Customer’s photo" },
  { id: "filters", label: "Shop filters" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/** The tags the Customer's photo tab owns; every other tag is a shop filter or "goes with". */
const CUSTOMER_FACETS: Facet[] = ["photos", "print", "shape"];
export const isCustomerTag = (t: string) => CUSTOMER_FACETS.some((f) => t.startsWith(`${f}:`));

/** The slice of a draft each tab edits, for counting what changed where. */
const SECTIONS: Record<TabId | "visibility", (d: ProductDraft) => unknown> = {
  visibility: (d) => [d.status, d.special],
  details: (d) => [d.name, d.code, d.categoryId, d.description, d.specifications, d.careNotes],
  photos: (d) => d.media,
  prices: (d) => [d.options, d.variants],
  customer: (d) => [d.personalisation, d.tags.filter(isCustomerTag)],
  filters: (d) => d.tags.filter((t) => !isCustomerTag(t)),
};

/** The sections whose contents differ between two drafts. */
export function changedSections(a: ProductDraft, b: ProductDraft): (TabId | "visibility")[] {
  return (Object.keys(SECTIONS) as (TabId | "visibility")[]).filter(
    (k) => JSON.stringify(SECTIONS[k](a)) !== JSON.stringify(SECTIONS[k](b)),
  );
}

// ─── Names and codes ──────────────────────────────────────────────────────────

/** "Photo Mug (Black)" → "photo-mug-black", as the importer writes them. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s*×\s*/g, "x")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The shop's codes are letters and digits: "BM1", "KA24". */
export const normaliseCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** "A4 (20 × 30 cm)" → "A4": one choice's part of a SKU, as the importer writes it. */
const skuPart = (s: string) =>
  s
    .replace(/\s*\(.*\)$/, "")
    .toUpperCase()
    .replace(/×/g, "X")
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 16);

// ─── Options and variants ─────────────────────────────────────────────────────

/** Every combination of the options' values; one empty combination when there are none. */
function combinations(options: ProductOption[]): Record<string, string>[] {
  return options.reduce<Record<string, string>[]>(
    (acc, o) => acc.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v }))),
    [{}],
  );
}

export const variantTitle = (options: ProductOption[], values: Record<string, string>) =>
  options.length === 0 ? "Default" : options.map((o) => values[o.name]).join(" / ");

const covers = (a: Record<string, string>, b: Record<string, string>) =>
  Object.entries(b).every(([k, v]) => a[k] === v);

/**
 * The variants for a set of options: one per combination, in the options'
 * order. A combination that existed keeps its SKU and price, so carts and
 * orders still recognise it. A new one takes the price of the variant it grew
 * from (a size that gains a colour keeps its price) and a fresh SKU.
 */
export function rebuildVariants(code: string, all: ProductOption[], previous: ProductVariant[]): ProductVariant[] {
  // A choice still waiting for its first value is left out until it has one,
  // so adding it does not wipe the prices already typed.
  const options = all.filter((o) => o.values.length > 0);
  const used = new Set<string>();
  return combinations(options).map((values) => {
    const title = variantTitle(options, values);
    const same = previous.find((v) => covers(v.optionValues, values) && covers(values, v.optionValues));
    if (same && !used.has(same.sku)) {
      used.add(same.sku);
      return { ...same, title, optionValues: values };
    }
    const grewFrom = previous.find((v) => covers(values, v.optionValues) || covers(v.optionValues, values));
    const base = [code, ...options.map((o) => skuPart(values[o.name]))].join("-");
    let sku = base;
    for (let n = 2; used.has(sku) || previous.some((v) => v.sku === sku); n++) sku = `${base}-${n}`;
    used.add(sku);
    return { sku, title, optionValues: values, price: grewFrom?.price ?? null };
  });
}

/** A new code reaches every SKU that was built from the old one. */
export function recodeVariants(oldCode: string, newCode: string, variants: ProductVariant[]): ProductVariant[] {
  if (!oldCode || oldCode === newCode) return variants;
  return variants.map((v) =>
    v.sku === oldCode || v.sku.startsWith(`${oldCode}-`) ? { ...v, sku: newCode + v.sku.slice(oldCode.length) } : v,
  );
}

export function priceRange(variants: ProductVariant[]): Product["priceRange"] {
  const prices = variants.flatMap((v) => (v.price === null ? [] : [v.price]));
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
}

// ─── Customer's photo ─────────────────────────────────────────────────────────

/** The option values a scoped "print:" tag can name, keyed as tags write them. */
export const choiceKey = optionKey;

/** "20x30" → "20 × 30 cm", "easel" → "Easel", "tile-10x10" → "Tile 10x10". */
export function pairingLabel(value: string): string {
  const size = value.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (size) return `${size[1]} × ${size[2]} cm`;
  const words = value.replace(/-/g, " ");
  return words[0].toUpperCase() + words.slice(1);
}

/** "20 × 30 cm", "20x30cm", "Easel" → "20x30", "easel". */
export const pairingKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s*cm\b/g, "")
    .replace(/\s*[×x]\s*/g, "x")
    .replace(/[^a-z0-9.x]+/g, "-")
    .replace(/^-|-$/g, "");

// ─── Checks ───────────────────────────────────────────────────────────────────

export type Issue = {
  tab: TabId;
  /** The id of the control to focus when the issue is followed. */
  field: string;
  message: string;
};

/** What would make the saved product wrong, whatever its status. Nothing saves until these are fixed. */
export function blockingIssues(d: ProductDraft): Issue[] {
  const issues: Issue[] = [];
  if (!d.name.trim()) issues.push({ tab: "details", field: "field-name", message: "Give the product a name" });
  if (!d.code) issues.push({ tab: "details", field: "field-code", message: "Give the product its shop code" });

  const names = d.options.map((o) => o.name.trim().toLowerCase());
  d.options.forEach((o, i) => {
    if (!o.name.trim()) issues.push({ tab: "prices", field: `option-${i}-name`, message: `Name choice ${i + 1}, e.g. Size or Colour` });
    else if (names.indexOf(o.name.trim().toLowerCase()) !== i)
      issues.push({ tab: "prices", field: `option-${i}-name`, message: `There are two choices called “${o.name}”` });
    if (o.values.length === 0)
      issues.push({ tab: "prices", field: `option-${i}-values`, message: `Add at least one ${o.name.trim() ? `“${o.name}”` : "choice"} value` });
  });

  const skus = d.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) issues.push({ tab: "prices", field: "prices-grid", message: "Two lines in the price list share a code" });
  if (d.variants.some((v) => v.price !== null && (!Number.isFinite(v.price) || v.price < 0)))
    issues.push({ tab: "prices", field: "prices-grid", message: "A price is below zero" });

  if (d.media.some((m) => !m.alt.trim()))
    issues.push({ tab: "photos", field: "photos-list", message: "Describe every photo for people who can’t see it" });
  return issues;
}

/** What a product needs before it can show in the shop. */
export function readinessIssues(d: ProductDraft): Issue[] {
  const issues: Issue[] = [];
  if (!d.variants.some((v) => v.price !== null))
    issues.push({ tab: "prices", field: "prices-grid", message: "Set at least one price" });
  if (!d.media.some((m) => m.role === "photo"))
    issues.push({ tab: "photos", field: "photos-add", message: "Add a main photo" });
  const [type] = tagValues(d.tags, "type");
  if (!type || findTerm("type", type)?.category !== d.categoryId)
    issues.push({ tab: "filters", field: "filter-type", message: "Choose what type of product it is" });
  if (d.personalisation && tagValues(d.tags, "photos").length === 0)
    issues.push({ tab: "customer", field: "customer-count", message: "Say how many photos the customer sends" });
  return issues;
}

export const issuesFor = (d: ProductDraft) => [
  ...blockingIssues(d),
  ...(d.status === "active" ? readinessIssues(d) : []),
];

/**
 * A draft as it may be stored: text trimmed, codes normalised, tags limited to
 * the vocabulary (a type only of its own category), variants checked against
 * the options. Throws on anything the editor could not have produced.
 */
export function cleanDraft(d: ProductDraft): ProductDraft {
  const options = d.options.map((o) => ({
    name: o.name.trim(),
    values: [...new Set(o.values.map((v) => v.trim()).filter(Boolean))],
  }));
  // Every variant is one combination of the options' values, and no two are the same one.
  const valuesOf = (v: ProductVariant) =>
    Object.fromEntries(d.options.map((o, i) => [options[i].name, v.optionValues[o.name]?.trim() ?? ""]));
  const fits = (v: ProductVariant) =>
    Object.keys(v.optionValues).length === options.length &&
    options.every((o) => o.values.includes(valuesOf(v)[o.name]));
  if (
    d.variants.length === 0 ||
    !d.variants.every(fits) ||
    new Set(d.variants.map((v) => JSON.stringify(valuesOf(v)))).size !== d.variants.length
  )
    throw new Error("The sizes and prices don’t match the choices. Reload and try again.");

  const tags = [...new Set(d.tags.map((t) => t.trim()))].filter((t) => {
    const [facet, value] = t.split(":");
    if (!value) return false;
    if (facet === "type") return findTerm("type", value)?.category === d.categoryId;
    if (facet === "occasion" || facet === "for") return isKnownFilterTag(t);
    return ["process", "fits", "holds", "photos", "print", "shape"].includes(facet);
  });

  return {
    name: d.name.trim(),
    code: normaliseCode(d.code),
    categoryId: d.categoryId,
    status: d.status,
    special: d.special === true,
    description: d.description.trim(),
    specifications: d.specifications.map((s) => s.trim()).filter(Boolean),
    careNotes: d.careNotes?.trim() || null,
    personalisation: d.personalisation ? { kind: d.personalisation.kind, text: d.personalisation.text === true } : null,
    tags: d.personalisation ? tags : tags.filter((t) => !isCustomerTag(t)),
    options,
    variants: d.variants.map((v) => {
      const values = valuesOf(v);
      return { sku: v.sku, title: variantTitle(options, values), optionValues: values, price: v.price === null ? null : Math.round(v.price) };
    }),
    media: d.media.map((m) => ({ ...m, alt: m.alt.trim() })),
  };
}
