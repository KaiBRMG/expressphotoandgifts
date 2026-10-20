"use client";

import { useState } from "react";
import { Chip, Select, Switch } from "@mantine/core";
import type { ProductDraft } from "@/lib/catalog/edit";
import { findTerm, tagValues, withFacet, type AddedTerm, type Facet, type Vocabulary } from "@/lib/catalog/tags";
import type { Category } from "@/lib/catalog/types";
import type { Update } from "./ProductEditor";
import { AddTerm } from "./AddTerm";
import { Tip } from "./Tip";
import { Where } from "./Where";

/**
 * Where it sits in the shop and how shoppers find it there: the shelf
 * (category), the button it is listed under on that shelf (type), the
 * shelves' filters, and the Specials shelf. Category and type sit together
 * because one decides the other. Types and occasions can be added here; a
 * new one is stored at once and picked for this product.
 */
export function ShelfTab({
  draft,
  update,
  categories,
  vocabulary,
  onAdded,
}: {
  draft: ProductDraft;
  update: Update;
  categories: Category[];
  vocabulary: Vocabulary;
  onAdded: (term: AddedTerm) => void;
}) {
  const [movedType, setMovedType] = useState<string | null>(null);

  const setFacet = (facet: Facet, values: string[]) =>
    update({ tags: withFacet(draft.tags, facet, values) });

  const [type] = tagValues(draft.tags, "type");

  const setCategory = (categoryId: string) => {
    // A type belongs to one category, so it does not follow the product to another.
    const term = type ? findTerm(vocabulary, "type", type) : undefined;
    const keeps = !type || term?.category === categoryId;
    setMovedType(keeps ? null : term?.label ?? type);
    update({ categoryId, tags: keeps ? draft.tags : withFacet(draft.tags, "type", []) });
  };

  const types = vocabulary.type.filter((t) => t.category === draft.categoryId);
  const shelf = categories.find((c) => c.id === draft.categoryId);
  const category = shelf?.name ?? "its category";

  /** Stores the new term in the editor's list, then picks it: the type replaces any other, an occasion joins the rest. */
  const added = (term: AddedTerm) => {
    onAdded(term);
    setMovedType(null);
    if (term.facet === "type") setFacet("type", [term.value]);
    else setFacet("occasion", [...tagValues(draft.tags, "occasion"), term.value]);
  };

  return (
    <div className="panel">
      <section className="group" aria-labelledby="shelf-title">
        <div className="group__head">
          <h2 id="shelf-title" className="group__title">
            Which shelf, and where on it
          </h2>
          <p className="hint">
            <Where>the category is the shelf it sits on; the type is the button it’s listed under across the top of that shelf.</Where>
          </p>
        </div>

        <Select
          id="field-category"
          label="Category"
          description="The shelf. It decides which types you can pick."
          data={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={draft.categoryId}
          onChange={(v) => v && setCategory(v)}
          allowDeselect={false}
          className="field--narrow"
        />

        <div id="filter-type" className="field" role="group" aria-labelledby="type-label">
          <p className="field__label label-tip">
            <span id="type-label">Type on the {category} shelf</span>
            <Tip about="types">
              A product is listed under one type. Each type belongs to one shelf, so moving the product to another category clears it.
            </Tip>
          </p>
          <p className="hint field__hint">Pick one. It can’t go in the shop without it.</p>
          {movedType ? (
            <p className="hint hint--warn" role="status">
              “{movedType}” belonged to the old shelf, so it was taken off. Pick a new type.
            </p>
          ) : null}
          <Chip.Group multiple={false} value={type ?? null} onChange={(v) => setFacet("type", v ? [v] : [])}>
            <div className="chips">
              {types.map((t) => (
                <Chip key={t.value} value={t.value} size="md">
                  {t.label}
                </Chip>
              ))}
              {shelf ? <AddTerm facet="type" vocabulary={vocabulary} category={shelf} onAdded={added} /> : null}
            </div>
          </Chip.Group>
        </div>
      </section>

      <section className="group" id="filter-occasion" aria-labelledby="occasion-title">
        <div className="group__head">
          <h2 id="occasion-title" className="group__title">
            Occasions
          </h2>
          <p className="hint">
            <Where>the Occasion filter on the shelves, and the shop’s search.</Where> Pick every occasion it suits, or none.
          </p>
        </div>
        <Chip.Group multiple value={tagValues(draft.tags, "occasion")} onChange={(v) => setFacet("occasion", v)}>
          <div className="chips">
            {vocabulary.occasion.map((t) => (
              <Chip key={t.value} value={t.value} size="md">
                {t.label}
              </Chip>
            ))}
            <AddTerm facet="occasion" vocabulary={vocabulary} onAdded={added} />
          </div>
        </Chip.Group>
      </section>

      <section className="group" id="filter-for" aria-labelledby="for-title">
        <div className="group__head">
          <h2 id="for-title" className="group__title">
            Who it’s for
          </h2>
          <p className="hint">
            <Where>the “Who it’s for” filter on the shelves, and the shop’s search.</Where> Pick only if it clearly leans one way.
          </p>
        </div>
        <Chip.Group multiple value={tagValues(draft.tags, "for")} onChange={(v) => setFacet("for", v)}>
          <div className="chips">
            {vocabulary.for.map((t) => (
              <Chip key={t.value} value={t.value} size="md">
                {t.label}
              </Chip>
            ))}
          </div>
        </Chip.Group>
      </section>

      <section className="group">
        <Switch
          id="field-special"
          size="md"
          label="On the Specials shelf"
          description={<Where>a gold Special badge on its photo, and a place on the Specials shelf.</Where>}
          checked={draft.special}
          onChange={(e) => update({ special: e.currentTarget.checked })}
        />
      </section>
    </div>
  );
}
