"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useId, type ReactNode } from "react";

import {
  PRICE_BANDS,
  SORTS,
  type Listing,
  type PriceBandId,
  type SortId,
} from "@/lib/catalog/listing";
import { FILTER_FACETS, findTerm, tag, termCounts, termLabel, type FilterFacet } from "@/lib/catalog/tags";
import { searchItems } from "@/lib/catalog/search";
import { Close, YourPhoto } from "@/app/site/icons";
import { ProductCard } from "./ProductCard";

/**
 * What the toolbar controls, as it sits in the URL. Tag facets keep their own
 * names (`?type=mugs&occasion=birthday&for=kids`); `q` is the header search's
 * words, which "See all" lands here with.
 */
type View = { q: string; sort: SortId; price: PriceBandId | null; photo: boolean } & Record<FilterFacet, string | null>;

const DEFAULT_VIEW: View = { q: "", sort: "featured", price: null, photo: false, type: null, occasion: null, for: null };


/** A facet value from the URL, if the vocabulary knows it. */
function readTerm(params: URLSearchParams, facet: FilterFacet): string | null {
  return findTerm(facet, params.get(facet))?.value ?? null;
}

function readView(params: URLSearchParams): View {
  const sort = SORTS.find((s) => s.id === params.get("sort"))?.id ?? "featured";
  const price = PRICE_BANDS.find((b) => b.id === params.get("price"))?.id ?? null;
  const facets = Object.fromEntries(FILTER_FACETS.map((f) => [f, readTerm(params, f)])) as Record<FilterFacet, string | null>;
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  return { q, sort, price, photo: params.get("photo") === "1", ...facets };
}

const hasTerm = (l: Listing, facet: FilterFacet, value: string | null) =>
  value === null || l.tags.includes(tag(facet, value));

/**
 * The values of a facet worth offering on this shelf, in the vocabulary's
 * order, with how many products carry each. A value every product carries
 * would filter nothing out, so it is left off; one that is active stays, so
 * the control can always show what is chosen.
 */
function terms(listings: Listing[], facet: FilterFacet, active: string | null) {
  return termCounts(listings, facet).filter((t) => t.value === active || (t.count > 0 && t.count < listings.length));
}

/** Unpriced products sort after priced ones in both directions. */
const byPrice = (a: Listing, b: Listing, dir: 1 | -1) =>
  a.min === null || b.min === null
    ? Number(a.min === null) - Number(b.min === null)
    : (a.min - b.min) * dir;

const COMPARE: Record<SortId, (a: Listing, b: Listing) => number> = {
  featured: (a, b) => a.rank - b.rank,
  "price-asc": (a, b) => byPrice(a, b, 1) || a.rank - b.rank,
  "price-desc": (a, b) => byPrice(a, b, -1) || a.rank - b.rank,
  name: (a, b) => a.name.localeCompare(b.name),
};

/**
 * The live catalogue. Sort, price band and the photo toggle live in the URL,
 * so the back button, a refresh and a shared link all keep them. The whole
 * shelf is already on the page, so changing a control re-sorts in place with
 * no round trip.
 */
type Props = {
  listings: Listing[];
  shelfName: string;
  /** Offer the shelf's types as a row of chips; on a category, not across the whole shop. */
  byType?: boolean;
};

export function Catalogue({ listings, shelfName, byType = false }: Props) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const view = readView(params);

  const set = (patch: Partial<View>) => {
    const next = { ...view, ...patch };
    const q = new URLSearchParams();
    if (next.q) q.set("q", next.q);
    if (next.sort !== "featured") q.set("sort", next.sort);
    for (const facet of FILTER_FACETS) if (next[facet]) q.set(facet, next[facet]);
    if (next.price) q.set("price", next.price);
    if (next.photo) q.set("photo", "1");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <CatalogueView listings={listings} shelfName={shelfName} byType={byType} view={view} onChange={set} />
  );
}

/**
 * The same view before the URL has been read: the shelf in the shop's own
 * order with every control at rest. It is what a static render and a browser
 * without scripts see, so the grid is never empty while the page wakes.
 */
export function CatalogueFallback({ listings, shelfName, byType = false }: Props) {
  return <CatalogueView listings={listings} shelfName={shelfName} byType={byType} view={DEFAULT_VIEW} />;
}

