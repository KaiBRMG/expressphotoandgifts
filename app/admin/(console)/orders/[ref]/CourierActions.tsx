"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, NumberInput, Radio, Select, TextInput } from "@mantine/core";
import { BOX_IDS, boxLabel, DEFAULT_BOX, isBox, MAX_BOX_CM, MAX_PARCEL_KG, MAX_PARCELS, OWN, OWN_LABEL, parcelFor, type Boxes, type Parcel } from "@/lib/checkout/boxes";
import type { BookingOptions, Direction, Extra, Priced } from "@/lib/checkout/courier";
import { rands } from "@/lib/catalog/listing";
import {
  bookShipmentAction,
  cancelShipmentAction,
  courierExtrasAction,
  lookUpShipmentAction,
  markNotBookedAction,
  previewShipmentAction,
  proofOfDeliveryAction,
  refreshShipmentAction,
} from "@/app/admin/actions";
import { Alert, External } from "@/app/site/icons";
import { useOrderAction } from "./OrderActions";

/** Half-hours across the courier's working day, for the collection window. */
const TIMES = Array.from({ length: 23 }, (_, i) => {
  const h = 7 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});

const TZ = "Africa/Johannesburg";

/** The shop's date, `YYYY-MM-DD`, some days from now. */
const shopDay = (daysAhead = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(Date.now() + daysAhead * 864e5));

/** "Mon 26 Oct", in the shop's time zone. */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

/** "Mon 26 Oct" or "Mon 26 to Tue 27 Oct": when a service delivers. */
const window_ = (d: { from: string; to: string }) => (day(d.from) === day(d.to) ? day(d.from) : `${day(d.from)} to ${day(d.to)}`);

const SIDES = [
  ["length", "Length"],
  ["width", "Width"],
  ["height", "Height"],
] as const;

type Preview = { key: string; status: "loading" } | { key: string; status: "done"; services: Priced[]; booked: string | null; paid: number | null } | { key: string; status: "error"; error: string };

/**
 * Books a waybill, out to the customer or a return back to the shop: the
 * boxes packed, when the courier may collect, and the account's paid extras.
 * TCG's price for exactly that is read as it changes, and compared with what
 * the customer paid for delivery, before anything is booked.
 */
