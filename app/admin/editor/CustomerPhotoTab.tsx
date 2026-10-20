"use client";

import { useState } from "react";
import { NumberInput, Radio, Select, Switch, TagsInput } from "@mantine/core";
import { choiceKey, LIMITS, unmatchedPhotoCount, type ProductDraft } from "@/lib/catalog/edit";
import { parseArea } from "@/lib/catalog/sizes";
import { hasFacet, PHOTO_SHAPES, tag, tagValues, withFacet, type Facet, type PhotoShape } from "@/lib/catalog/tags";
import type { PersonalisationKind } from "@/lib/catalog/types";
import type { ErrorOn, Update } from "./ProductEditor";
import { Where } from "./Where";

type Size = { w: number | ""; h: number | "" };

const KINDS: { value: "none" | PersonalisationKind; label: string; hint: string }[] = [
  { value: "none", label: "No", hint: "Sold as it is. Checkout skips the photo step for it." },
  { value: "gift", label: "Printed on a gift", hint: "Their photo goes onto the object: a mug, a puzzle, a keyring. With two photos, checkout names them Front and Back." },
  { value: "print", label: "Printed as a photo", hint: "Prints, collages, ID photos: the photo is the product. A print can be turned on its side to fit." },
];

const SHAPES: Record<PhotoShape, { label: string; path: React.ReactNode }> = {
  rect: { label: "Rectangle", path: <rect x="8" y="12" width="32" height="24" rx="2" /> },
  round: { label: "Circle", path: <circle cx="24" cy="24" r="14" /> },
  dome: { label: "Dome", path: <path d="M10 38V24a14 14 0 0 1 28 0v14z" /> },
};

/**
 * What the customer sends to have it made: whether they send a photo at all,
 * how many, the size each is printed at, and the outline it is cropped to.
 * The checkout's upload step is drawn from exactly these answers.
 */
