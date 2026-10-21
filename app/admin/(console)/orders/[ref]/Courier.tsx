import { rands } from "@/lib/catalog/listing";
import { DEFAULT_BOX, parcelFor, type Boxes } from "@/lib/checkout/boxes";
import type { Direction } from "@/lib/checkout/courier";
import { hasLeftShop, needsLookUp, SHIPMENT_STATES, statusText, type Order, type Shipment } from "@/lib/checkout/order";
import { External } from "@/app/site/icons";
import { at } from "../../../when";
import { BookReturn, ProofOfDelivery, SettleShipment, ShipmentControls, WaybillForm } from "./CourierActions";

/** How TCG says a delivery was confirmed, from the delivered event's message (TCG's docs name these three). */
const CONFIRMED: Record<string, string> = {
  "POD image captured": "The driver took a photo",
  "Recipient details entered": "The driver recorded who took it",
  "PIN entered successfully": "The recipient gave the delivery PIN",
};

/** "Mon 26 Oct", in the shop's time zone. */
const day = (date: string) => new Date(`${date}T12:00:00+02:00`).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short" });

/**
 * The order's courier waybills: booking it once packed, settling a booking
 * that didn't finish, and following it to the door, with its proof of
 * delivery; then, once delivered, a return of it to the shop.
 */
export function Courier({ order: o, boxes }: { order: Order; boxes: Boxes }) {
  const f = o.fulfilment;
  if (f.method !== "courier") return null;
  const delivered = o.shipment?.state === "booked" && o.shipment.status === "delivered";

  return (
    <section className="osec" aria-labelledby="ship-title">
      <h2 id="ship-title" className="osec__title">
        Courier
      </h2>
      <Waybill o={o} boxes={boxes} which="out" />
      {delivered || o.returnShipment ? (
        <>
          <h3 className="osec__sub osec__sub--split">Return</h3>
          <Waybill o={o} boxes={boxes} which="return" />
        </>
      ) : null}
    </section>
  );
}

function Waybill({ o, boxes, which }: { o: Order; boxes: Boxes; which: Direction }) {
  const f = o.fulfilment;
  if (f.method !== "courier") return null;
  const s = which === "out" ? o.shipment : o.returnShipment;
  const open = !s || s.state === "failed" || s.state === "cancelled";
  // A return starts from the boxes the order went out in; an order from the box checkout priced.
  const parcels = which === "return" && o.shipment?.parcels.length ? o.shipment.parcels : [parcelFor(boxes, f.service.box ?? DEFAULT_BOX)];

  return (
    <>
      {s ? (
        <p className="osec__lines">
          {SHIPMENT_STATES[s.state]}
          {s.error && s.state !== "booked" ? <span className="osec__soft">: {s.error}</span> : null}
        </p>
      ) : null}

      {open ? which === "out" ? <WaybillForm ref_={o.ref} which="out" parcels={parcels} boxes={boxes} /> : <BookReturn ref_={o.ref} parcels={parcels} boxes={boxes} /> : null}

      {s?.state === "booking" && !needsLookUp(s) ? <p className="hint">If this doesn&rsquo;t change within two minutes, reload: you&rsquo;ll be asked to look it up.</p> : null}

      {needsLookUp(s) ? (
        <>
          <p className="hint">The Courier Guy may have made the waybill. Look it up before booking again, or it could be sent, and charged, twice.</p>
          <SettleShipment ref_={o.ref} which={which} />
        </>
      ) : null}

      {s?.state === "booked" && s.tracking ? <Booked o={o} s={s} boxes={boxes} which={which} /> : null}
    </>
  );
}

function Booked({ o, s, boxes, which }: { o: Order; s: Shipment; boxes: Boxes; which: Direction }) {
  const delivered = s.status === "delivered";
  const confirmed = delivered ? s.events?.find((e) => e.status === "delivered" && CONFIRMED[e.message]) : undefined;
  const opts = s.options;
  const collection = [opts?.collectionDate ? `from ${day(opts.collectionDate)}` : null, opts?.after || opts?.before ? `${opts.after ?? "any time"} to ${opts.before ?? "any time"}` : null]
    .filter(Boolean)
    .join(", ");
  const labels = `/admin/orders/${o.ref}/label?which=${which}&kind=`;

  return (
    <>
      <dl className="ofacts">
        <div>
          <dt>Waybill</dt>
          <dd className="mono">{s.tracking}</dd>
        </div>
        {which === "return" && s.service ? (
          <div>
            <dt>Service</dt>
            <dd>{s.service.name}</dd>
          </div>
        ) : null}
        <div>
          <dt>Status</dt>
          <dd>{s.status ? statusText(s.status) : "Booked"}</dd>
        </div>
        {s.rate !== undefined ? (
          <div>
            <dt>TCG charged</dt>
            <dd>
              {rands(s.rate)}
              {which === "out" ? <span className="osec__soft"> (customer paid {rands(o.delivery)})</span> : null}
            </dd>
          </div>
        ) : null}
        {collection ? (
          <div>
            <dt>Collection</dt>
            <dd>{collection}</dd>
          </div>
        ) : null}
        {opts?.extras?.length ? (
          <div>
            <dt>Extras</dt>
            <dd>{opts.extras.map((e) => `${e.name} (${rands(e.charge)})`).join(", ")}</dd>
          </div>
        ) : null}
        {s.estimate && !delivered ? (
          <div>
            <dt>Expected</dt>
            <dd>
              {at(s.estimate.from)} to {at(s.estimate.to)}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Parcels</dt>
          <dd>{s.parcels.map((p) => `${"label" in p ? p.label : boxes[p.box].label} box, ${p.weight} kg`).join("; ")}</dd>
        </div>
      </dl>
      <p className="osec__lines">
        <a className="admin-link" href={`${labels}waybill`} target="_blank" rel="noopener">
          Print the waybill <External size={14} />
        </a>
        {" · "}
        <a className="admin-link" href={`${labels}stickers`} target="_blank" rel="noopener">
          Parcel stickers <External size={14} />
        </a>
      </p>
      <ShipmentControls ref_={o.ref} which={which} collected={hasLeftShop(s.status)} />

      {delivered ? (
        <>
          <h3 className="osec__sub">Proof of delivery</h3>
          {confirmed ? <p className="osec__lines">{CONFIRMED[confirmed.message]}, {at(confirmed.at)}.</p> : null}
          <ProofOfDelivery ref_={o.ref} which={which} />
        </>
      ) : null}

      {s.events?.length ? (
        <>
          <h3 className="osec__sub">Tracking</h3>
          <ul className="olog">
            {s.events.map((e) => (
              <li key={e.at + e.status}>
                {statusText(e.status)}
                {e.message ? `: ${e.message}` : ""}
                <span className="osec__soft">
                  {at(e.at)}
                  {e.location ? `, ${e.location}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {s.checkedAt ? <p className="osec__soft">Status read from The Courier Guy {at(s.checkedAt)}.</p> : null}
    </>
  );
}