export function WaybillForm({ ref_, which, parcels: first, boxes }: { ref_: string; which: Direction; parcels: Parcel[]; boxes: Boxes }) {
  const { pending, error, run } = useOrderAction();
  const [parcels, setParcels] = useState<Parcel[]>(first);
  const [collectionDate, setDate] = useState("");
  const [after, setAfter] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [extras, setExtras] = useState<Extra[] | { error: string } | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [service, setService] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [limits] = useState(() => ({ min: shopDay(), max: shopDay(30) }));

  const set = (i: number, p: Parcel) => setParcels(parcels.map((q, j) => (j === i ? p : q)));
  // Another box keeps the weight entered; its own packaging starts at the size of the box it was in.
  const setBox = (p: Parcel, v: string): Parcel =>
    isBox(v) ? { box: v, weight: p.weight } : { ...(p.box === OWN ? p : boxes[p.box]), box: OWN, weight: p.weight };
  const parcelsOk = parcels.every(
    (p) => p.weight > 0 && p.weight <= MAX_PARCEL_KG && (p.box !== OWN || SIDES.every(([side]) => p[side] > 0 && p[side] <= MAX_BOX_CM)),
  );
  const options: BookingOptions = { collectionDate: collectionDate || null, after, before, extras: chosen };
  const key = JSON.stringify([parcels, options]);

  // The account's extras, read once the list is opened.
  useEffect(() => {
    if (!extrasOpen || extras) return;
    courierExtrasAction(ref_, which)
      .then((r) => setExtras("error" in r ? r : r.extras))
      .catch(() => setExtras({ error: "The extras couldn’t be read. Check the connection." }));
  }, [extrasOpen, extras, ref_, which]);

  // TCG's price for the waybill as it stands, a moment after the last change.
  useEffect(() => {
    if (!parcelsOk || preview?.key === key) return;
    const timer = setTimeout(async () => {
      setPreview({ key, status: "loading" });
      const r = await previewShipmentAction(ref_, which, parcels, options).catch(() => ({ error: "That didn’t reach the server. Check the connection." }));
      setPreview((now) => (now?.key !== key ? now : "error" in r ? { key, status: "error", error: r.error } : { key, status: "done", ...r }));
    }, 600);
    return () => clearTimeout(timer);
    // `options` and `parcels` are what `key` is made of.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, parcelsOk, ref_, which]);

  const current = preview?.key === key ? preview : null;
  const services = current?.status === "done" ? current.services : [];
  const code = which === "out" ? (current?.status === "done" ? current.booked : null) : (service ?? services[0]?.code ?? null);
  const priced = services.find((s) => s.code === code) ?? null;
  const ready = parcelsOk && !!priced && (which === "out" || !!code);

  return (
    <form
      className="oform waybill"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) run(() => bookShipmentAction(ref_, which, parcels, options, which === "return" ? (code ?? undefined) : undefined));
      }}
    >
      {which === "return" ? <p className="hint">TCG collects from the delivery address and brings it back to the shop.</p> : null}

      <fieldset className="waybill__group">
        <legend className="osec__sub">Parcels</legend>
        {parcels.map((p, i) => (
          <div key={i} className="row">
            <Select
              label={parcels.length > 1 ? `Parcel ${i + 1}` : "Box"}
              data={[...BOX_IDS.map((id) => ({ value: id, label: boxLabel(boxes[id]) })), { value: OWN, label: `${OWN_LABEL}, its own size` }]}
              value={p.box}
              allowDeselect={false}
              onChange={(v) => v && set(i, setBox(p, v))}
            />
            {p.box === OWN
              ? SIDES.map(([side, label]) => (
                  <NumberInput
                    key={side}
                    label={label}
                    suffix=" cm"
                    decimalScale={1}
                    min={1}
                    max={MAX_BOX_CM}
                    value={p[side]}
                    onChange={(v) => set(i, { ...p, [side]: Number(v) || 0 })}
                    className="waybill__side"
                    required
                  />
                ))
              : null}
            <NumberInput
              label="Weight packed"
              suffix=" kg"
              decimalScale={2}
              min={0.1}
              max={MAX_PARCEL_KG}
              value={p.weight}
              onChange={(v) => set(i, { ...p, weight: Number(v) || 0 })}
              required
            />
            {parcels.length > 1 ? (
              <Button variant="subtle" onClick={() => setParcels(parcels.filter((_, j) => j !== i))} disabled={pending}>
                Remove
              </Button>
            ) : null}
          </div>
        ))}
        {parcels.length < MAX_PARCELS ? (
          <button type="button" className="admin-link osec__more" onClick={() => setParcels([...parcels, parcels.at(-1) ?? parcelFor(boxes, DEFAULT_BOX)])}>
            Add another parcel
          </button>
        ) : null}
      </fieldset>

      <fieldset className="waybill__group">
        <legend className="osec__sub">Collection</legend>
        <div className="row">
          <TextInput
            type="date"
            label="Collect from"
            description="Blank: next round (same day before 15:00)"
            min={limits.min}
            max={limits.max}
            value={collectionDate}
            onChange={(e) => setDate(e.currentTarget.value)}
          />
          <Select label="Between" placeholder="Any time" data={TIMES} value={after} onChange={setAfter} clearable />
          <Select label="And" placeholder="Any time" data={TIMES.filter((t) => !after || t > after)} value={before} onChange={setBefore} clearable />
        </div>
      </fieldset>

      <fieldset className="waybill__group">
        <legend className="osec__sub">Extras</legend>
        {!extrasOpen ? (
          <button type="button" className="admin-link osec__more" onClick={() => setExtrasOpen(true)}>
            {chosen.length ? `${chosen.length} chosen. Change` : "Add an extra: Saturday delivery, after hours, a farm or hospital…"}
          </button>
        ) : !extras ? (
          <p className="hint">Reading the account&rsquo;s extras…</p>
        ) : "error" in extras ? (
          <p className="admin-error" role="alert">
            {extras.error}
          </p>
        ) : (
          <Extras extras={extras} chosen={chosen} onChange={setChosen} />
        )}
      </fieldset>

      <PriceLine which={which} preview={current} services={services} code={code} onChoose={setService} />

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="row">
        <Button type="submit" loading={pending} disabled={!ready}>
          {which === "out" ? "Book The Courier Guy" : "Book the return"}
          {priced ? `, ${rands(priced.price)}` : ""}
        </Button>
      </div>
    </form>
  );
}

