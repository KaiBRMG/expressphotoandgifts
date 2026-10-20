/**
 * Editing a product in the admin: what can be changed, how variants follow
 * from options, and what must be true before a product shows in the shop.
 *
 * Shared by the editor in the browser (live checks, the save bar) and the
 * server action that writes it (the same checks, enforced), so it holds no
 * secrets and no server imports.
 */
import { optionKey, parseArea } from "./sizes";
import { photoCount } from "./listing";
import { findTerm, hasFacet, isKnownFilterTag, tagValues, type Facet, type Vocabulary } from "./tags";
import type { Product, ProductOption, ProductVariant } from "./types";

/** Everything staff edit. Slug, timestamps and the price range are not typed by hand. */
export type ProductDraft = Pick<
  Product,
  | "name"
  | "code"
  | "categoryId"
  | "status"
  | "special"
  | "related"
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
    related: p.related,
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
  active: "In the shop",
  draft: "Hidden",
  archived: "Retired",
};

/** Every status, in the order staff are offered them. */
export const STATUSES = Object.keys(STATUS_LABELS) as Product["status"][];

// ─── Tabs ─────────────────────────────────────────────────────────────────────

/**
 * The editor's tabs, in the order a shopper meets the product: on a shelf,
 * its photos, its page, what it costs, then checkout. Each tab holds exactly
 * the fields that change that part of the shop.
 */
