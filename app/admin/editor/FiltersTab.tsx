"use client";

import { Chip, TagsInput } from "@mantine/core";
import { pairingKey, pairingLabel, type ProductDraft } from "@/lib/catalog/edit";
import { tag, tagValues, VOCABULARY, type Facet } from "@/lib/catalog/tags";
import type { Category } from "@/lib/catalog/types";
import type { Suggestions, Update } from "./ProductEditor";

/**
 * How shoppers find it (its type, the occasions it suits, who it is for) and
 * what it goes with. The filter values are the shop's fixed lists; the
 * pairings are free, with what other products use offered first.
 */
export function FiltersTab({
  draft,
  update,
  categories,
  suggestions,
}: {
  draft: ProductDraft;
  update: Update;
  categories: Category[];
  suggestions: Suggestions;
}) {
  const setFacet = (facet: Facet, values: string[]) =>
    update({ tags: [...draft.tags.filter((t) => !t.startsWith(`${facet}:`)), ...values.map((v) => tag(facet, v))] });

  const types = VOCABULARY.type.filter((t) => t.category === draft.categoryId);
  const [type] = tagValues(draft.tags, "type");
  const category = categories.find((c) => c.id === draft.categoryId)?.name ?? "this category";

  const pairing = (facet: "holds" | "fits") => (
    <TagsInput
      label={facet === "holds" ? "It holds" : "It fits into or onto"}
      description={
        facet === "holds"
          ? "A 20 × 30 frame holds 20x30."
          : "A 20 × 30 print fits 20x30; a framed print may fit an easel."
      }
      placeholder="e.g. 20x30 or easel"
      data={suggestions.pairings}
      value={tagValues(draft.tags, facet)}
      onChange={(v) => setFacet(facet, [...new Set(v.map(pairingKey).filter(Boolean))])}
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
    <div className="panel">
      <section className="group" id="filter-type" aria-labelledby="type-title">
        <div className="group__head">
          <h2 id="type-title" className="group__title">
            Type
          </h2>
          <p className="hint">What it is within {category}. Pick one.</p>
        </div>
        <Chip.Group multiple={false} value={type ?? null} onChange={(v) => setFacet("type", v ? [v] : [])}>
          <div className="chips">
            {types.map((t) => (
              <Chip key={t.value} value={t.value} size="md">
                {t.label}
              </Chip>
            ))}
          </div>
        </Chip.Group>
      </section>

      <section className="group" aria-labelledby="occasion-title">
        <div className="group__head">
          <h2 id="occasion-title" className="group__title">
            Occasions
          </h2>
          <p className="hint">Every occasion it suits, or none.</p>
        </div>
        <Chip.Group multiple value={tagValues(draft.tags, "occasion")} onChange={(v) => setFacet("occasion", v)}>
          <div className="chips">
            {VOCABULARY.occasion.map((t) => (
              <Chip key={t.value} value={t.value} size="md">
                {t.label}
              </Chip>
            ))}
          </div>
        </Chip.Group>
      </section>

      <section className="group" aria-labelledby="for-title">
        <div className="group__head">
          <h2 id="for-title" className="group__title">
            Who it’s for
          </h2>
          <p className="hint">Only if it clearly leans one way.</p>
        </div>
        <Chip.Group multiple value={tagValues(draft.tags, "for")} onChange={(v) => setFacet("for", v)}>
          <div className="chips">
            {VOCABULARY.for.map((t) => (
              <Chip key={t.value} value={t.value} size="md">
                {t.label}
              </Chip>
            ))}
          </div>
        </Chip.Group>
      </section>

      <section className="group" aria-labelledby="goes-title">
        <div className="group__head">
          <h2 id="goes-title" className="group__title">
            Goes with
          </h2>
          <p className="hint">
            When what one product holds matches what another fits, each is suggested on the other’s page.
          </p>
        </div>
        <div className="row">
          <div className="row__grow">{pairing("holds")}</div>
          <div className="row__grow">{pairing("fits")}</div>
        </div>
        <TagsInput
          label="How the shop makes it"
          description="For the shop’s records, e.g. sublimation."
          data={suggestions.processes}
          value={tagValues(draft.tags, "process")}
          onChange={(v) => setFacet("process", [...new Set(v.map((x) => x.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))])}
          splitChars={[","]}
          clearable
          className="field--narrow"
        />
      </section>
    </div>
  );
}
