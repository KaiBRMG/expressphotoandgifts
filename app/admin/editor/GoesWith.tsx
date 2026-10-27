"use client";

import { useMemo, useState } from "react";
import { Button, Select, TagsInput, type ComboboxItem, type OptionsFilter } from "@mantine/core";
import { LIMITS, pairingKey, pairingLabel, type ProductDraft } from "@/lib/catalog/edit";
import { priceLabel } from "@/lib/catalog/listing";
import { GOES_WITH_ROW, goesWith, sizeMatches } from "@/lib/catalog/related";
import { tagValues, withFacet } from "@/lib/catalog/tags";
import { ProductImage } from "@/app/site/ProductImage";
import { Alert, ArrowDown, ArrowUp, Camera, Check, Trash } from "@/app/site/icons";
import type { CatalogueItem, ErrorOn, Suggestions, Update } from "./ProductEditor";
import { Where } from "./Where";
import { Hint } from "../Tip";

/** In the shop, and can be bought: the only products the row ever shows. */
const onSale = (p: CatalogueItem) => p.status === "active" && p.priceRange !== null;

/** Why a product won't appear in the row, or null when it can. */
function whyNot(p: CatalogueItem): string | null {
  if (p.status === "archived") return "Retired, so it won’t show";
  if (p.status === "draft") return "Hidden from the shop, so it won’t show yet";
  if (p.priceRange === null) return "Not priced, so it won’t show yet";
  return null;
}

/** The row as shoppers will see it once this draft is saved: picks first, then size matches, products on sale only. */
export function goesWithRow(draft: Pick<ProductDraft, "tags" | "related">, catalogue: CatalogueItem[]): CatalogueItem[] {
  return goesWith({ slug: "", tags: draft.tags, priceRange: null, related: draft.related }, catalogue.filter(onSale));
}

/**
 * "Goes with this", as staff think of it: their picks, chosen by name and put
 * in order, which always show, then whatever matches by size to fill the row
 * up to GOES_WITH_ROW. Each product says whether it will show and, if not,
 * why, so a pick that is still hidden reads as waiting rather than broken.
 */
