"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Modal, Select, TextInput } from "@mantine/core";
import type { Waiting } from "@/lib/admin/dashboard";
import { COLLECTION_MAX } from "@/lib/checkout/order";
import { plural } from "@/lib/catalog/listing";
import type { CollectionLine } from "@/lib/checkout/shipments";
import { bookCollectionAction } from "@/app/admin/actions";
import { Alert, Check, Printer, Truck } from "@/app/site/icons";
import { TIMES, shopDay } from "./orders/[ref]/CourierActions";

type Done = { lines: CollectionLine[] } | { error: string };

/**
 * The dashboard's Book courier collection. The dialog lists exactly the
 * orders that will be booked (the list as it stood when it opened, which is
 * also what the server is told, so an order that became ready meanwhile waits
 * for the next one), asks for the collection day and hours, and then books
 * them together: one waybill each, one collection window for all. It ends on
 * what came of every order, with the waybills to print.
 */
export function BookCollection({ ready, unpacked, configured, shop }: { ready: Waiting[]; unpacked: { ref: string; name: string }[]; configured: boolean; shop: { address: string; phone: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Waiting[]>([]);
  const [date, setDate] = useState("");
  const [after, setAfter] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [limits] = useState(() => ({ min: shopDay(), max: shopDay(30) }));

  const parcels = list.reduce((n, o) => n + o.parcels, 0);
  const named = new Map(list.map((o) => [o.ref, o]));
  const why = !configured ? "The Courier Guy isn’t set up." : ready.length === 0 ? "Pack an order and mark it ready to send, and it can be booked here." : null;

  const show = () => {
    setList(ready.slice(0, COLLECTION_MAX));
    setDone(null);
    setOpen(true);
  };
  const book = () =>
    start(async () => {
      const r = await bookCollectionAction(
        list.map((o) => o.ref),
        { collectionDate: date || null, after, before },
      ).catch((): Done => ({ error: "That didn’t reach the server. Some orders may have been booked. Close this and reload the dashboard to see which before booking again." }));
      setDone("error" in r ? { error: r.error } : { lines: r.lines });
      router.refresh();
    });

  return (
    <div className="courier__act">
      <Button size="md" leftSection={<Truck size={20} />} onClick={show} disabled={!!why} fullWidth>
        Book courier collection
      </Button>
      {why ? <p className="courier__why">{why}</p> : null}

      <Modal opened={open} onClose={() => !pending && setOpen(false)} title="Book courier collection" centered radius="lg" size="lg" closeOnClickOutside={!pending} closeOnEscape={!pending}>
        {done ? (
          <Result done={done} named={named} onClose={() => setOpen(false)} />
        ) : (
          <div className="stack">
            <p className="cbook__lead" role="status">
              <strong>{plural(parcels, "parcel", "parcels")}</strong> from <strong>{plural(list.length, "order", "orders")}</strong> will be booked with The Courier Guy.
            </p>

            <ul className="cbook__orders" aria-label="Orders to book">
              {list.map((o) => (
                <li key={o.ref}>
                  <span className="cbook__who">
                    <span>
                      <span className="mono">{o.ref}</span> {o.name}
                    </span>
                    <span className="cbook__what">{o.what}</span>
                  </span>
                  <span className="cbook__n">{plural(o.parcels, "parcel", "parcels")}</span>
                </li>
              ))}
            </ul>

            {ready.length > list.length ? (
              <p className="cbook__skip">
                <Alert size={18} />
                <span>{plural(ready.length - list.length, "more order waits", "more orders wait")} for the next booking, which takes at most {COLLECTION_MAX}.</span>
              </p>
            ) : null}

            {unpacked.length ? (
              <p className="cbook__skip">
                <Alert size={18} />
                <span>
                  Left out, no parcels saved:{" "}
                  {unpacked.map((o, i) => (
                    <span key={o.ref}>
                      {i ? ", " : ""}
                      <Link href={`/admin/orders/${o.ref}`} className="admin-link">
                        {o.name}
                      </Link>
                    </span>
                  ))}
                  .
                </span>
              </p>
            ) : null}

            <fieldset className="cbook__when">
              <legend className="osec__sub">Collection</legend>
              <div className="row">
                <TextInput
                  type="date"
                  label="Collect from"
                  description="Blank: the next round (same day before 15:00)"
                  min={limits.min}
                  max={limits.max}
                  value={date}
                  onChange={(e) => setDate(e.currentTarget.value)}
                  disabled={pending}
                />
                <Select label="Between" placeholder="Any time" data={TIMES} value={after} onChange={setAfter} clearable disabled={pending} />
                <Select label="And" placeholder="Any time" data={TIMES.filter((t) => !after || t > after)} value={before} onChange={setBefore} clearable disabled={pending} />
              </div>
            </fieldset>

            <p className="hint">
              The driver collects from {shop.address} and will call {shop.phone}. Every order gets its own waybill, all with this one collection. Customers are emailed once the courier has
              collected, not now.
            </p>

            <div className="confirm__actions">
              <Button variant="subtle" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={book} loading={pending} disabled={list.length === 0}>
                Book {plural(parcels, "parcel", "parcels")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const OUTCOME = {
  booked: "Booked",
  refused: "The Courier Guy refused it",
  unsure: "Not sure it was booked",
  left: "Left for later",
} as const;

/** What came of each order, then the waybills to print for those booked. */
function Result({ done, named, onClose }: { done: Done; named: Map<string, Waiting>; onClose: () => void }) {
  if ("error" in done) {
    return (
      <div className="stack">
        <p className="admin-error" role="alert">
          {done.error}
        </p>
        <div className="confirm__actions">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }
  const booked = done.lines.filter((l) => l.outcome === "booked").length;
  const rest = done.lines.length - booked;
  return (
    <div className="stack">
      <p className="cbook__lead" role="status">
        <strong>{plural(booked, "order", "orders")}</strong> booked{rest ? `, ${rest} not` : ""}.
      </p>
      <ul className="cbook__orders" aria-label="What came of each order">
        {done.lines.map((l) => {
          const o = named.get(l.ref);
          const ok = l.outcome === "booked";
          return (
            <li key={l.ref} className={ok ? undefined : "cbook__bad"}>
              <span className="cbook__who">
                <span>
                  {ok ? <Check size={18} /> : <Alert size={18} />}
                  <span className="mono">{l.ref}</span> {o?.name}
                </span>
                <span className="cbook__what">{ok ? OUTCOME.booked : `${OUTCOME[l.outcome]}${l.text ? `: ${l.text}` : ""}`}</span>
              </span>
              {ok ? (
                <span className="courier__links">
                  <a className="obtn" href={`/admin/orders/${l.ref}/label?which=out&kind=waybill`} target="_blank" rel="noopener">
                    <Printer size={18} /> Waybill
                  </a>
                  <a className="obtn" href={`/admin/orders/${l.ref}/label?which=out&kind=stickers`} target="_blank" rel="noopener">
                    <Printer size={18} /> Stickers
                  </a>
                </span>
              ) : (
                <Link href={`/admin/orders/${l.ref}`} className="admin-link">
                  Open order
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <div className="confirm__actions">
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
