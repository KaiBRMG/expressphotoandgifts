"use client";

import Link from "next/link";
import { useState } from "react";
import { Autocomplete, Button, NumberInput, TagsInput, Tooltip } from "@mantine/core";
import { LIMITS, priceProblem, priceRange, rebuildVariants, toCents, toRands, type ProductDraft } from "@/lib/catalog/edit";
import { rands } from "@/lib/catalog/listing";
import type { ProductOption, ProductVariant } from "@/lib/catalog/types";
import { Plus, Trash } from "@/app/site/icons";
import type { ErrorOn, Update } from "./ProductEditor";
import { Tip } from "./Tip";
import { Where } from "./Where";

/** The choices the catalogue already uses, offered first. */
const OPTION_NAMES = ["Size", "Colour", "Photos", "Background", "Filter", "Print sides"];


/** "R120", "R120 – R150", or "not priced yet", for a set of price lines. */
function span(lines: ProductVariant[]): string {
  const r = priceRange(lines);
  if (!r) return "not priced yet";
  return r.min === r.max ? rands(r.min) : `${rands(r.min)} – ${rands(r.max)}`;
}

/**
 * What a shopper chooses between, and what each combination costs. Staff name
 * the options and list their choices; the price list builds itself from them,
 * one line per combination, and keeps the prices already typed. With two or
 * more options the lines are grouped under the first one's choices (every
 * colour of an A4, then every colour of an A3), as the product page reads.
 */