/** The account's extras as two lists: a slot (Saturday, early, after hours, a holiday), and what the address is (a farm, a hospital…). */
function Extras({ extras, chosen, onChange }: { extras: Extra[]; chosen: number[]; onChange: (ids: number[]) => void }) {
  const groups = [
    { title: "A slot", hint: "Charged on top of the delivery.", list: extras.filter((e) => e.kind === "timed") },
    { title: "Where it goes", hint: "Add one when the address is one, or TCG may add it after.", list: extras.filter((e) => e.kind === "flat") },
  ].filter((g) => g.list.length);
  if (!groups.length) return <p className="hint">The account has no extras to add.</p>;
  return (
    <Checkbox.Group value={chosen.map(String)} onChange={(v) => onChange(v.map(Number))}>
      <div className="waybill__extras">
        {groups.map((g) => (
          <div key={g.title} className="waybill__extraGroup">
            <p className="waybill__extraTitle">
              {g.title} <span className="osec__soft">{g.hint}</span>
            </p>
            {g.list.map((e) => (
              <Checkbox
                key={e.id}
                value={String(e.id)}
                classNames={{ labelWrapper: "waybill__wrap" }}
                label={
                  <span className="waybill__extraLabel">
                    <span>{e.name}</span>
                    <span className="plist__num">{rands(e.charge)}</span>
                  </span>
                }
              />
            ))}
          </div>
        ))}
      </div>
    </Checkbox.Group>
  );
}

/**
 * TCG's price for the waybill as set up. Out, against what the customer paid
 * for delivery; for a return, every service to choose from.
 */
function PriceLine({
  which,
  preview,
  services,
  code,
  onChoose,
}: {
  which: Direction;
  preview: Preview | null;
  services: Priced[];
  code: string | null;
  onChoose: (code: string) => void;
}) {
  if (!preview || preview.status === "loading") {
    return (
      <p className="waybill__price waybill__price--wait" role="status">
        Asking The Courier Guy for the price…
      </p>
    );
  }
  if (preview.status === "error") {
    return (
      <p className="waybill__price waybill__price--bad" role="alert">
        <Alert size={18} /> {preview.error}
      </p>
    );
  }
  if (which === "return") {
    return (
      <Radio.Group value={code} onChange={onChoose} label={<span className="osec__sub">Service</span>}>
        <div className="waybill__services">
          {services.map((s) => (
            <Radio
              key={s.code}
              value={s.code}
              classNames={{ labelWrapper: "waybill__wrap" }}
              label={
                <span className="waybill__extraLabel">
                  <span>
                    {s.name}
                    {s.delivery ? <span className="osec__soft"> · at the shop {window_(s.delivery)}</span> : null}
                  </span>
                  <span className="plist__num">{rands(s.price)}</span>
                </span>
              }
            />
          ))}
        </div>
      </Radio.Group>
    );
  }

  const s = services.find((x) => x.code === code);
  if (!s) {
    return (
      <p className="waybill__price waybill__price--bad" role="alert">
        <Alert size={18} /> The order&rsquo;s service ({code}) isn&rsquo;t offered for this waybill. Change the boxes or the extras, or call The Courier Guy.
      </p>
    );
  }
  const paid = preview.status === "done" ? preview.paid : null;
  const diff = paid === null ? 0 : s.price - paid;
  return (
    <div className={`waybill__price${diff > 0 ? " waybill__price--over" : ""}`} role="status">
      <p className="waybill__priceMain">
        {diff > 0 ? <Alert size={18} /> : null}
        TCG will charge <strong>{rands(s.price)}</strong>
        {paid === null ? null : diff === 0 ? ", what the customer paid." : diff > 0 ? `, ${rands(diff)} more than the customer paid (${rands(paid)}).` : `, ${rands(-diff)} less than the customer paid (${rands(paid)}).`}
      </p>
      <p className="osec__soft">
        {s.name}
        {s.collection ? ` · collected ${day(s.collection)}` : ""}
        {s.delivery ? ` · delivered ${window_(s.delivery)}` : ""}
      </p>
    </div>
  );
}

/** A return, once the order is delivered: opens the booking form for it. */
export function BookReturn({ ref_, parcels, boxes }: { ref_: string; parcels: Parcel[]; boxes: Boxes }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <WaybillForm ref_={ref_} which="return" parcels={parcels} boxes={boxes} />
  ) : (
    <Button variant="default" size="sm" className="osec__more" onClick={() => setOpen(true)}>
      Book a return
    </Button>
  );
}

/**
 * For a booking whose outcome wasn't known: look for its waybill at The
 * Courier Guy, or, when that can't be done, say it was checked in TCG's
 * portal and not made.
 */
