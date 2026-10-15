"use client";

import { useState } from "react";
import { Autocomplete, Button, NumberInput, TagsInput } from "@mantine/core";
import { rebuildVariants, type ProductDraft } from "@/lib/catalog/edit";
import type { ProductOption } from "@/lib/catalog/types";
import { Plus, Trash } from "@/app/site/icons";
import type { Update } from "./ProductEditor";

/** The choices the catalogue already uses, offered first. */
const OPTION_NAMES = ["Size", "Colour", "Photos", "Background", "Filter", "Print sides"];
const MAX_OPTIONS = 3;

const toCents = (v: string | number) => (v === "" ? null : Math.round(Number(v) * 100));
const toRands = (c: number | null) => (c === null ? "" : c / 100);

/**
 * What a shopper chooses between, and what each combination costs. Staff name
 * the choices and list their values; the price list builds itself from them,
 * one line per combination, and keeps the prices already typed.
 */
export function PricesTab({ draft, update }: { draft: ProductDraft; update: Update }) {
  const [all, setAll] = useState<string | number>("");

  const setOptions = (options: ProductOption[]) =>
    update({ options, variants: rebuildVariants(draft.code, options, draft.variants) });

  const renameOption = (i: number, name: string) => {
    const old = draft.options[i].name;
    const options = draft.options.map((o, j) => (j === i ? { ...o, name } : o));
    // Renaming keeps every price: the values move to the new name.
    const variants = draft.variants.map((v) => {
      const { [old]: value, ...rest } = v.optionValues;
      return { ...v, optionValues: value === undefined ? rest : { ...rest, [name]: value } };
    });
    update({ options, variants: rebuildVariants(draft.code, options, variants) });
  };

  const setPrice = (sku: string, price: number | null) =>
    update({ variants: draft.variants.map((v) => (v.sku === sku ? { ...v, price } : v)) });

  // Columns for the choices that have values; one still being named has none yet.
  const columns = draft.options.filter((o) => o.values.length > 0);
  const single = columns.length === 0;
  const priced = draft.variants.filter((v) => v.price !== null).length;

  return (
    <div className="panel">
      <section className="group" aria-labelledby="choices-title">
        <div className="group__head">
          <h2 id="choices-title" className="group__title">
            Choices
          </h2>
          <p className="hint">
            {draft.options.length === 0
              ? "Sold one way. Add a choice if shoppers pick a size, colour or anything else."
              : "Shoppers pick one value of each on the product page."}
          </p>
        </div>

        {draft.options.map((o, i) => (
          <div key={i} className="choice">
            <Autocomplete
              id={`option-${i}-name`}
              className="choice__name"
              label="Choice"
              placeholder="e.g. Size"
              data={OPTION_NAMES.filter((n) => !draft.options.some((x) => x.name === n))}
              value={o.name}
              onChange={(name) => renameOption(i, name)}
              error={!o.name.trim() ? "Name this choice" : undefined}
            />
            <TagsInput
              id={`option-${i}-values`}
              className="choice__values"
              label="Values"
              description="Type each one and press Enter."
              placeholder={o.values.length ? "" : o.name === "Colour" ? "e.g. Black" : "e.g. A4 (20 × 30 cm)"}
              value={o.values}
              onChange={(values) => setOptions(draft.options.map((x, j) => (j === i ? { ...x, values } : x)))}
              splitChars={[","]}
              clearable
              error={o.values.length === 0 ? "Add at least one value" : undefined}
            />
            <Button
              variant="subtle"
              color="red"
              className="choice__remove"
              aria-label={`Remove the ${o.name.trim() || "unnamed"} choice`}
              leftSection={<Trash size={18} />}
              onClick={() => setOptions(draft.options.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </div>
        ))}

        {draft.options.length < MAX_OPTIONS ? (
          <div>
            <Button
              variant="light"
              leftSection={<Plus size={18} />}
              onClick={() =>
                setOptions([...draft.options, { name: OPTION_NAMES.find((n) => !draft.options.some((x) => x.name === n)) ?? "", values: [] }])
              }
            >
              Add a choice
            </Button>
          </div>
        ) : null}
      </section>

      <section className="group" aria-labelledby="prices-title" id="prices-grid">
        <div className="group__head">
          <h2 id="prices-title" className="group__title">
            {single ? "Price" : "Prices"}
          </h2>
          <p className="hint">
            In rand, VAT included. Leave one empty and it can’t be bought online.
          </p>
        </div>

        {!single && draft.variants.length > 1 ? (
          <div className="setall">
            <NumberInput
              label="Set every price to"
              leftSection="R"
              decimalScale={2}
              min={0}
              thousandSeparator=" "
              value={all}
              onChange={setAll}
              className="setall__input"
            />
            <Button
              variant="light"
              disabled={all === ""}
              onClick={() => update({ variants: draft.variants.map((v) => ({ ...v, price: toCents(all) })) })}
            >
              Apply to all {draft.variants.length}
            </Button>
          </div>
        ) : null}

        <table className="prices">
          <caption className="visually-hidden">Price for each combination of choices</caption>
          <thead>
            <tr>
              {columns.map((o, i) => (
                <th key={i}>{o.name || `Choice ${i + 1}`}</th>
              ))}
              <th className="prices__code">Code</th>
              <th className="prices__price">Price</th>
            </tr>
          </thead>
          <tbody>
            {draft.variants.map((v) => (
              <tr key={v.sku}>
                {columns.map((o, i) => (
                  <td key={i}>{v.optionValues[o.name]}</td>
                ))}
                <td className="prices__code mono">{v.sku}</td>
                <td className="prices__price">
                  <NumberInput
                    aria-label={`Price for ${v.title}`}
                    leftSection="R"
                    placeholder="Not for sale online"
                    decimalScale={2}
                    min={0}
                    thousandSeparator=" "
                    hideControls
                    value={toRands(v.price)}
                    onChange={(value) => setPrice(v.sku, toCents(value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {priced > 0 && priced < draft.variants.length ? (
          <p className="hint">
            {priced} of {draft.variants.length} priced.
          </p>
        ) : null}
      </section>
    </div>
  );
}
