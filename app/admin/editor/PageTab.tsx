"use client";

import { useRef } from "react";
import { Button, Textarea, TextInput } from "@mantine/core";
import { LIMITS, type ProductDraft } from "@/lib/catalog/edit";
import { ArrowDown, ArrowUp, Plus, Trash } from "@/app/site/icons";
import { GoesWith } from "./GoesWith";
import type { CatalogueItem, ErrorOn, Suggestions, Update } from "./ProductEditor";
import { Where } from "./Where";
import { Hint } from "../Tip";

/**
 * The words on its product page, in the order the page shows them: the
 * title, the description under the price, "Details and care", and the
 * "Goes with this" row. Photos and prices have tabs of their own.
 */
export function PageTab({
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
  return (
    <div className="panel">
      <section className="group" aria-labelledby="top-title">
        <div className="group__head">
          <h2 id="top-title" className="group__title">
            Top of the page
          </h2>
        </div>
        <TextInput
          id="field-name"
          label="Name"
          description={<Where>the title on its card and its page, and the line on the customer’s order.</Where>}
          value={draft.name}
          maxLength={LIMITS.name}
          onChange={(e) => update({ name: e.currentTarget.value })}
          error={errorOn("field-name")}
        />
        <Textarea
          id="field-description"
          label="Description"
          description={<Where>under the price. Say what it is, what it’s made of and who it suits.</Where>}
          value={draft.description}
          maxLength={LIMITS.description}
          onChange={(e) => update({ description: e.currentTarget.value })}
          error={errorOn("field-description")}
          inputWrapperOrder={["label", "description", "input", "error"]}
          rightSection={<Count n={draft.description.length} max={LIMITS.description} />}
          rightSectionWidth={84}
          autosize
          minRows={4}
          maxRows={14}
        />
      </section>

      <section className="group" aria-labelledby="care-title">
        <div className="group__head">
          <h2 id="care-title" className="group__title">
            Details and care
          </h2>
          <p className="hint">
            <Where>the blue “Details and care” band further down its page, beside any size diagram from Photos.</Where>
          </p>
        </div>
        <Specifications specs={draft.specifications} set={(specifications) => update({ specifications })} />
        {errorOn("field-specs") ? <p className="admin-error">{errorOn("field-specs")}</p> : null}
        <Textarea
          id="field-care"
          label="Care"
          description="Optional, e.g. “Hand wash only.”"
          value={draft.careNotes ?? ""}
          maxLength={LIMITS.care}
          onChange={(e) => update({ careNotes: e.currentTarget.value || null })}
          error={errorOn("field-care")}
          autosize
          minRows={2}
          maxRows={8}
        />
      </section>

      <GoesWith draft={draft} update={update} suggestions={suggestions} catalogue={catalogue} errorOn={errorOn} />
    </div>
  );
}

/**
 * The facts under "Details and care" on the product page, one measurement or
 * material per line. Enter starts a new line; Backspace on an empty one removes it.
 */
function Specifications({ specs, set }: { specs: string[]; set: (next: string[]) => void }) {
  const list = useRef<HTMLOListElement>(null);

  const focusRow = (i: number) =>
    requestAnimationFrame(() => list.current?.querySelectorAll<HTMLInputElement>("input")[i]?.focus());
  const add = (at = specs.length) => {
    set([...specs.slice(0, at), "", ...specs.slice(at)]);
    focusRow(at);
  };
  const move = (from: number, to: number) => {
    const next = [...specs];
    [next[from], next[to]] = [next[to], next[from]];
    set(next);
    focusRow(to);
  };

  return (
    <div id="field-specs" className="field" role="group" aria-labelledby="specs-title">
      <p id="specs-title" className="field__label">
        Measurements and materials
      </p>
      <p className="hint field__hint">One per line, e.g. “20 × 30 cm”. A size diagram goes under Photos.</p>
      {specs.length ? (
        <ol ref={list} className="specs">
          {specs.map((s, i) => (
            <li key={i} className="specs__row">
              <TextInput
                aria-label={`Measurement or material ${i + 1}`}
                value={s}
                maxLength={LIMITS.spec}
                onChange={(e) => set(specs.map((x, j) => (j === i ? e.currentTarget.value : x)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(i + 1);
                  }
                  if (e.key === "Backspace" && s === "") {
                    e.preventDefault();
                    set(specs.filter((_, j) => j !== i));
                    focusRow(Math.max(0, i - 1));
                  }
                }}
                className="specs__input"
              />
              <Hint label="Move up">
                <Button variant="subtle" size="sm" px={10} aria-label={`Move line ${i + 1} up`} onClick={() => move(i, i - 1)} disabled={i === 0}>
                  <ArrowUp size={18} />
                </Button>
              </Hint>
              <Hint label="Move down">
                <Button variant="subtle" size="sm" px={10} aria-label={`Move line ${i + 1} down`} onClick={() => move(i, i + 1)} disabled={i === specs.length - 1}>
                  <ArrowDown size={18} />
                </Button>
              </Hint>
              <Hint label="Remove">
                <Button variant="subtle" color="red" size="sm" px={10} aria-label={`Remove line ${i + 1}`} onClick={() => set(specs.filter((_, j) => j !== i))}>
                  <Trash size={18} />
                </Button>
              </Hint>
            </li>
          ))}
        </ol>
      ) : null}
      <Button variant="light" leftSection={<Plus size={18} />} onClick={() => add()} className="specs__add" disabled={specs.length >= LIMITS.specs}>
        Add a line
      </Button>
    </div>
  );
}

/** "180 / 2000": shown once a field is past most of its room, so the limit is never a surprise. */
function Count({ n, max }: { n: number; max: number }) {
  if (n < max * 0.8) return null;
  return (
    <span className="count mono" aria-live="polite">
      {n} / {max}
    </span>
  );
}
