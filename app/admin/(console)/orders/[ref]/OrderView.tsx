import Link from "next/link";
import { Suspense } from "react";
import type { PrintSpec } from "@/lib/admin/printSpecs";
import type { Boxes } from "@/lib/checkout/boxes";
import { customerKey } from "@/lib/campaigns";
import { cartSavings } from "@/lib/catalog/campaigns";
import { formatCode } from "@/lib/catalog/codes";
import { rands, signedRands } from "@/lib/catalog/listing";
import { addressLine, deliveryPrice } from "@/lib/checkout/details";
import { EMAIL_NAMES, type OrderEmail } from "@/lib/checkout/emails";
import { COURIER_TROUBLE, fileCount, lineWhat, refundedOf, statusText, type NoticeRecord, type Order, type OrderStage } from "@/lib/checkout/order";
import { ArrowLeft, ArrowRight, Mail, Phone, Printer } from "@/app/site/icons";
import { at, short } from "../../../when";
import { Courier } from "./Courier";
import { NextStep } from "./NextStep";
import { ResendEmail } from "./OrderActions";
import { PaymentPanel } from "./PaymentPanel";
import { PrintSheet, type SheetLine } from "./PrintSheet";
import { RecordTabs, type RecordTab } from "./RecordTabs";
import { StageTrack, type TrackStep } from "./StageTrack";

const stamp = (iso: string | undefined) => (iso ? short(new Date(iso)) : null);

/** The stages as one line of steps, "Paid" standing for the first; a courier order ends at Delivered. */
function trackSteps(o: Order): TrackStep[] {
  const stage = o.stage ?? "new";
  const collect = o.fulfilment.method === "collect";
  const delivered = o.shipment?.state === "booked" && o.shipment.status === "delivered";
  if (stage === "cancelled") {
    return [
      { key: "new", label: "Paid", at: stamp(o.paidAt), state: "done" },
      { key: "done", label: "Cancelled and refunded", at: stamp(o.stagedAt?.cancelled), state: "done" },
    ];
  }
  const steps: { key: OrderStage | "delivered"; label: string; at: string | null }[] = [
    { key: "new", label: "Paid", at: stamp(o.paidAt) },
    { key: "making", label: "Being made", at: stamp(o.stagedAt?.making) },
    { key: "ready", label: collect ? "Ready to collect" : "Ready to send", at: stamp(o.stagedAt?.ready) },
    { key: "done", label: collect ? "Collected" : "Sent", at: stamp(o.stagedAt?.done) },
    ...(collect ? [] : [{ key: "delivered" as const, label: "Delivered", at: delivered ? stamp(o.shipment?.checkedAt) : null }]),
  ];
  // Where the order stands: a collected order is wholly done; a sent one waits on Delivered until TCG confirms it.
  const now = collect && stage === "done" ? steps.length : delivered ? steps.length : steps.findIndex((s) => s.key === stage);
  return steps.map((s, i) => ({ ...s, at: i <= now ? s.at : null, state: i < now ? "done" : i === now ? "now" : "todo" }));
}

/** The order's lines as the print sheet draws them: what to make, flags for the maker, and every file. */
function sheetLines(o: Order, specs: (PrintSpec | null)[]): SheetLine[] {
  return o.lines.map((l, i) => ({
    what: lineWhat(l),
    sku: l.sku,
    // What it really cost after every deal, which is what refunding it alone gives back.
    price: l.paid !== undefined ? `${rands(l.paid)} after deals (listed ${rands(l.price * l.quantity)})` : rands(l.price * l.quantity),
    notes: [...(o.photosDeletedAt && fileCount(l) > 0 ? ["Customer photos deleted"] : []), ...(l.frame?.empty ? ["Frame only, no print"] : []), ...(l.frame?.quote ? ["Quote the print"] : []), ...(l.note ? [`“${l.note}”`] : [])],
    print: specs[i]?.print ?? null,
    shape: specs[i]?.shape ?? null,
    sets: l.sets.map((s, si) => ({
      title: l.sets.length > 1 ? `Unit ${si + 1}` : l.quantity > 1 ? `Same on all ${l.quantity}` : null,
      words: s.words,
      files: o.photosDeletedAt ? [] : s.files,
    })),
  }));
}

/**
 * One order as a workbench: where it is, the one thing to do next (done in
 * place), everything to print, and, beside it, who it's for, how it leaves
 * and what was paid. The records (courier, payment, emails, history) sit in
 * tabs under the work. `next` is the order waiting longest after this one, so
 * a morning's orders can be worked through without going back to the list.
 */