export function GoesWith({
  draft,
  update,
  suggestions,
  catalogue,
  errorOn,
}: {
  draft: ProductDraft;
  update: Update;
  suggestions: Suggestions;
  catalogue: CatalogueItem[];
  errorOn: ErrorOn;
}) {
  const [search, setSearch] = useState("");
  const bySlug = useMemo(() => new Map(catalogue.map((p) => [p.slug, p])), [catalogue]);
  const picked = draft.related.flatMap((s) => bySlug.get(s) ?? catalogue.find((p) => p.formerSlugs?.includes(s)) ?? []);
  const row = goesWithRow(draft, catalogue);
  const shown = new Set(row.map((p) => p.slug));
  const matches = sizeMatches({ slug: "", tags: draft.tags, priceRange: null }, catalogue).filter(
    (m) => m.product.status !== "archived" && !draft.related.includes(m.product.slug),
  );
  const full = draft.related.length >= LIMITS.related;

  const setRelated = (related: string[]) => update({ related });
  const move = (from: number, to: number) => {
    const next = [...draft.related];
    [next[from], next[to]] = [next[to], next[from]];
    setRelated(next);
  };

  // Anything not retired and not picked yet, by shelf then name; found by name or code.
  const options = useMemo(
    () =>
      catalogue
        .filter((p) => p.status !== "archived" && !draft.related.includes(p.slug))
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        .map((p) => ({ value: p.slug, label: p.name })),
    [catalogue, draft.related],
  );
  const filter: OptionsFilter = ({ options: list, search: q }) => {
    const words = q.trim().toLowerCase();
    return (list as ComboboxItem[]).filter((o) => {
      const p = bySlug.get(o.value);
      return !words || `${p?.name} ${p?.code}`.toLowerCase().includes(words);
    });
  };

  const setFacet = (facet: "holds" | "fits", values: string[]) => update({ tags: withFacet(draft.tags, facet, values) });
  const pairing = (facet: "holds" | "fits") => (
    <TagsInput
      label={facet === "holds" ? "Sizes or items it holds" : "Sizes or items it fits into or onto"}
      description={facet === "holds" ? "e.g. a 20 × 30 frame holds 20x30." : "e.g. a 20 × 30 print fits 20x30; a framed print fits an easel."}
      placeholder="e.g. 20x30 or easel"
      data={suggestions.pairings}
      value={tagValues(draft.tags, facet)}
      onChange={(v) => setFacet(facet, [...new Set(v.map(pairingKey).filter(Boolean))])}
      maxTags={LIMITS.pairings}
      renderOption={({ option }) => (
        <span>
          {pairingLabel(option.value)} <span className="mono hint">{option.value}</span>
        </span>
      )}
      splitChars={[","]}
      clearable
    />
  );

  return (
    <section className="group" id="field-goes" aria-labelledby="goes-title">
      <div className="group__head">
        <h2 id="goes-title" className="group__title">
          Goes with this
        </h2>
        <p className="hint">
          <Where>the “Goes with this” row at the foot of its page.</Where> Your picks always show, in your order. If they come to fewer than{" "}
          {GOES_WITH_ROW}, products that match by size fill the rest.
        </p>
      </div>

      <div className="goes__now" aria-live="polite">
        <p className="field__label">Shoppers see</p>
        {row.length ? (
          <ul className="goes__strip">
            {row.map((p) => (
              <li key={p.slug}>
                <Thumb photo={p.photo} />
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Nothing yet, so the row is left off its page.</p>
        )}
      </div>

      <div className="field">
        <p className="field__label">
          Your picks{" "}
          <span className="hint">
            {draft.related.length} of {LIMITS.related}
          </span>
        </p>
        {picked.length ? null : <p className="hint">None yet, so the row is only size matches. Search below to pick a product.</p>}
        {picked.length ? (
          <ol className="picks">
            {picked.map((p, i) => {
              const why = whyNot(p);
              return (
                <li key={p.slug} className="pick">
                  <Thumb photo={p.photo} />
                  <span className="pick__text">
                    <span className="pick__name">{p.name}</span>
                    <span className="pick__meta">
                      {p.category} · {p.priceRange ? priceLabel(p.priceRange) : "no price"} · <span className="mono">{p.code}</span>
                    </span>
                    {why ? (
                      <span className="pick__why">
                        <Alert size={16} />
                        {why}
                      </span>
                    ) : null}
                  </span>
                  <span className="pick__actions">
                    <Hint label="Move earlier">
                      <Button variant="subtle" size="sm" px={10} aria-label={`Move ${p.name} earlier`} onClick={() => move(i, i - 1)} disabled={i === 0}>
                        <ArrowUp size={18} />
                      </Button>
                    </Hint>
                    <Hint label="Move later">
                      <Button variant="subtle" size="sm" px={10} aria-label={`Move ${p.name} later`} onClick={() => move(i, i + 1)} disabled={i === picked.length - 1}>
                        <ArrowDown size={18} />
                      </Button>
                    </Hint>
                    <Hint label="Remove">
                      <Button variant="subtle" color="red" size="sm" px={10} aria-label={`Remove ${p.name} from your picks`} onClick={() => setRelated(draft.related.filter((s) => s !== p.slug))}>
                        <Trash size={18} />
                      </Button>
                    </Hint>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
        <Select
          aria-label="Pick a product for Goes with this"
          placeholder={full ? `${LIMITS.related} picks, the most allowed` : "Pick a product: search by name or code"}
          data={options}
          value={null}
          searchable
          searchValue={search}
          onSearchChange={setSearch}
          filter={filter}
          nothingFoundMessage="No product by that name or code"
          disabled={full}
          maxDropdownHeight={320}
          onChange={(slug) => {
            if (slug) setRelated([...draft.related, slug]);
            setSearch("");
          }}
          renderOption={({ option }) => {
            const p = bySlug.get(option.value)!;
            return (
              <span className="pickopt">
                <Thumb photo={p.photo} />
                <span>
                  <span className="pick__name">{p.name}</span>
                  <span className="pick__meta">
                    {p.category}
                    {p.status === "draft" ? " · hidden" : ""}
                  </span>
                </span>
              </span>
            );
          }}
          className="goes__add"
        />
        {errorOn("field-goes") ? <p className="admin-error">{errorOn("field-goes")}</p> : null}
      </div>

      <div className="field">
        <p className="field__label">Matched by size</p>
        <p className="hint">Added on their own to fill any space your picks leave. Pick one to make sure it always shows.</p>
        {matches.length ? (
          <ul className="picks">
            {matches.map(({ product: p, on }) => {
              const why = whyNot(p) ?? (shown.has(p.slug) ? null : "Your picks fill the row, so it won’t show");
              return (
                <li key={p.slug} className="pick pick--matched">
                  <Thumb photo={p.photo} />
                  <span className="pick__text">
                    <span className="pick__name">{p.name}</span>
                    <span className="pick__meta">Matches on {on.map(pairingLabel).join(", ")}</span>
                    {why ? (
                      <span className="pick__why">
                        <Alert size={16} />
                        {why}
                      </span>
                    ) : (
                      <span className="pick__ok">
                        <Check size={16} />
                        Showing in the row now
                      </span>
                    )}
                  </span>
                  <Button variant="subtle" size="sm" aria-label={`Pick ${p.name}`} onClick={() => setRelated([...draft.related, p.slug])} disabled={full}>
                    Pick
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="hint">Nothing matches it by size. Set its sizes under “How it matches by size”, or pick products by name above.</p>
        )}

        <details className="goes__sizes">
          <summary>How it matches by size</summary>
          <p className="hint">
            A product that holds a size is matched with one that fits it, both ways: a frame that holds 20x30 and a print that fits 20x30
            each show on the other’s page.
          </p>
          <div className="row">
            <div className="row__grow">{pairing("holds")}</div>
            <div className="row__grow">{pairing("fits")}</div>
          </div>
        </details>
      </div>
    </section>
  );
}

function Thumb({ photo }: { photo: string | null }) {
  return (
    <span className="pick__thumb" aria-hidden="true">
      {photo ? <ProductImage code={photo} alt="" width={400} height={400} sizes="48px" /> : <Camera size={18} />}
    </span>
  );
}