export function PricesTab({ draft, update, errorOn }: { draft: ProductDraft; update: Update; errorOn: ErrorOn }) {
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

  const setPrices = (skus: Set<string>, price: number | null) =>
    update({ variants: draft.variants.map((v) => (skus.has(v.sku) ? { ...v, price } : v)) });

  // Columns for the options that have choices; one still being named has none yet.
  const columns = draft.options.filter((o) => o.values.length > 0);
  const single = columns.length === 0;
  const [lead, ...rest] = columns;
  // Grouped when there is something under each group to tell apart.
  const grouped = Boolean(lead && rest.length);
  const groups = grouped
    ? lead.values.map((value) => ({ value, lines: draft.variants.filter((v) => v.optionValues[lead.name] === value) }))
    : [{ value: null, lines: draft.variants }];
  const shownColumns = grouped ? rest : columns;
  const priced = draft.variants.filter((v) => v.price !== null).length;
  const full = draft.options.length >= LIMITS.options;
  const unused = OPTION_NAMES.filter((n) => !draft.options.some((x) => x.name === n));
  const nextName = unused[0] ?? "";

  return (
    <div className="panel">
      <section className="group" id="prices-options" aria-labelledby="choices-title">
        <div className="group__head">
          <h2 id="choices-title" className="group__title">
            Options shoppers pick
          </h2>
          <p className="hint">
            {draft.options.length === 0 ? (
              "Sold one way. Add an option if shoppers pick a size, a colour or anything else."
            ) : (
              <Where>
                each option is a row of buttons on its product page, and shoppers pick one choice in each. Its card counts the
                longest, e.g. “6 sizes”.
              </Where>
            )}
          </p>
        </div>

        {draft.options.map((o, i) => (
          <div key={i} className="choice">
            <Autocomplete
              id={`option-${i}-name`}
              className="choice__name"
              label="Option"
              placeholder="e.g. Size"
              data={unused}
              value={o.name}
              maxLength={LIMITS.optionName}
              onChange={(name) => renameOption(i, name)}
              error={errorOn(`option-${i}-name`)}
            />
            <TagsInput
              id={`option-${i}-values`}
              className="choice__values"
              label="Choices"
              description="Type each one and press Enter. Shoppers see them in this order."
              placeholder={o.values.length ? "" : o.name === "Colour" ? "e.g. Black" : "e.g. A4 (20 × 30 cm)"}
              value={o.values}
              onChange={(values) => setOptions(draft.options.map((x, j) => (j === i ? { ...x, values } : x)))}
              splitChars={[","]}
              maxTags={LIMITS.choices}
              clearable
              error={errorOn(`option-${i}-values`)}
            />
            <Tooltip
              label="Removes this option and its choices. The price lines merge, each keeping a price from a line it replaces."
            >
              <Button
                variant="subtle"
                color="red"
                className="choice__remove"
                aria-label={`Remove the ${o.name.trim() || "unnamed"} option`}
                leftSection={<Trash size={18} />}
                onClick={() => setOptions(draft.options.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </Tooltip>
          </div>
        ))}

        <div className="choice__add">
          <Tooltip
            label={
              full
                ? `${LIMITS.options} options is the most a product can have.`
                : `Add another choice shoppers make, such as ${nextName || "Colour"}. Every combination of choices gets its own price line below.`
            }
            events={{ hover: true, focus: true, touch: false }}
          >
            <Button
              variant="light"
              leftSection={<Plus size={18} />}
              data-disabled={full || undefined}
              aria-disabled={full}
              onClick={(e) => {
                if (full) return e.preventDefault();
                setOptions([...draft.options, { name: nextName, values: [] }]);
              }}
            >
              Add an option
            </Button>
          </Tooltip>
          <span className="hint">
            {draft.options.length} of {LIMITS.options}
          </span>
        </div>
      </section>

      <section className="group" aria-labelledby="prices-title" id="prices-grid">
        <div className="group__head">
          <h2 id="prices-title" className="group__title">
            {single ? "Price" : "Prices"}
          </h2>
          <p className="hint">
            <Where>the price of what’s picked, on its product page. Its card shows the lowest, as “from R…”.</Where> In rand, VAT
            included. Leave one empty and shoppers see “Price on request” and can’t buy it online.
          </p>
          {draft.code ? (
            <p className="hint">
              How many of each are on the shelf, and when {single ? "it sells" : "each sells"} out, is set on the{" "}
              <Link href={`/admin/stock?q=${encodeURIComponent(draft.code)}`} className="admin-link">
                Stock page
              </Link>
              .
            </p>
          ) : null}
        </div>

        {!single ? (
          <p className="prices__summary" aria-live="polite">
            <strong>{draft.variants.length}</strong> price {draft.variants.length === 1 ? "line" : "lines"}
            <span aria-hidden="true"> · </span>
            {priced === 0
              ? "none priced yet"
              : priced === draft.variants.length
                ? `all priced, ${span(draft.variants)}`
                : `${priced} priced (${span(draft.variants)}), ${draft.variants.length - priced} not for sale online`}
          </p>
        ) : null}

        {!single && draft.variants.length > 1 ? (
          <div className="setall">
            <NumberInput
              label="Set every price to"
              leftSection="R"
              decimalScale={2}
              min={0}
              max={LIMITS.price / 100}
              thousandSeparator=" "
              value={all}
              onChange={setAll}
              className="setall__input"
            />
            <Tooltip label="Overwrites every price below, including ones already set.">
              <Button variant="light" disabled={all === "" || Boolean(priceProblem(toCents(all)))} onClick={() => setPrices(new Set(draft.variants.map((v) => v.sku)), toCents(all))}>
                Apply to all {draft.variants.length}
              </Button>
            </Tooltip>
          </div>
        ) : null}

        <table className="prices">
          <caption className="visually-hidden">
            Price for each combination of choices{grouped ? `, grouped by ${lead.name}` : ""}
          </caption>
          <thead>
            <tr>
              {shownColumns.map((o, i) => (
                <th key={i}>{o.name || `Option ${i + 1}`}</th>
              ))}
              <th className="prices__code">
                <span className="label-tip">
                  Order code
                  <Tip about="order codes">
                    Made from the product code and the choices. Orders and the shop’s records use it; shoppers don’t see it.
                  </Tip>
                </span>
              </th>
              <th className="prices__price">Price</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.value ?? "all"} className={g.value === null ? undefined : "prices__group"}>
              {g.value !== null ? (
                <tr className="prices__groupHead">
                  <th scope="rowgroup" colSpan={shownColumns.length + 2}>
                    <span className="prices__groupTitle">
                      <span className="prices__groupName">{g.value}</span>
                      <span className="prices__groupMeta">
                        {g.lines.length} {g.lines.length === 1 ? "line" : "lines"} · {span(g.lines)}
                      </span>
                    </span>
                    {g.lines.length > 1 && g.lines[0].price !== null ? (
                      <Tooltip label={`Give every ${g.value} line the price of the first one, ${rands(g.lines[0].price)}.`}>
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          className="prices__fill"
                          onClick={() => setPrices(new Set(g.lines.map((l) => l.sku)), g.lines[0].price)}
                        >
                          Same price for all
                        </Button>
                      </Tooltip>
                    ) : null}
                  </th>
                </tr>
              ) : null}
              {g.lines.map((v) => {
                const problem = priceProblem(v.price);
                return (
                  <tr key={v.sku} className={v.price === null ? "prices__row prices__row--empty" : "prices__row"}>
                    {shownColumns.map((o, i) => (
                      <td key={i}>
                        {v.optionValues[o.name]}
                        {i === 0 ? <span className="prices__codeInline mono">{v.sku}</span> : null}
                      </td>
                    ))}
                    <td className="prices__code mono">{v.sku}</td>
                    <td className="prices__price">
                      <NumberInput
                        aria-label={`Price for ${v.title}`}
                        leftSection="R"
                        placeholder="Not for sale"
                        decimalScale={2}
                        min={0}
                        thousandSeparator=" "
                        hideControls
                        value={toRands(v.price)}
                        onChange={(value) => setPrices(new Set([v.sku]), toCents(value))}
                        error={problem ?? undefined}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </section>
    </div>
  );
}
