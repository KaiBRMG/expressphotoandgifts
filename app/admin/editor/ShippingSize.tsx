"use client";

import { useMemo, useState } from "react";
import { Button, NumberInput, Select, Tooltip } from "@mantine/core";
import type { ProductDraft } from "@/lib/catalog/edit";
import { MEASURE_LIMITS, MEASURES, sizeOf, withMeasure } from "@/lib/catalog/measures";
import type { Measure, Measurements, ProductVariant } from "@/lib/catalog/types";
import { DEFAULT_BOX, OWN, parcelText, type Boxes } from "@/lib/checkout/boxes";
import { pack } from "@/lib/checkout/packing";
import { Alert } from "@/app/site/icons";
import type { ErrorOn, Update } from "./ProductEditor";
import { Where } from "./Where";

const LABELS: Record<Measure, { label: string; unit: string }> = {
  length: { label: "Length", unit: "cm" },
  width: { label: "Width", unit: "cm" },
  height: { label: "Height", unit: "cm" },
  weight: { label: "Weight", unit: "kg" },
};

/** A variant with its own measurements, or without any when they're null. */
function withShipping(v: ProductVariant, s: Measurements | null | undefined): ProductVariant {
  const next = { ...v, shipping: s ?? undefined };
  if (!s) delete next.shipping;
  return next;
}

/**
 * The option the measurements were last set by: one whose every choice has a
 * single set across its variants. Null when they are the product's own.
 */
function guessOption(d: ProductDraft): string | null {
  if (!d.variants.some((v) => v.shipping)) return null;
  const key = (v: ProductVariant) => JSON.stringify(v.shipping ?? null);
  const options = d.options.filter((o) => o.values.length > 0);
  const consistent = options.find((o) => o.values.every((value) => new Set(d.variants.filter((v) => v.optionValues[o.name] === value).map(key)).size <= 1));
  return (consistent ?? options[0])?.name ?? null;
}

/**
 * Its size and weight, packed, from which checkout packs the cart into the
 * shop's boxes and asks the courier's price. The same for every choice, or
 * different for each choice of one option (a frame's sizes). A measure
 * estimated from its description and photos, not measured, says so until
 * staff type the real figure or confirm it.
 */
