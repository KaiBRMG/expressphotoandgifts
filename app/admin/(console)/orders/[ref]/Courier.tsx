import { rands } from "@/lib/catalog/listing";
import { parcelText, quotedParcels, type Boxes } from "@/lib/checkout/boxes";
import type { Direction } from "@/lib/checkout/courier";
import { hasLeftShop, SHIPMENT_STATES, statusText, type Order, type Shipment } from "@/lib/checkout/order";
import { Printer } from "@/app/site/icons";
import { at } from "../../../when";
import { BookReturn, ProofOfDelivery, ShipmentControls } from "./CourierActions";

/** How TCG says a delivery was confirmed, from the delivered event's message (TCG's docs name these three). */
const CONFIRMED: Record<string, string> = {
  "POD image captured": "The driver took a photo",
  "Recipient details entered": "The driver recorded who took it",
  "PIN entered successfully": "The recipient gave the delivery PIN",
};

/** "Mon 26 Oct", in the shop's time zone. */
const day = (date: string) => new Date(`${date}T12:00:00+02:00`).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short" });

/**
 * The order's waybills as TCG has them: the outbound one once booked (the
 * Dashboard books it with the day's collection), its controls, proof and
 * tracking; then, once delivered, a return of it to the shop.
 */
export function Courier({ order: o, boxes }: { order: Order; boxes: Boxes }) {
  const f = o.fulfilment;
  if (f.method !== "courier") return null;
  const delivered = o.shipment?.state === "booked" && o.shipment.status === "delivered";

  return (
    <div className="otab">
      {o.shipment ? (
        <Waybill o={o} boxes={boxes} which="out" />
      ) : (
        <p className="osec__soft">
          No waybill yet.{" "}
          {o.packed
            ? `Packed in ${o.packed.parcels.map((p) => parcelText(boxes, p)).join("; ")}. It is booked from the Dashboard with the other orders that are ready.`
            : "Pack it and mark it ready, and it is booked from the Dashboard with the other orders that are ready."}
        </p>
      )}
      {delivered || o.returnShipment ? (
        <>
          <h3 className="osec__sub osec__sub--split">Return</h3>
          <Waybill o={o} boxes={boxes} which="return" />
        </>
      ) : null}
    </div>
  );
}

function Waybill({ o, boxes, which }: { o: Order; boxes: Boxes; which: Direction }) {
  const f = o.fulfilment;
  if (f.method !== "courier") return null;
  const s = which === "out" ? o.shipment : o.returnShipment;
  const open = !s || s.state === "failed" || s.state === "cancelled";
  // A return starts from the boxes the order went out in; an order from the parcels checkout priced.
  const parcels = which === "return" && o.shipment?.parcels.length ? o.shipment.parcels : quotedParcels(boxes, f.service);

  return (
    <>
      {s ? (
        <p className="osec__lines">
          {SHIPMENT_STATES[s.state]}
          {s.error && s.state !== "booked" ? <span className="osec__soft">: {s.error}</span> : null}
        </p>
      ) : null}

      {open && which === "return" ? <BookReturn ref_={o.ref} parcels={parcels} boxes={boxes} /> : null}

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
          <dd>{s.parcels.map((p) => parcelText(boxes, p)).join("; ")}</dd>
        </div>
      </dl>
      <div className="obtns">
        <a className="obtn" href={`${labels}waybill`} target="_blank" rel="noopener">
          <Printer size={18} /> Waybill
        </a>
        <a className="obtn" href={`${labels}stickers`} target="_blank" rel="noopener">
          <Printer size={18} /> Stickers
        </a>
      </div>
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
