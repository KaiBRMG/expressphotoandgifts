/**
 * The catalogue's tag vocabulary.
 *
 * A tag is "facet:value", e.g. "occasion:mothers-day". Categories say where a
 * product lives (one each); tags say everything else about it (as many as are
 * true), so the shop stays five shelves deep instead of a tree.
 *
 * - `type`, `occasion` and `for` are what a shopper filters by. Their values
 *   are closed lists, below, in the order the shop shows them; the importer
 *   rejects anything not listed here.
 * - `process` (how the shop makes it, e.g. "process:sublimation"), `fits`
 *   (what it goes into or onto: a 20×30 print has "fits:20x30") and `holds`
 *   (what goes into or onto it: a frame of that size has "holds:20x30") are
 *   the shop's own bookkeeping, never shown as filters. A `fits` meeting a
 *   `holds` of the same value is a "Goes with this" pairing.
 * - `photos`, `print` and `shape` say what a personalised product needs from
 *   the customer: each photo count it takes ("photos:1", "photos:2"), the area
 *   in cm, width first, each photo is printed at ("print:18x18"), and the
 *   outline it is cropped to ("shape:round"). A `print` that differs by option
 *   names the option first: "print:a4=29.7x21". See `photoSpec` in purchase.ts.
 *
 * Shared by the importer, the server and the browser, so it holds no secrets
 * and no server imports.
 */

export type FilterFacet = "type" | "occasion" | "for";
export type Facet = FilterFacet | "process" | "fits" | "holds" | "photos" | "print" | "shape";

/**
 * The outline a customer's photo is cropped to: a rectangle, a circle, or the
 * arched insert of a snow globe. (A mug takes one photo a side, flat.)
 */
export const PHOTO_SHAPES = ["rect", "round", "dome"] as const;
export type PhotoShape = (typeof PHOTO_SHAPES)[number];

/** A vocabulary entry. A type also names the one category it belongs to. */
export type Term = { value: string; label: string; category?: string };

/** Every facet's terms, in the order the shop shows them. */
export type Vocabulary = Record<FilterFacet, Term[]>;

/** A term staff added in the admin, stored in Firestore's `terms` collection. */
export type AddedTerm = Term & { facet: FilterFacet };

/** The facets a shopper filters by, in the order the controls show them. */
export const FILTER_FACETS: FilterFacet[] = ["type", "occasion", "for"];

/** What each facet is called where a value is shown out of context. */
export const FACET_LABELS: Record<FilterFacet, string> = { type: "Type", occasion: "Occasion", for: "Who for" };

/**
 * The built-in terms. The shop reads `vocabularyWith(added)`, these followed
 * by what staff added in the admin; only the importer reads these alone.
 */
export const VOCABULARY: Vocabulary = {
  /** What it is, within its category. Every product carries exactly one, of its own category. */
  type: [
    { value: "mugs", label: "Mugs", category: "photo-gifts" },
    { value: "kitchen", label: "Kitchen", category: "photo-gifts" },
    { value: "decor", label: "Home décor", category: "photo-gifts" },
    { value: "keyrings", label: "Keyrings", category: "photo-gifts" },
    { value: "puzzles", label: "Puzzles", category: "photo-gifts" },
    { value: "bags", label: "Bags", category: "photo-gifts" },
    { value: "royal-frames", label: "Royal frames", category: "frames" },
    { value: "classic-frames", label: "Classic frames", category: "frames" },
    { value: "easels", label: "Easels and stands", category: "frames" },
    { value: "prints", label: "Prints", category: "photo-printing" },
    { value: "collages", label: "Collages and film strips", category: "photo-printing" },
    { value: "id-photos", label: "ID photos", category: "photo-printing" },
    { value: "earrings", label: "Earrings", category: "jewellery" },
    { value: "necklaces", label: "Necklaces", category: "jewellery" },
    { value: "rings", label: "Rings", category: "jewellery" },
    { value: "albums", label: "Albums", category: "add-ons" },
    { value: "batteries", label: "Batteries", category: "add-ons" },
    { value: "snacks", label: "Snacks", category: "add-ons" },
  ],
  /** What it is bought for, in calendar order where there is one. */
  occasion: [
    { value: "birthday", label: "Birthday" },
    { value: "valentines", label: "Valentine’s Day" },
    { value: "mothers-day", label: "Mother’s Day" },
    { value: "fathers-day", label: "Father’s Day" },
    { value: "matric", label: "Matric and graduation" },
    { value: "christmas", label: "Christmas" },
    { value: "wedding", label: "Wedding" },
    { value: "anniversary", label: "Anniversary" },
    { value: "new-baby", label: "New baby" },
    { value: "new-home", label: "New home" },
    { value: "memorial", label: "In memory" },
  ],
  /** Who it is for, kept to where the product genuinely leans one way. */
  for: [
    { value: "him", label: "For him" },
    { value: "her", label: "For her" },
    { value: "kids", label: "For kids" },
  ],
};