export function SettleShipment({ ref_, which }: { ref_: string; which: Direction }) {
  const { pending, error, notice, run } = useOrderAction();
  const [checked, setChecked] = useState(false);
  return (
    <div className="oform">
      <div className="row">
        <Button onClick={() => run(() => lookUpShipmentAction(ref_, which))} loading={pending}>
          Look it up
        </Button>
        {checked ? (
          <Button variant="light" color="red" onClick={() => run(() => markNotBookedAction(ref_, which))} disabled={pending}>
            Yes, it isn&rsquo;t in TCG&rsquo;s portal
          </Button>
        ) : (
          <Button variant="subtle" onClick={() => setChecked(true)} disabled={pending}>
            I&rsquo;ve checked TCG&rsquo;s portal
          </Button>
        )}
      </div>
      {checked ? (
        <p className="hint">
          Only if you searched TCG&rsquo;s portal for <span className="mono">{which === "return" ? `${ref_}-R` : ref_}</span> and found no waybill. Booking again when one
          exists sends it, and its charge, twice.
        </p>
      ) : null}
      {notice ? (
        <p className="hint" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A booked waybill's actions: read its status now, or cancel it. */
export function ShipmentControls({ ref_, which, collected }: { ref_: string; which: Direction; collected: boolean }) {
  const { pending, error, run } = useOrderAction();
  const [cancelling, setCancelling] = useState(false);
  return (
    <div className="oform">
      <div className="row">
        <Button variant="light" onClick={() => run(() => refreshShipmentAction(ref_, which))} loading={pending && !cancelling}>
          Refresh status
        </Button>
        {collected ? null : cancelling ? (
          <>
            <Button color="red" onClick={() => run(() => cancelShipmentAction(ref_, which), () => setCancelling(false))} loading={pending}>
              Yes, cancel the waybill
            </Button>
            <Button variant="subtle" onClick={() => setCancelling(false)} disabled={pending}>
              Keep it
            </Button>
          </>
        ) : (
          <Button variant="subtle" color="red" onClick={() => setCancelling(true)} disabled={pending}>
            Cancel waybill
          </Button>
        )}
      </div>
      {cancelling ? <p className="hint">TCG refunds it only before collection.</p> : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Proof = { photos: string[]; pdfs: string[]; digital: string | null };

/**
 * A delivered waybill's proof of delivery, read from TCG when asked: the
 * driver's photos and PDFs, and TCG's digital POD. The links TCG signs expire,
 * so they're fetched fresh each time rather than kept.
 */
export function ProofOfDelivery({ ref_, which }: { ref_: string; which: Direction }) {
  const [state, setState] = useState<{ status: "idle" | "loading" } | { status: "done"; proof: Proof } | { status: "error"; error: string }>({ status: "idle" });
  const load = async () => {
    setState({ status: "loading" });
    const r = await proofOfDeliveryAction(ref_, which).catch(() => ({ error: "That didn’t reach the server. Check the connection." }));
    setState("error" in r ? { status: "error", error: r.error } : { status: "done", proof: r });
  };

  if (state.status !== "done") {
    return (
      <div className="oform">
        <div className="row">
          <Button variant="light" onClick={load} loading={state.status === "loading"}>
            Show proof of delivery
          </Button>
        </div>
        {state.status === "error" ? (
          <p className="admin-error" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  const { photos, pdfs, digital } = state.proof;
  return (
    <div className="pod">
      {photos.length ? (
        <ul className="pod__photos" aria-label="Photos the driver took">
          {photos.map((u, i) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" className="pod__photo">
                {/* eslint-disable-next-line @next/next/no-img-element -- a signed link from the courier, not one of the shop's images */}
                <img src={u} alt={`Delivery photo ${i + 1}`} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="osec__lines">
        {[
          ...(digital ? [{ href: digital, text: "Digital proof of delivery" }] : []),
          ...pdfs.map((href, i) => ({ href, text: pdfs.length > 1 ? `Delivery document ${i + 1}` : "Delivery document" })),
        ].map((l, i) => (
          <span key={l.href}>
            {i ? " · " : null}
            <a className="admin-link" href={l.href} target="_blank" rel="noopener noreferrer">
              {l.text} <External size={14} />
            </a>
          </span>
        ))}
      </p>
      <p className="hint">The Courier Guy&rsquo;s links expire. Reload the page for fresh ones.</p>
    </div>
  );
}
