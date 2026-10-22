"use client";

import { useState, useTransition } from "react";
import { Button, NumberInput, TextInput } from "@mantine/core";
import { saveShippingBoxesAction } from "@/app/admin/actions";
import { BOX_IDS, MAX_BOX_CM, MAX_BOX_LABEL, MAX_PARCEL_KG, type Box, type BoxId, type Boxes } from "@/lib/checkout/boxes";

const SLOT: Record<BoxId, string> = { small: "Smallest box", medium: "Middle box", large: "Largest box" };

const MEASURES = [
  { key: "length", label: "Length", suffix: " cm", scale: 1, min: 1, max: MAX_BOX_CM },
  { key: "width", label: "Width", suffix: " cm", scale: 1, min: 1, max: MAX_BOX_CM },
  { key: "height", label: "Height", suffix: " cm", scale: 1, min: 1, max: MAX_BOX_CM },
  { key: "weight", label: "Weight empty", suffix: " kg", scale: 2, min: 0.01, max: MAX_PARCEL_KG },
] as const satisfies readonly { key: keyof Box; label: string; suffix: string; scale: number; min: number; max: number }[];

/** The three boxes the shop ships in: each one's name, outside size and own weight, empty with its padding. */
export function ShippingBoxes({ initial }: { initial: Boxes }) {
  const [boxes, setBoxes] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const changed = JSON.stringify(boxes) !== JSON.stringify(saved);

  const set = (id: BoxId, patch: Partial<Box>) => {
    setBoxes((b) => ({ ...b, [id]: { ...b[id], ...patch } }));
    setDone(false);
  };

  return (
    <form
      className="oform"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setDone(false);
        start(async () => {
          const res = await saveShippingBoxesAction(boxes).catch(() => ({ error: "That didn’t reach the server. Check the connection and try again." }));
          if ("error" in res) return setError(res.error);
          setBoxes(res.boxes);
          setSaved(res.boxes);
          setDone(true);
        });
      }}
    >
      <p className="hint">
        Checkout packs the cart into these from each product&rsquo;s size and weight (its Checkout tab): into the smallest box that holds it all with room for padding, or into more than one. The courier is priced for each box at its size, and its weight empty plus what&rsquo;s in it; the booking form starts from those parcels. Measure each box on the outside, and weigh it empty with the padding you put in it: The Courier Guy re-measures parcels and bills the account for any difference, and charges the greater of the real weight and the size&rsquo;s volumetric weight.
      </p>
      {BOX_IDS.map((id) => (
        <fieldset key={id} className="boxes__group">
          <legend className="osec__sub">{SLOT[id]}</legend>
          <div className="row">
            <TextInput className="boxes__name" label="Name" maxLength={MAX_BOX_LABEL} value={boxes[id].label} onChange={(e) => set(id, { label: e.currentTarget.value })} required />
            {MEASURES.map((m) => (
              <NumberInput
                key={m.key}
                className="boxes__num"
                label={m.label}
                suffix={m.suffix}
                decimalScale={m.scale}
                min={m.min}
                max={m.max}
                value={boxes[id][m.key]}
                onChange={(v) => set(id, { [m.key]: Number(v) || 0 })}
                required
              />
            ))}
          </div>
        </fieldset>
      ))}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="row">
        <Button type="submit" loading={pending} disabled={!changed}>
          Save
        </Button>
        {done ? <p className="osec__soft" role="status">Saved. Checkout prices with these from now on; orders already paid keep what they were charged.</p> : null}
      </div>
    </form>
  );
}
