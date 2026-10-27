import { shelfHref, type Listing } from "./listing";
import { FACET_LABELS, FILTER_FACETS, tagValues, termCounts, termLabel, type FilterFacet, type Term, type Vocabulary } from "./tags";

/**
 * Catalogue search: a product matches when every word typed starts a word in
 * its name, its category's name, or the label of one of its tags ("Mugs",
 * "Mother's Day", "For kids"). The catalogue is a few dozen products, so the
 * browser holds it all and matches as the customer types; nothing is sent
 * anywhere per keystroke.
 *
 * Shared by the header's search window and /shop/all?q=, so both always agree
 * on what "matches" means.
 */

/** Lower-case, accents and apostrophes gone, "&" read as "and". */
function normalise(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "");
}

/** Words, with a plural "s" dropped so "mug" finds "Mugs" and "mugs" finds "Mug". */
export function words(s: string): string[] {
  return normalise(s)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/** The tag labels a product answers to, e.g. ["Mugs", "Birthday", "For him"]. */
export function tagLabels(item: { tags: readonly string[] }, vocab: Vocabulary): string[] {
  return FILTER_FACETS.flatMap((f) => tagValues(item.tags, f).map((v) => termLabel(vocab, f, v)));
}

/**
 * The query's words, or an empty list when there is nothing to search for.
 * A single character matches too much to be useful, so it does not count.
 */
export function queryWords(query: string): string[] {
  const all = words(query);
  return all.join("").length < 2 ? [] : all;
}

/** True when every query word starts one of the words. */
export const startsWords = (haystack: readonly string[], q: readonly string[]) => q.every((w) => haystack.some((x) => x.startsWith(w)));

/**
 * 0 when the item does not match; otherwise higher for a better match. Each
 * word scores by the strongest field it starts a word in: the product's own
 * name 3, its category 2, a tag 1.
 */
function score(item: Listing, q: string[], vocab: Vocabulary): number {
  const fields: [number, string[]][] = [
    [3, words(item.name)],
    [2, words(item.category)],
    [1, tagLabels(item, vocab).flatMap(words)],
  ];
  let total = 0;
  for (const w of q) {
    const best = Math.max(0, ...fields.filter(([, ws]) => ws.some((x) => x.startsWith(w))).map(([weight]) => weight));
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

/** Matching products, best first; ties keep the shop's featured order. */
export function searchItems<T extends Listing>(items: T[], query: string, vocab: Vocabulary): T[] {
  const q = queryWords(query);
  if (q.length === 0) return [];
  return items
    .map((item) => ({ item, s: score(item, q, vocab) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.item.rank - b.item.rank)
    .map((x) => x.item);
}

/** A shelf or a tag filter the query names outright, offered above the products. */
export type SearchShortcut = { label: string; kind: string; href: string };

/** A term as a shortcut: its own shelf, filtered. A type is a slice of its one category; occasions and people cut across the shop. */
const termShortcut = (facet: FilterFacet, t: Term): SearchShortcut => ({ label: t.label, kind: FACET_LABELS[facet], href: shelfHref(t.category ?? "all", facet, t.value) });

/**
 * Categories and tag terms whose own name the query matches ("birthday" →
 * Birthday, "frames" → Frames & Display), but only those with something on
 * them, so a shortcut never opens on an empty page.
 */
export function searchShortcuts(items: Listing[], query: string, vocab: Vocabulary): SearchShortcut[] {
  const q = queryWords(query);
  if (q.length === 0) return [];
  const named = (label: string) => {
    const ws = words(label);
    return q.every((w) => ws.some((x) => x.startsWith(w)));
  };

  const categories = [...new Map(items.map((i) => [i.categoryId, i.category]))]
    .filter(([, name]) => named(name))
    .map(([id, name]) => ({ label: name, kind: "Category", href: shelfHref(id) }));

  // A type is a slice of its one category; occasions and people cut across the shop.
  const terms = FILTER_FACETS.flatMap((facet) =>
    termCounts(vocab, items, facet)
      .filter((t) => t.count > 0 && named(t.label))
      .map((t) => termShortcut(facet, t)),
  );

  return [...categories, ...terms];
}

/** How many occasions the empty search window offers. */
const SUGGESTED = 4;

/**
 * What to offer before anything is typed: the occasions with the most on them,
 * as the same shortcuts a typed word would raise, so an empty window starts a
 * search instead of describing one.
 */
export function suggestedShortcuts(items: Listing[], vocab: Vocabulary): SearchShortcut[] {
  return termCounts(vocab, items, "occasion")
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, SUGGESTED)
    .map((t) => termShortcut("occasion", t));
}