export function OrderView({ order: o, notices, boxes, specs, next }: { order: Order; notices: NoticeRecord[]; boxes: Boxes; specs: (PrintSpec | null)[]; next: { ref: string; name: string } | null }) {
  const paid = o.status === "paid";
  const f = o.fulfilment;
  const s = f.method === "courier" ? o.shipment : undefined;
  const refunded = refundedOf(o);

  const mails = paid
    ? (Object.keys(EMAIL_NAMES) as OrderEmail[]).filter(
        (who) => (who !== "shipped" || o.shipment?.tracking) && (who !== "ready" || f.method === "collect") && (who !== "refund" || o.refunds?.length),
      )
    : [];
  const resolved = !o.flagged && o.issues?.length ? o.issues : [];

  const tabs: RecordTab[] = [
    ...(f.method === "courier" && paid
      ? [
          {
            value: "courier",
            label: "Courier",
            alert: !!(s && (s.state === "failed" || s.state === "unknown" || (s.status && COURIER_TROUBLE[s.status]))),
            panel: <Courier order={o} boxes={boxes} />,
          },
        ]
      : []),
    {
      value: "payment",
      label: "Payment",
      count: notices.length || undefined,
      alert: !!o.flagged && notices.some((n) => n.outcome !== "paid"),
      panel: (
        // PayFast is asked as the tab renders; the rest of the order doesn't wait for it.
        <Suspense fallback={<p className="osec__soft">Asking PayFast…</p>}>
          <PaymentPanel order={o} notices={notices} />
        </Suspense>
      ),
    },
    ...(mails.length
      ? [
          {
            value: "emails",
            label: "Emails",
            alert: mails.some((who) => o.emails?.[who] && !o.emails[who]!.ok),
            panel: (
              <ul className="orows">
                {mails.map((who) => {
                  const sent = o.emails?.[who];
                  return (
                    <li key={who} className="orow">
                      <span className="orow__main">{EMAIL_NAMES[who]}</span>
                      <span className={`orow__state${sent && !sent.ok ? " orow__state--bad" : ""}`}>
                        {sent ? (sent.ok ? `Sent ${at(sent.at)}` : `Failed: ${sent.error ?? "unknown"}`) : "Not sent"}
                      </span>
                      <ResendEmail ref_={o.ref} who={who} />
                    </li>
                  );
                })}
              </ul>
            ),
          },
        ]
      : []),
    ...(o.log?.length || resolved.length
      ? [
          {
            value: "history",
            label: "History",
            count: (o.log?.length ?? 0) + resolved.length || undefined,
            panel: (
              <ul className="orows">
                {[...(o.log ?? []).map((e) => ({ at: e.at, text: e.text, by: e.by })), ...resolved.map((i) => ({ at: i.at, text: `Issue: ${i.text}`, by: "flagged" }))]
                  .sort((a, b) => b.at.localeCompare(a.at))
                  .map((e) => (
                    <li key={e.at + e.text} className="orow">
                      <span className="orow__main">{e.text}</span>
                      <span className="orow__state">
                        {at(e.at)} · {e.by}
                      </span>
                    </li>
                  ))}
              </ul>
            ),
          },
        ]
      : []),
  ];
  const first = tabs.find((t) => t.alert)?.value ?? tabs[0].value;

  return (
    <div className="page order">
      <div className="order__flip">
        <Link href="/admin/orders" className="back">
          <ArrowLeft size={18} />
          Orders
        </Link>
        {next ? (
          <Link href={`/admin/orders/${next.ref}`} className="back back--next">
            Next order: {next.name}
            <ArrowRight size={18} />
          </Link>
        ) : null}
      </div>

      <header className="ohead">
        <h1 className="page__title">
          {o.contact.firstName} {o.contact.lastName}
        </h1>
        <p className="ohead__chips">
          <span className="ochip ochip--ref mono">{o.ref}</span>
          <span className={`ochip ${paid ? "ochip--paid" : "ochip--unpaid"}`}>{paid ? `Paid ${rands(o.total)}` : `Unpaid ${rands(o.total)}`}</span>
          <span className="ochip">{f.method === "collect" ? "Collect" : "Courier"}</span>
          <span className="ohead__placed">Placed {at(o.createdAt)}</span>
          <a className="obtn ohead__receipt" href={`/admin/orders/${o.ref}/receipt`} target="_blank" rel="noopener">
            <Printer size={18} />
            {paid ? "Print receipt" : "Print order summary"}
          </a>
        </p>
      </header>

      {paid ? <StageTrack ref_={o.ref} steps={trackSteps(o)} stage={o.stage ?? "new"} method={f.method} readyEmailed={!!o.emails?.ready?.ok} waybill={o.shipment?.state === "booked"} /> : null}

      <div className="order__grid">
        <div className="order__main">
          <NextStep order={o} boxes={boxes} />
          <PrintSheet ref_={o.ref} lines={sheetLines(o, specs)} />
          <RecordTabs tabs={tabs} first={first} />
        </div>

        <aside className="glance" aria-label="Order at a glance">
          <section className="glance__part" aria-labelledby="who-title">
            <h2 id="who-title" className="glance__title">
              Customer
            </h2>
            <p className="glance__name">
              {o.contact.firstName} {o.contact.lastName}
              {o.uid ? <span className="ochip ochip--quiet">Account</span> : null}
            </p>
            <div className="glance__acts">
              <a className="obtn" href={`tel:${o.contact.phone}`}>
                <Phone size={18} />
                {o.contact.phone}
              </a>
              <a className="obtn obtn--wrap" href={`mailto:${o.contact.email}?subject=${encodeURIComponent(`Your order ${o.ref}`)}`}>
                <Mail size={18} />
                {o.contact.email}
              </a>
            </div>
            {paid ? (
              <Link className="admin-link" href={`/admin/customers/${customerKey(o.contact.email)}`}>
                Everything they’ve ordered
              </Link>
            ) : null}
          </section>

          <section className="glance__part" aria-labelledby="how-title">
            <h2 id="how-title" className="glance__title">
              {f.method === "collect" ? "Collect" : "Deliver"}
            </h2>
            {f.method === "collect" ? (
              <p className="glance__lines">At the counter</p>
            ) : (
              <>
                <p className="glance__lines">
                  {f.recipient ? (
                    <>
                      <strong>{f.recipient.name}</strong>{" "}
                      <a className="admin-link" href={`tel:${f.recipient.phone}`}>
                        {f.recipient.phone}
                      </a>
                      <br />
                    </>
                  ) : null}
                  {addressLine(f.address)}, {f.address.province}
                </p>
                {f.address.notes ? <p className="glance__note">{f.address.notes}</p> : null}
                <p className="glance__chips">
                  <span className="ochip">{f.service.name}</span>
                  {f.service.cover ? <span className="ochip">Insured {rands(f.service.cover)}</span> : null}
                </p>
              </>
            )}
            {s?.state === "booked" && s.tracking ? (
              <div className="glance__waybill">
                <p>
                  <span className="mono">{s.tracking}</span>
                  <span className={`ochip${s.status && COURIER_TROUBLE[s.status] ? " ochip--bad" : ""}`}>{s.status ? statusText(s.status) : "Booked"}</span>
                </p>
                <div className="glance__acts glance__acts--row">
                  <a className="obtn" href={`/admin/orders/${o.ref}/label?which=out&kind=waybill`} target="_blank" rel="noopener">
                    <Printer size={18} /> Waybill
                  </a>
                  <a className="obtn" href={`/admin/orders/${o.ref}/label?which=out&kind=stickers`} target="_blank" rel="noopener">
                    <Printer size={18} /> Stickers
                  </a>
                </div>
              </div>
            ) : null}
          </section>

          <section className="glance__part" aria-labelledby="money-title">
            <h2 id="money-title" className="glance__title">
              Money
            </h2>
            <dl className="glance__sums">
              <div>
                <dt>Items</dt>
                <dd>{rands(o.subtotal)}</dd>
              </div>
              {cartSavings(o).map((s) => (
                <div key={`${s.campaign}/${s.rule}`} className="glance__minus">
                  <dt>
                    <Link href={`/admin/campaigns/${s.campaign}`} className="admin-link">
                      {s.name}
                    </Link>
                  </dt>
                  <dd>{signedRands(-s.amount)}</dd>
                </div>
              ))}
              {o.code ? (
                <div>
                  <dt>One-time code</dt>
                  <dd>{formatCode(o.code)}</dd>
                </div>
              ) : null}
              <div>
                <dt>{f.method === "collect" ? "Collect" : "Delivery"}</dt>
                <dd>{deliveryPrice(o.delivery)}</dd>
              </div>
              <div className="glance__total">
                <dt>{paid ? "Paid" : "Total"}</dt>
                <dd>{rands(o.total)}</dd>
              </div>
              {s?.rate !== undefined ? (
                <div>
                  <dt>TCG charged</dt>
                  <dd>{rands(s.rate)}</dd>
                </div>
              ) : null}
              {refunded ? (
                <div className="glance__minus">
                  <dt>{o.stage === "cancelled" ? "Cancelled, refunded" : "Refunded"}</dt>
                  <dd>−{rands(refunded)}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