function CatalogueView({
  listings,
  shelfName,
  byType,
  view,
  onChange,
}: Props & {
  view: View;
  onChange?: (patch: Partial<View>) => void;
}) {
  const id = useId();
  const band = PRICE_BANDS.find((b) => b.id === view.price);
  // A search narrows the shelf first, best match first; the filters and their
  // counts then work within what it found.
  const pool = view.q ? searchItems(listings, view.q) : listings;
  const matched = pool.filter(
    (l) =>
      (!band || band.test(l.min)) &&
      (!view.photo || l.personalisable) &&
      FILTER_FACETS.every((f) => hasTerm(l, f, view[f])),
  );
  // "Featured" on a search means relevance, which `pool` is already in.
  const shown = view.q && view.sort === "featured" ? matched : matched.sort(COMPARE[view.sort]);
  const filtered = view.price !== null || view.photo || FILTER_FACETS.some((f) => view[f] !== null);
  const anyPersonalisable = pool.some((l) => l.personalisable);
  const disabled = !onChange;
  const types = byType ? terms(pool, "type", view.type) : [];
  const occasions = terms(pool, "occasion", view.occasion);
  const recipients = terms(pool, "for", view.for);

  // "nothing matching “mug”, in Mugs for Christmas, for kids, under R100 that takes your photo"
  const why = [
    view.q ? `matching “${view.q}”` : null,
    view.type ? `in ${termLabel("type", view.type)}` : null,
    view.occasion ? `for ${termLabel("occasion", view.occasion)}` : null,
    view.for ? termLabel("for", view.for).toLowerCase() : null,
    band?.phrase ?? null,
    view.photo ? "that takes your photo" : null,
  ].filter(Boolean);

  return (
    <div className="catalog__main">
      {view.q ? (
        <div className="searched">
          <p className="searched__label">
            Results for <strong>&ldquo;{view.q}&rdquo;</strong>
          </p>
          <button type="button" className="toggle" disabled={disabled} onClick={() => onChange?.({ q: "" })}>
            <Close size={16} />
            Clear search
          </button>
        </div>
      ) : null}

      {/* One row of what the shelf holds: the finer grouping a second tier of
          categories would have been, without the extra page. */}
      {types.length > 1 ? (
        <div className="kinds" role="group" aria-label={`Kinds of ${shelfName.toLowerCase()}`}>
          <ul>
            <li>
              <Kind pressed={view.type === null} disabled={disabled} count={pool.length} onClick={() => onChange?.({ type: null })}>
                All
              </Kind>
            </li>
            {types.map((t) => (
              <li key={t.value}>
                <Kind
                  pressed={view.type === t.value}
                  disabled={disabled}
                  count={t.count}
                  onClick={() => onChange?.({ type: view.type === t.value ? null : t.value })}
                >
                  {t.label}
                </Kind>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="toolbar" role="group" aria-label="Sort and filter">
        <p className="toolbar__count" aria-live="polite">
          <strong>{shown.length}</strong> {shown.length === 1 ? "product" : "products"}
          {filtered ? <span> of {pool.length}</span> : null}
        </p>

        <div className="toolbar__controls">
          {/* Only offered where it would change something: on a shelf where
              everything (or nothing) takes a photo it is a switch with no effect. */}
          {anyPersonalisable && listings.some((l) => !l.personalisable) ? (
            <button
              type="button"
              className="toggle"
              aria-pressed={view.photo}
              disabled={disabled}
              onClick={() => onChange?.({ photo: !view.photo })}
            >
              <YourPhoto size={18} />
              Takes your photo
            </button>
          ) : null}

          {occasions.length > 0 ? (
            <FacetSelect
              id={`${id}-occasion`}
              label="Occasion"
              empty="Any occasion"
              value={view.occasion}
              options={occasions}
              disabled={disabled}
              onChange={(occasion) => onChange?.({ occasion })}
            />
          ) : null}

          {recipients.length > 0 ? (
            <FacetSelect
              id={`${id}-for`}
              label="Who it's for"
              empty="For anyone"
              value={view.for}
              options={recipients}
              disabled={disabled}
              onChange={(value) => onChange?.({ for: value })}
            />
          ) : null}

          <FacetSelect
            id={`${id}-price`}
            label="Price"
            empty="Any price"
            value={view.price}
            options={PRICE_BANDS.map((b) => ({ value: b.id, label: b.label }))}
            disabled={disabled}
            onChange={(price) => onChange?.({ price: price as PriceBandId | null })}
          />

          <label className="select" htmlFor={`${id}-sort`}>
            <span className="visually-hidden">Sort by</span>
            <select
              id={`${id}-sort`}
              value={view.sort}
              disabled={disabled}
              onChange={(e) => onChange?.({ sort: e.target.value as SortId })}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id === "featured" ? "Sort: Featured" : s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {shown.length > 0 ? (
        <ul className="grid" aria-label={shelfName}>
          {shown.map((l, i) => (
            <li key={l.slug}>
              <ProductCard listing={l} eager={i < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="nomatch">
          <p className="nomatch__title">Nothing here matches.</p>
          {/* Nothing found at all: the search line above already offers to
              clear it, so this only suggests what to try. */}
          {pool.length === 0 ? (
            <p className="nomatch__text">
              {shelfName} has nothing matching &ldquo;{view.q}&rdquo;. Try a
              product, like mug or frame, or an occasion, like birthday.
            </p>
          ) : (
            <>
              <p className="nomatch__text">
                {shelfName} has nothing {why.join(", ")}. Clear the filters to
                see all {pool.length}.
              </p>
              <button
                type="button"
                className="btn btn--blue"
                onClick={() => onChange?.({ ...DEFAULT_VIEW, q: view.q, sort: view.sort })}
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** A chip in the kinds row: pressed when it is the shelf's current type. */
function Kind({
  pressed,
  disabled,
  count,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <span>{children}</span>
      <span className="kinds__count">{count}</span>
    </button>
  );
}

/** One of the toolbar's pill filters, its "any" choice first. */
function FacetSelect({
  id,
  label,
  empty,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  empty: string;
  value: string | null;
  options: { value: string; label: string }[];
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="select" htmlFor={id}>
      <span className="visually-hidden">{label}</span>
      <select id={id} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