/** The facets staff can add terms to from the editor. */
export const ADDABLE_FACETS = ["type", "occasion"] as const satisfies readonly FilterFacet[];
export type AddableFacet = (typeof ADDABLE_FACETS)[number];

/** The vocabulary with one more term at the end of its facet; the same vocabulary if it is there already. */
export function withTerm(vocab: Vocabulary, { facet, ...term }: AddedTerm): Vocabulary {
  if (!vocab[facet] || vocab[facet].some((t) => t.value === term.value)) return vocab;
  return { ...vocab, [facet]: [...vocab[facet], term] };
}

/** The built-in terms, then the added ones after them, each where its facet ends. */
export const vocabularyWith = (added: readonly AddedTerm[]): Vocabulary => added.reduce(withTerm, VOCABULARY);

export const tag = (facet: Facet, value: string) => `${facet}:${value}`;

/** True when the tag belongs to one of these facets. */
export const hasFacet = (t: string, facets: readonly Facet[]) => facets.some((f) => t.startsWith(`${f}:`));

/** The tags with one facet's values replaced by these, the rest left as they are. */
export const withFacet = (tags: readonly string[], facet: Facet, values: readonly string[]) => [
  ...tags.filter((t) => !t.startsWith(`${facet}:`)),
  ...values.map((v) => tag(facet, v)),
];

/** The values a product carries for one facet, in the order it carries them. */
export function tagValues(tags: readonly string[], facet: Facet): string[] {
  const prefix = `${facet}:`;
  return tags.filter((t) => t.startsWith(prefix)).map((t) => t.slice(prefix.length));
}

/** The vocabulary's entry for a value, or undefined when it is not one. */
export function findTerm(vocab: Vocabulary, facet: FilterFacet, value: string | null): Term | undefined {
  return vocab[facet].find((t) => t.value === value);
}

export function termLabel(vocab: Vocabulary, facet: FilterFacet, value: string): string {
  return findTerm(vocab, facet, value)?.label ?? value;
}

const isFilterFacet = (f: string): f is FilterFacet => (FILTER_FACETS as string[]).includes(f);

/** True when the tag belongs to a shopper-facing facet and its value is in the vocabulary. */
export function isKnownFilterTag(vocab: Vocabulary, t: string): boolean {
  const [facet, value] = t.split(":") as [string, string | undefined];
  return isFilterFacet(facet) && findTerm(vocab, facet, value ?? null) !== undefined;
}

/** Every vocabulary value of a facet, in order, with how many of `items` carry it. */
export function termCounts(vocab: Vocabulary, items: readonly { tags: readonly string[] }[], facet: FilterFacet) {
  // One pass over the items, then a lookup per term.
  const counts = new Map<string, number>();
  for (const i of items) for (const t of i.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return vocab[facet].map((t) => ({ ...t, count: counts.get(tag(facet, t.value)) ?? 0 }));
}

/**
 * Only the shopper-facing tags; what a product card ships to the browser.
 * Every save checks them against the vocabulary, so the facet is enough here.
 */
export const filterTags = (tags: readonly string[]) => tags.filter((t) => isFilterFacet(t.split(":")[0]));

/** The longest a term's label may be: it has to fit on one button. */
export const TERM_MAX = 32;

/** A label as it is stored: trimmed, with single spaces. */
export const cleanTermLabel = (label: string) => label.trim().replace(/\s+/g, " ");

/** "Coasters & Mats" → "coasters-mats": a term's value, from its label. */
export const termValue = (label: string) =>
  label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Why a new term can't be added, or null when it can: a short label that
 * names something new on its facet (or, for a type, on its shelf).
 */
export function termProblem(vocab: Vocabulary, facet: FilterFacet, label: string, category?: string): string | null {
  const clean = cleanTermLabel(label);
  if (clean.length < 2) return "Give it a name of at least 2 letters.";
  if (clean.length > TERM_MAX) return `Keep it to ${TERM_MAX} characters, so it fits on one button.`;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’&,.-]*$/u.test(clean)) return "Use letters, numbers, spaces and & ’ , . - only.";
  const value = termValue(clean);
  if (!value) return "Use at least one letter or number.";
  if (facet === "type" && !category) return "Choose the shelf first.";
  const same = vocab[facet].find((t) => t.value === value || t.label.toLowerCase() === clean.toLowerCase());
  if (same) {
    const where = same.category && same.category !== category ? " on another shelf" : "";
    return `“${same.label}” is already there${where}.`;
  }
  return null;
}
