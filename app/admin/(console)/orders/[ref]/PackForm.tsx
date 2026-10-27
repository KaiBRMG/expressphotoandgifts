"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import { parcelText, type Boxes, type Parcel } from "@/lib/checkout/boxes";
import { packOrderAction } from "@/app/admin/actions";
import { ParcelFields, parcelsValid } from "./CourierActions";
import { useOrderAction } from "./OrderActions";

/**
 * The step that makes a courier order ready to send: the boxes it was packed
 * into and what each weighs. Saving marks the order ready; nothing is booked
 * and the customer isn't told, because the courier is called for the day's
 * orders together from the Dashboard. Once saved, the parcels stay open to
 * change until a waybill is booked.
 */
export function PackForm({ ref_, parcels: first, boxes, saved }: { ref_: string; parcels: Parcel[]; boxes: Boxes; saved: boolean }) {
  const { pending, error, run } = useOrderAction();
  const [parcels, setParcels] = useState<Parcel[]>(first);
  const [editing, setEditing] = useState(!saved);

  if (!editing) {
    return (
      <div className="oform">
        <p className="osec__lines">{parcels.map((p) => parcelText(boxes, p)).join("; ")}</p>
        <div className="row">
          <Button variant="default" onClick={() => setEditing(true)}>
            Change the parcels
          </Button>
        </div>
      </div>
    );
  }

  const ok = parcelsValid(parcels);
  return (
    <form
      className="oform waybill"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) run(() => packOrderAction(ref_, parcels), () => setEditing(false));
      }}
    >
      <ParcelFields parcels={parcels} onChange={setParcels} boxes={boxes} disabled={pending} />
      <p className="hint">Saving marks the order ready to send. The courier is booked from the Dashboard, together with the other orders that are ready.</p>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="row">
        <Button type="submit" loading={pending} disabled={!ok}>
          Save
        </Button>
        {saved ? (
          <Button variant="subtle" onClick={() => (setParcels(first), setEditing(false))} disabled={pending}>
            Keep as it was
          </Button>
        ) : null}
      </div>
    </form>
  );
}