export const TABS = [
  { id: "shelf", label: "On the shelf" },
  { id: "photos", label: "Photos" },
  { id: "page", label: "Product page" },
  { id: "prices", label: "Sizes & prices" },
  { id: "checkout", label: "Checkout" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/** Tab names from before the editor followed the shop, so old links still open the right tab. */
export const OLD_TABS: Record<string, TabId> = { details: "page", customer: "checkout", filters: "shelf" };

/**
 * Where a field lives in the editor: one of the tabs, or the shop's own
 * records under them (codes and the web address), which shoppers don't meet.
 */
export type Place = TabId | "records";

/** The tags each place owns. */
const CHECKOUT_FACETS: Facet[] = ["photos", "print", "shape"];
export const isCustomerTag = (t: string) => hasFacet(t, CHECKOUT_FACETS);
const facetsOf = (d: ProductDraft, facets: Facet[]) => d.tags.filter((t) => hasFacet(t, facets));

/** The slice of a draft each place edits, for counting what changed where. */
const SECTIONS: Record<Place | "visibility", (d: ProductDraft) => unknown> = {
  visibility: (d) => d.status,
  shelf: (d) => [d.categoryId, d.special, facetsOf(d, ["type", "occasion", "for"])],
  photos: (d) => d.media,
  page: (d) => [d.name, d.description, d.specifications, d.careNotes, d.related, facetsOf(d, ["holds", "fits"])],
  prices: (d) => [d.options, d.variants],
  checkout: (d) => [d.personalisation, d.tags.filter(isCustomerTag)],
  records: (d) => [d.code, facetsOf(d, ["process"])],
};

/** The sections whose contents differ between two drafts. */
export function changedSections(a: ProductDraft, b: ProductDraft): (Place | "visibility")[] {
  return (Object.keys(SECTIONS) as (Place | "visibility")[]).filter(
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

/** The longest web address a product takes after /shop/product/. */
export const SLUG_MAX = 80;

/** A name's web address, held to SLUG_MAX without a trailing hyphen. */
export const slugFor = (name: string) => slugify(name).slice(0, SLUG_MAX).replace(/-$/, "");

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

/** One price that a save would change; `jump` when it more than doubles or falls under half, the shape of a typo. */
export type PriceChange = { title: string; from: number | null; to: number | null; jump: boolean };

/** Every price that differs between two drafts, matched by SKU. */
export function priceChanges(before: ProductDraft, after: ProductDraft): PriceChange[] {
  return after.variants.flatMap((v) => {
    const from = before.variants.find((b) => b.sku === v.sku)?.price ?? null;
    if (from === v.price) return [];
    const jump = from !== null && v.price !== null && (v.price * 2 < from || v.price > from * 2);
    return [{ title: v.title, from, to: v.price, jump }];
  });
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

/**
 * What the shop's cards, pages and orders have room for. The editor holds
 * typing to these and says so; a save is refused past them, whoever sent it.
 * Generous next to the catalogue as imported (names under 40 characters,
 * prices under R400), so they catch slips, not real products.
 */
export const LIMITS = {
  name: 120,
  code: 12,
  description: 2000,
  spec: 120,
  specs: 20,
  care: 500,
  options: 3,
  optionName: 30,
  choice: 40,
  choices: 30,
  /** Price lines: every combination of the options' choices. */
  variants: 120,
  /** In cents: R100 000. */
  price: 10_000_000,
  alt: 150,
  media: 15,
  photoCounts: 8,
  photos: 48,
  /** Printed sizes, in cm. */
  printMin: 0.5,
  printMax: 200,
  pairing: 30,
  pairings: 20,
  /** Products picked for "Goes with this". */
  related: 8,
  process: 30,
  processes: 5,
} as const;

export type Issue = {
  tab: Place;
  /** The id of the control to focus when the issue is followed. */
  field: string;
  message: string;
  /** For what keeps it out of the shop: which need it is, as the products list shows it. */
  need?: Need;
};

/** What a product can lack before it shows in the shop, each with the word or two the list uses. */
export const NEED_LABELS = {
  price: "No price",
  photo: "No photo",
  type: "No type",
  "photo-count": "No photo count",
  layouts: "Photo choices",
} as const;

export type Need = keyof typeof NEED_LABELS;

const hasWord = (s: string) => /[\p{L}\p{N}]/u.test(s);
const tooLong = (s: string, max: number) => s.trim().length > max;

/** Why a name can't be used, or null. Shared by the editor, New product and the server. */
export function nameProblem(name: string): string | null {
  const n = name.trim();
  if (!n) return "Give the product a name";
  if (!hasWord(n)) return "The name needs at least one letter or number";
  if (n.length > LIMITS.name) return `Keep the name to ${LIMITS.name} characters`;
  return null;
}

/** Why a product code can't be used, or null. Uniqueness is the server's to check. */
export function codeProblem(code: string): string | null {
  if (!code) return "Give the product its product code";
  if (code.length > LIMITS.code) return `Keep the code to ${LIMITS.code} letters and numbers`;
  if (!/^[A-Z]/.test(code)) return "Start the code with a letter, e.g. MG3";
  return null;
}

/** Why a price can't be used, or null. In cents; empty (null) is allowed and means not for sale online. */
export function priceProblem(cents: number | null): string | null {
  if (cents === null) return null;
  if (!Number.isFinite(cents) || cents < 0) return "A price can’t be below zero";
  if (cents === 0) return "A price of R0 gives it away. Leave it empty if it isn’t for sale online";
  if (cents > LIMITS.price) return "That price is over R100 000. Check for an extra zero";
  return null;
}

/** "18x18" or "a4=29.7x21" → the cm area, if it is a real printable size. */
function printArea(value: string) {
  const area = parseArea(value.includes("=") ? value.split("=")[1] : value);
  return area && [area.w, area.h].every((n) => n >= LIMITS.printMin && n <= LIMITS.printMax) ? area : null;
}

/** What would make the saved product wrong, whatever its status. Nothing saves until these are fixed. */
export function blockingIssues(d: ProductDraft): Issue[] {
  const issues: Issue[] = [];
  const add = (tab: Place, field: string, message: string) => issues.push({ tab, field, message });

  const name = nameProblem(d.name);
  if (name) add("page", "field-name", name);
  const code = codeProblem(d.code);
  if (code) add("records", "field-code", code);
  if (tooLong(d.description, LIMITS.description))
    add("page", "field-description", `Keep the description to ${LIMITS.description} characters`);
  if (d.specifications.length > LIMITS.specs) add("page", "field-specs", `Keep Details and care to ${LIMITS.specs} lines`);
  if (d.specifications.some((x) => tooLong(x, LIMITS.spec)))
    add("page", "field-specs", `Keep each line of Details and care to ${LIMITS.spec} characters`);
  if (d.careNotes && tooLong(d.careNotes, LIMITS.care)) add("page", "field-care", `Keep the care note to ${LIMITS.care} characters`);

  if (d.options.length > LIMITS.options) add("prices", "prices-options", `A product can have up to ${LIMITS.options} options`);
  const names = d.options.map((o) => o.name.trim().toLowerCase());
  d.options.forEach((o, i) => {
    const label = o.name.trim() ? `“${o.name.trim()}”` : `option ${i + 1}`;
    if (!o.name.trim()) add("prices", `option-${i}-name`, `Name option ${i + 1}, e.g. Size or Colour`);
    else if (names.indexOf(o.name.trim().toLowerCase()) !== i) add("prices", `option-${i}-name`, `Two options are called “${o.name.trim()}”`);
    else if (tooLong(o.name, LIMITS.optionName)) add("prices", `option-${i}-name`, `Keep option names to ${LIMITS.optionName} characters`);
    const choices = o.values.map((v) => v.trim().toLowerCase());
    if (o.values.length === 0) add("prices", `option-${i}-values`, `Add at least one choice under ${label}`);
    else if (o.values.length > LIMITS.choices) add("prices", `option-${i}-values`, `Keep ${label} to ${LIMITS.choices} choices`);
    if (new Set(choices).size !== choices.length) add("prices", `option-${i}-values`, `${label} lists the same choice twice`);
    if (o.values.some((v) => tooLong(v, LIMITS.choice))) add("prices", `option-${i}-values`, `Keep each choice under ${label} to ${LIMITS.choice} characters`);
  });

  if (d.variants.length > LIMITS.variants)
    add("prices", "prices-options", `That makes ${d.variants.length} price lines; the most is ${LIMITS.variants}. Remove some choices`);
  const skus = d.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) add("prices", "prices-grid", "Two price lines share a code");
  const badPrice = d.variants.map((v) => priceProblem(v.price)).find(Boolean);
  if (badPrice) add("prices", "prices-grid", badPrice);

  if (d.media.length > LIMITS.media) add("photos", "photos-list", `Keep it to ${LIMITS.media} photos`);
  if (d.media.some((m) => !m.alt.trim())) add("photos", "photos-list", "Describe every photo, for shoppers who can’t see it");
  if (d.media.some((m) => tooLong(m.alt, LIMITS.alt))) add("photos", "photos-list", `Keep each photo’s description to ${LIMITS.alt} characters`);

  const counts = tagValues(d.tags, "photos");
  if (counts.length > LIMITS.photoCounts) add("checkout", "customer-count", `Offer up to ${LIMITS.photoCounts} photo counts`);
  if (counts.some((c) => !/^\d+$/.test(c) || Number(c) < 1 || Number(c) > LIMITS.photos))
    add("checkout", "customer-count", `A photo count is a whole number from 1 to ${LIMITS.photos}`);
  if (tagValues(d.tags, "print").some((v) => !printArea(v)))
    add("checkout", "customer-print", `Printed sizes are ${LIMITS.printMin} to ${LIMITS.printMax} cm each way`);

  if (d.related.length > LIMITS.related) add("page", "field-goes", `Pick up to ${LIMITS.related} products for “Goes with this”`);
  const pairs = [...tagValues(d.tags, "holds"), ...tagValues(d.tags, "fits")];
  if (pairs.length > LIMITS.pairings) add("page", "field-goes", `Keep “Goes with this” to ${LIMITS.pairings} sizes or items`);
  if (pairs.some((v) => v.length > LIMITS.pairing)) add("page", "field-goes", `Keep each size or item to ${LIMITS.pairing} characters`);
  const processes = tagValues(d.tags, "process");
  if (processes.length > LIMITS.processes || processes.some((v) => v.length > LIMITS.process))
    add("records", "field-process", `Up to ${LIMITS.processes} ways of making it, ${LIMITS.process} characters each`);
  return issues;
}

/**
 * Several photo counts are told apart by the choice that names each one
 * ("2 photos"), or checkout can't know which applies. Says the first count
 * no choice names, or null.
 */
export function unmatchedPhotoCount(d: ProductDraft): string | null {
  const counts = tagValues(d.tags, "photos");
  if (counts.length < 2) return null;
  const named = d.options.flatMap((o) => o.values.map(optionKey));
  const n = counts.find((c) => !named.some((k) => k.startsWith(`${c}-photo`)));
  return n ? `Add a choice named “${photoCount(Number(n))}” under Sizes & prices, so checkout knows when it takes ${n}` : null;
}

/** What a product needs before it can show in the shop. */
export function readinessIssues(d: ProductDraft, vocab: Vocabulary): Issue[] {
  const issues: Issue[] = [];
  if (!d.variants.some((v) => v.price !== null))
    issues.push({ tab: "prices", field: "prices-grid", message: "Set at least one price", need: "price" });
  if (!d.media.some((m) => m.role === "photo"))
    issues.push({ tab: "photos", field: "photos-add", message: "Add a main photo", need: "photo" });
  const [type] = tagValues(d.tags, "type");
  if (!type || findTerm(vocab, "type", type)?.category !== d.categoryId)
    issues.push({ tab: "shelf", field: "filter-type", message: "Pick its type under On the shelf", need: "type" });
  if (d.personalisation) {
    if (tagValues(d.tags, "photos").length === 0)
      issues.push({ tab: "checkout", field: "customer-count", message: "Say how many photos the customer uploads", need: "photo-count" });
    const unmatched = unmatchedPhotoCount(d);
    if (unmatched) issues.push({ tab: "prices", field: "prices-options", message: unmatched, need: "layouts" });
  }
  return issues;
}

/**
 * The shop's work queue: what a saved product still needs before it can show.
 * A retired product needs nothing; it is out of the shop on purpose.
 */
export const productNeeds = (p: Product, vocab: Vocabulary): Issue[] => (p.status === "archived" ? [] : readinessIssues(toDraft(p), vocab));

export const issuesFor = (d: ProductDraft, vocab: Vocabulary) => [...blockingIssues(d), ...(d.status === "active" ? readinessIssues(d, vocab) : [])];

/**
 * A draft as it may be stored: text trimmed, codes normalised, tags limited to
 * the vocabulary (a type only of its own category), variants checked against
 * the options. Throws on anything the editor could not have produced.
 */
export function cleanDraft(d: ProductDraft, vocab: Vocabulary): ProductDraft {
  if (!d || typeof d.name !== "string" || typeof d.code !== "string" || typeof d.description !== "string" ||
      !Array.isArray(d.options) || !Array.isArray(d.variants) || !Array.isArray(d.media) || !Array.isArray(d.tags) ||
      !Array.isArray(d.specifications) || !STATUSES.includes(d.status))
    throw new Error("That save wasn’t in a shape the shop can store. Reload and try again.");

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
    throw new Error("The prices don’t match the options. Reload and try again.");

  const tags = [...new Set(d.tags.map((t) => String(t).trim()))].filter((t) => {
    const [facet, value] = t.split(":");
    if (!value) return false;
    if (facet === "type") return findTerm(vocab, "type", value)?.category === d.categoryId;
    if (facet === "occasion" || facet === "for") return isKnownFilterTag(vocab, t);
    return ["process", "fits", "holds", "photos", "print", "shape"].includes(facet);
  });

  return {
    name: d.name.trim(),
    code: normaliseCode(d.code),
    categoryId: d.categoryId,
    status: d.status,
    special: d.special === true,
    related: Array.isArray(d.related) ? [...new Set(d.related.filter((s) => typeof s === "string" && SLUG_PATTERN.test(s)))] : [],
    description: d.description.trim(),
    specifications: d.specifications.map((s) => String(s).trim()).filter(Boolean),
    careNotes: typeof d.careNotes === "string" ? d.careNotes.trim() || null : null,
    personalisation: d.personalisation ? { kind: d.personalisation.kind === "print" ? "print" : "gift", text: d.personalisation.text === true } : null,
    tags: d.personalisation ? tags : tags.filter((t) => !isCustomerTag(t)),
    options,
    variants: d.variants.map((v) => {
      const values = valuesOf(v);
      return { sku: v.sku, title: variantTitle(options, values), optionValues: values, price: v.price === null ? null : Math.round(v.price) };
    }),
    media: d.media.map((m) => ({ ...m, alt: m.alt.trim() })),
  };
}