export function CustomerPhotoTab({ draft, update, errorOn }: { draft: ProductDraft; update: Update; errorOn: ErrorOn }) {
  const p = draft.personalisation;
  const unmatched = unmatchedPhotoCount(draft) ?? undefined;
  const counts = tagValues(draft.tags, "photos");
  const prints = tagValues(draft.tags, "print");
  const [shape] = tagValues(draft.tags, "shape");

  const [varies, setVaries] = useState(counts.length > 1);
  const scoped = prints.some((v) => v.includes("="));
  // The choice a scoped size names: the one whose values the tags' keys match most.
  const guessOption =
    draft.options
      .map((o) => ({ o, n: o.values.filter((v) => prints.some((t) => t.includes("=") && choiceKey(v).startsWith(t.split("=")[0]))).length }))
      .sort((a, b) => b.n - a.n)[0]?.o.name ?? null;
  const [byChoice, setByChoice] = useState<string | null>(scoped ? guessOption : null);
  const choice = draft.options.find((o) => o.name === byChoice) ?? null;

  const setFacet = (facet: Facet, values: string[]) =>
    update({ tags: withFacet(draft.tags, facet, values) });

  const setKind = (kind: string) => {
    if (kind === "none") return update({ personalisation: null });
    update({
      personalisation: { kind: kind as PersonalisationKind, text: p?.text ?? false },
      // A product that starts taking photos takes one, as a rectangle, until said otherwise.
      tags: p ? draft.tags : [...draft.tags.filter((t) => !hasFacet(t, ["photos", "shape"])), tag("photos", "1"), tag("shape", "rect")],
    });
  };

  const sizeOf = (value: string | null): Size => {
    const raw = value === null ? prints.find((t) => !t.includes("=")) : prints.find((t) => t.includes("=") && choiceKey(value).startsWith(t.split("=")[0]))?.split("=")[1];
    const area = raw ? parseArea(raw) : null;
    return area ? { w: area.w, h: area.h } : { w: "", h: "" };
  };

  /** One size for every choice replaces any by-choice sizes, and the reverse. */
  const writeSize = (value: string | null, size: Size) => {
    const area = size.w !== "" && size.h !== "" ? `${size.w}x${size.h}` : null;
    if (value === null) return setFacet("print", area ? [area] : []);
    const others = prints.filter((t) => t.includes("=") && !choiceKey(value).startsWith(t.split("=")[0]));
    setFacet("print", area ? [...others, `${choiceKey(value)}=${area}`] : others);
  };

  return (
    <div className="panel">
      <section className="group" id="customer-sends" aria-labelledby="sends-title">
        <Radio.Group
          value={p?.kind ?? "none"}
          onChange={setKind}
          label={
            <span id="sends-title" className="group__title">
              Does the customer upload a photo?
            </span>
          }
          description={<Where>its card and page say “Takes your photo”, and checkout asks for it before payment.</Where>}
        >
          <div className="cards">
            {KINDS.map((k) => (
              <Radio.Card key={k.value} value={k.value} className="cards__card">
                <span className="cards__label">{k.label}</span>
                <span className="cards__hint">{k.hint}</span>
              </Radio.Card>
            ))}
          </div>
        </Radio.Group>
      </section>

      {p ? (
        <>
          <section className="group">
            <Switch
              size="md"
              label="They can add their own words too"
              description={<Where>its page adds “and your words if you like”, and checkout gives them a box for a name, a date or a short message.</Where>}
              checked={p.text}
              onChange={(e) => update({ personalisation: { ...p, text: e.currentTarget.checked } })}
            />
          </section>

          <section className="group" id="customer-count" aria-labelledby="count-title">
            <div className="group__head">
              <h2 id="count-title" className="group__title">
                How many photos?
              </h2>
              <p className="hint">
                <Where>its page says how many it takes, and checkout shows that many spaces to fill.</Where>
              </p>
            </div>
            <Radio.Group value={varies ? "varies" : "same"} onChange={(v) => setVaries(v === "varies")}>
              <div className="stack stack--tight">
                <Radio value="same" label="Always the same number" />
                <Radio value="varies" label="It depends on what they choose" />
              </div>
            </Radio.Group>
            {varies ? (
              <TagsInput
                label="Photo counts offered"
                description="Each count a shopper can pick. Name the matching choices under Sizes & prices with their count, e.g. “2 photos”."
                value={counts}
                onChange={(v) => setFacet("photos", [...new Set(v.filter((x) => /^\d+$/.test(x) && Number(x) > 0 && Number(x) <= LIMITS.photos))].sort((a, b) => Number(a) - Number(b)))}
                placeholder="e.g. 1, 2, 4"
                splitChars={[",", " "]}
                maxTags={LIMITS.photoCounts}
                className="field--narrow"
                error={counts.length === 0 ? "Add at least one count" : errorOn("customer-count") ?? unmatched}
              />
            ) : (
              <NumberInput
                label="Number of photos"
                min={1}
                max={LIMITS.photos}
                clampBehavior="strict"
                allowDecimal={false}
                value={counts[0] ? Number(counts[0]) : ""}
                onChange={(v) => setFacet("photos", v === "" ? [] : [String(v)])}
                className="field--narrow"
                error={counts.length === 0 ? "Say how many" : errorOn("customer-count")}
              />
            )}
          </section>

          <section className="group" id="customer-print" aria-labelledby="print-title">
            <div className="group__head">
              <h2 id="print-title" className="group__title">
                Printed size
              </h2>
              <p className="hint">
                <Where>
                  checkout draws each photo space at this size, and tells the customer when a photo may print soft.
                </Where>{" "}
                In centimetres, width first. Leave empty if it doesn’t apply.
              </p>
            </div>
            {draft.options.length ? (
              <Select
                label="The size is"
                data={[{ value: "", label: "The same for every choice" }, ...draft.options.map((o) => ({ value: o.name, label: `Different for each ${o.name.toLowerCase() || "choice"}` }))]}
                value={byChoice ?? ""}
                onChange={(v) => {
                  setByChoice(v || null);
                  setFacet("print", []);
                }}
                allowDeselect={false}
                className="field--narrow"
              />
            ) : null}
            {choice ? (
              <table className="sizes">
                <caption className="visually-hidden">Printed size for each {choice.name}</caption>
                <thead>
                  <tr>
                    <th>{choice.name}</th>
                    <th>Width × height (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {choice.values.map((v) => (
                    <tr key={v}>
                      <td>{v}</td>
                      <td>
                        <SizeInput label={v} size={sizeOf(v)} onChange={(s) => writeSize(v, s)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <SizeInput label="Printed size" size={sizeOf(null)} onChange={(s) => writeSize(null, s)} />
            )}
            {errorOn("customer-print") ? <p className="admin-error">{errorOn("customer-print")}</p> : null}
          </section>

          <section className="group" aria-labelledby="shape-title">
            <Radio.Group
              value={shape ?? "rect"}
              onChange={(v) => setFacet("shape", [v])}
              label={
                <span id="shape-title" className="group__title">
                  Shape the photo is cut to
                </span>
              }
              description={<Where>the outline of its photo space at checkout, e.g. a circle for a coaster.</Where>}
            >
              <div className="cards cards--shapes">
                {PHOTO_SHAPES.map((s) => (
                  <Radio.Card key={s} value={s} className="cards__card cards__card--shape">
                    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" className="cards__shape">
                      {SHAPES[s].path}
                    </svg>
                    <span className="cards__label">{SHAPES[s].label}</span>
                  </Radio.Card>
                ))}
              </div>
            </Radio.Group>
          </section>
        </>
      ) : null}
    </div>
  );
}

/** Width and height, stored once both are filled in (or both cleared). */
function SizeInput({ label, size, onChange }: { label: string; size: Size; onChange: (s: Size) => void }) {
  const [local, setLocal] = useState(size);
  // Follow the stored size when it changes from outside (Discard), not while one half is typed.
  const [stored, setStored] = useState(size);
  if (stored.w !== size.w || stored.h !== size.h) {
    setStored(size);
    setLocal(size);
  }
  const set = (next: Size) => {
    setLocal(next);
    if ((next.w === "") === (next.h === "")) onChange(next);
  };
  const num = (v: string | number): number | "" => (v === "" ? "" : Number(v));
  return (
    <div className="size">
      <NumberInput aria-label={`${label}, width in cm`} placeholder="Width" min={LIMITS.printMin} max={LIMITS.printMax} decimalScale={1} hideControls value={local.w} onChange={(v) => set({ ...local, w: num(v) })} />
      <span aria-hidden="true">×</span>
      <NumberInput aria-label={`${label}, height in cm`} placeholder="Height" min={LIMITS.printMin} max={LIMITS.printMax} decimalScale={1} hideControls value={local.h} onChange={(v) => set({ ...local, h: num(v) })} />
      <span className="size__unit">cm</span>
    </div>
  );
}