export function ShippingSize({ draft, update, errorOn, boxes }: { draft: ProductDraft; update: Update; errorOn: ErrorOn; boxes: Boxes }) {
  const [byChoice, setByChoice] = useState<string | null>(() => guessOption(draft));
  const choice = draft.options.find((o) => o.name === byChoice && o.values.length > 0) ?? null;
  const all = [draft.shipping, ...draft.variants.map((v) => v.shipping)];
  const estimates = all.some((s) => s?.estimated.length);

  /** One set for every choice, or one per choice: the measurements move to where they're now kept, nothing lost. */
  const choose = (name: string | null) => {
    setByChoice(name);
    if (name) {
      const base = draft.shipping ?? draft.variants.find((v) => v.shipping)?.shipping;
      update({ shipping: null, variants: draft.variants.map((v) => withShipping(v, v.shipping ?? base)) });
    } else {
      const first = draft.variants.find((v) => v.shipping)?.shipping ?? draft.shipping;
      update({ shipping: first ?? null, variants: draft.variants.map((v) => withShipping(v, null)) });
    }
  };

  // The first variant of each choice: its measurements are the row's, since a row writes to all of them.
  const firstOf = useMemo(() => {
    const first = new Map<string, ProductVariant>();
    if (choice) for (const v of draft.variants) if (!first.has(v.optionValues[choice.name])) first.set(v.optionValues[choice.name], v);
    return first;
  }, [choice, draft.variants]);
  const rowOf = (value: string) => firstOf.get(value)?.shipping ?? null;
  const setRow = (value: string, m: Measure, n: number | null) => {
    const next = withMeasure(rowOf(value), m, n);
    update({ variants: draft.variants.map((v) => (v.optionValues[choice!.name] === value ? withShipping(v, next) : v)) });
  };

  const confirmAll = () =>
    update({
      shipping: draft.shipping && { ...draft.shipping, estimated: [] },
      variants: draft.variants.map((v) => withShipping(v, v.shipping && { ...v.shipping, estimated: [] })),
    });

  /** Where one of each variant goes on its own, as checkout would pack it; worked out when the measurements change, not on every keystroke elsewhere. */
  const shipping = draft.shipping;
  const variants = draft.variants;
  const shipsBySku = useMemo(() => {
    const text = new Map<string, string>();
    for (const v of variants) {
      const size = sizeOf({ shipping, variants }, v.sku);
      if (!size) text.set(v.sku, `Not measured: priced in the ${boxes[DEFAULT_BOX].label.toLowerCase()} box`);
      else {
        const [p] = pack([{ size, quantity: 1 }], boxes);
        text.set(v.sku, `${p.box === OWN ? "Too big for your boxes: " : ""}${parcelText(boxes, p)}`);
      }
    }
    return text;
  }, [shipping, variants, boxes]);
  const shipsIn = (sku: string | undefined) => (sku ? shipsBySku.get(sku) : undefined) ?? "";

  return (
    <section className="group" id="checkout-shipping" aria-labelledby="shipping-title">
      <div className="group__head">
        <h2 id="shipping-title" className="group__title">
          Size and weight, packed
        </h2>
        <p className="hint">
          <Where>
            checkout packs the cart into your boxes from these and asks The Courier Guy for the price of those parcels. You confirm the real boxes and
            weights when you book the courier.
          </Where>{" "}
          Measure it as it goes into the box: in its own gift box or wrapping. The boxes&rsquo; sizes and weights are set in Settings.
        </p>
      </div>

      {estimates ? (
        <div className="estimate__note" role="status">
          <Alert size={20} />
          <p>
            Marked <strong>Estimated</strong>: worked out from its description and photos, not measured. Type the real figure to replace one, or confirm
            them once checked.
          </p>
          <Button variant="default" size="sm" onClick={confirmAll}>
            They&rsquo;re right
          </Button>
        </div>
      ) : null}

      {draft.options.some((o) => o.values.length > 0) ? (
        <Select
          label="The size and weight are"
          data={[
            { value: "", label: "The same for every choice" },
            ...draft.options.filter((o) => o.values.length > 0).map((o) => ({ value: o.name, label: `Different for each ${o.name.toLowerCase() || "choice"}` })),
          ]}
          value={choice?.name ?? ""}
          onChange={(v) => choose(v || null)}
          allowDeselect={false}
          className="field--narrow"
        />
      ) : null}

      {choice ? (
        <div className="measures__scroll">
          <table className="measures">
            <caption className="visually-hidden">Size and weight, packed, for each {choice.name}</caption>
            <thead>
              <tr>
                <th>{choice.name}</th>
                {MEASURES.map((m) => (
                  <th key={m}>
                    {LABELS[m].label} ({LABELS[m].unit})
                  </th>
                ))}
                <th>On its own, ships in</th>
              </tr>
            </thead>
            <tbody>
              {choice.values.map((value) => {
                const row = rowOf(value);
                return (
                  <tr key={value}>
                    <td>{value}</td>
                    {MEASURES.map((m) => (
                      <td key={m}>
                        <MeasureInput m={m} value={row?.[m] ?? null} estimated={row?.estimated.includes(m) ?? false} aria={`${value}, ${LABELS[m].label.toLowerCase()}`} onChange={(n) => setRow(value, m, n)} />
                      </td>
                    ))}
                    <td className="measures__ships">{shipsIn(firstOf.get(value)?.sku)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="measures__row">
            {MEASURES.map((m) => (
              <MeasureInput
                key={m}
                m={m}
                label
                value={draft.shipping?.[m] ?? null}
                estimated={draft.shipping?.estimated.includes(m) ?? false}
                onChange={(n) => update({ shipping: withMeasure(draft.shipping, m, n) })}
              />
            ))}
          </div>
          <p className="hint">On its own, it ships in: {shipsIn(draft.variants[0]?.sku)}.</p>
        </>
      )}
      {errorOn("checkout-shipping") ? <p className="admin-error">{errorOn("checkout-shipping")}</p> : null}
    </section>
  );
}

/** One measure, marked Estimated until staff type it. */
function MeasureInput({
  m,
  value,
  estimated,
  onChange,
  label = false,
  aria,
}: {
  m: Measure;
  value: number | null;
  estimated: boolean;
  onChange: (n: number | null) => void;
  label?: boolean;
  aria?: string;
}) {
  const { min, max, places } = MEASURE_LIMITS[m];
  const mark = estimated ? (
    <Tooltip label="Estimated from its description and photos, not measured">
      <span className="estimate">
        <Alert size={14} />
        Estimated
      </span>
    </Tooltip>
  ) : null;
  return (
    <div className={estimated ? "measure measure--estimated" : "measure"}>
      <NumberInput
        label={label ? `${LABELS[m].label} (${LABELS[m].unit})` : undefined}
        aria-label={label ? undefined : aria}
        placeholder={LABELS[m].unit}
        min={min}
        max={max}
        decimalScale={places}
        hideControls
        value={value ?? ""}
        onChange={(v) => onChange(v === "" ? null : Number(v))}
      />
      {mark}
    </div>
  );
}
