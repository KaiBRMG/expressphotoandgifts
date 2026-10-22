import { Suspense } from "react";
import { cartUnits } from "@/lib/catalog/cart";
import { itemCount, photoCount, rands } from "@/lib/catalog/listing";
import { missedPayments } from "@/lib/admin/payments";
import { quotedParcels, type Boxes } from "@/lib/checkout/boxes";
import type { Direction } from "@/lib/checkout/courier";
import { hasLeftShop, needsLookUp, orderPhotos, statusText, SWEEP_AFTER_DAYS, type Order, type OrderStage } from "@/lib/checkout/order";
import { dayText, estimateText } from "@/lib/checkout/tracking";
import { Alert, ArrowRight, Check, Clock, External, Printer } from "@/app/site/icons";
import { at } from "../../../when";
import { WaybillForm, SettleShipment } from "./CourierActions";
import { AcceptPayfastRecord, AdvanceStage, ResolveIssues } from "./OrderActions";

type Act = { stage: OrderStage; label: string } | { href: string; label: string; print?: boolean };

/** What the panel holds under its head: the task itself, done in place. */
type Task = { kind: "book" } | { kind: "settle"; which: Direction } | { kind: "issues" } | { kind: "payment" };

/** `act`: staff have something to do. `wait`: someone else does. `alert`: something's wrong. `done`: nothing left. */
type Next = { tone: "act" | "wait" | "alert" | "done"; title: string; facts: string[]; acts: Act[]; task?: Task };

/**
 * The one thing the order needs next, from its payment, issues, stage and
 * waybill, in the order the shop works: a problem first, then making it,
 * then handing it over.
 */
export function nextStep(o: Order): Next {
  const f = o.fulfilment;
  const stage = o.stage ?? "new";
  const s = f.method === "courier" ? o.shipment : undefined;
  const r = o.returnShipment;

  // Flagged first, paid or not: an unpaid order's flag is often a payment whose notice was missed, accepted under its issues.
  if (o.flagged) {
    const n = o.issues?.length ?? 1;
    return { tone: "alert", title: n === 1 ? "Resolve 1 issue" : `Resolve ${n} issues`, facts: ["Check PayFast before anything else"], acts: [], task: { kind: "issues" } };
  }
  if (o.status !== "paid") {
    return { tone: "wait", title: "Waiting for payment", facts: ["Nothing to make yet", `Photos deleted ${SWEEP_AFTER_DAYS} days after the last change`], acts: [], task: { kind: "payment" } };
  }
  for (const [which, w] of [["out", s], ["return", r]] as const) {
    if (needsLookUp(w)) return { tone: "alert", title: which === "out" ? "Look up the booking" : "Look up the return", facts: ["It may already be at TCG", "Booking again could charge twice"], acts: [], task: { kind: "settle", which } };
  }
  if (s?.state === "booking" || r?.state === "booking") {
    return { tone: "wait", title: "Booking with The Courier Guy", facts: ["Reload in a moment"], acts: [] };
  }

  if (s?.state === "booked" && s.tracking) {
    const labels = `/admin/orders/${o.ref}/label?which=out&kind=`;
    if (!hasLeftShop(s.status)) {
      return {
        tone: "act",
        title: "Label the parcel",
        facts: [`Waybill ${s.tracking}`, s.options?.collectionDate ? `Collected from ${dayText(s.options.collectionDate)}` : "Collected on TCG's next round"],
        acts: [
          { href: `${labels}waybill`, label: "Print waybill", print: true },
          { href: `${labels}stickers`, label: "Print stickers", print: true },
        ],
      };
    }
    if (s.status !== "delivered") {
      return { tone: "done", title: "With The Courier Guy", facts: [s.status ? statusText(s.status) : "On its way", ...(s.estimate ? [`Expected ${estimateText(s.estimate)}`] : [])], acts: [] };
    }
    return { tone: "done", title: "Delivered", facts: s.checkedAt ? [`Confirmed ${at(s.checkedAt)}`] : ["Confirmed by TCG"], acts: [] };
  }

  const photos = orderPhotos(o);
  const what = [itemCount(cartUnits(o.lines)), ...(photos ? [`${photoCount(photos)} to print`] : [])];
  const collect = f.method === "collect";
  if (stage === "new") return { tone: "act", title: "Start making", facts: [...what, "Tells the customer"], acts: [{ stage: "making", label: "Start making" }] };
  if (stage === "making") {
    return collect
      ? { tone: "act", title: "Mark ready to collect", facts: ["Once it's made", "Emails the customer"], acts: [{ stage: "ready", label: "Ready to collect" }] }
      : { tone: "act", title: "Pack it, then mark ready", facts: ["Booking the courier comes next"], acts: [{ stage: "ready", label: "Ready to send" }] };
  }
  if (collect && stage === "ready") {
    return {
      tone: "wait",
      title: `Waiting for ${o.contact.firstName} to collect`,
      facts: [o.emails?.ready?.ok ? `Ready email sent ${at(o.emails.ready.at)}` : "Ready email not sent"],
      acts: [{ stage: "done", label: "Mark collected" }],
    };
  }
  // Ready to send, or sent with no waybill standing (failed or cancelled): book one.
  if (!collect && (!s || s.state === "failed" || s.state === "cancelled")) {
    return { tone: "act", title: s?.state === "cancelled" ? "Book a new waybill" : "Book The Courier Guy", facts: s?.error ? [s.error] : ["Emails the customer the tracking number"], acts: [], task: { kind: "book" } };
  }
  return { tone: "done", title: collect ? "Collected" : "Sent", facts: ["Nothing left to do"], acts: [] };
}

const ICONS = { act: ArrowRight, wait: Clock, alert: Alert, done: Check };

/** The next step, with its task in place under it. */
export function NextStep({ order: o, boxes }: { order: Order; boxes: Boxes }) {
  const n = nextStep(o);
  const Icon = ICONS[n.tone];
  const f = o.fulfilment;
  return (
    <section className={`onext onext--${n.tone}${n.task ? " onext--task" : ""}`} aria-labelledby="next-title" aria-live="polite">
      <div className="onext__head">
        <span className="onext__icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <div className="onext__text">
          <h2 id="next-title" className="onext__title">
            {n.title}
          </h2>
          <p className="onext__facts">
            {n.facts.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
        </div>
        {n.acts.length ? (
          <div className="onext__acts">
            {n.acts.map((a, i) =>
              "stage" in a ? (
                <AdvanceStage key={a.label} ref_={o.ref} stage={a.stage} label={a.label} />
              ) : (
                <a key={a.label} href={a.href} target="_blank" rel="noopener" className={`onext__btn${i > 0 ? " onext__btn--quiet" : ""}`}>
                  {a.print ? <Printer size={18} /> : null}
                  {a.label}
                  {a.print ? null : <External size={16} />}
                </a>
              ),
            )}
          </div>
        ) : null}
      </div>

      {n.task ? (
        <div className="onext__task">
          {n.task.kind === "book" && f.method === "courier" ? (
            <WaybillForm ref_={o.ref} which="out" parcels={quotedParcels(boxes, f.service)} boxes={boxes} />
          ) : n.task.kind === "settle" ? (
            <SettleShipment ref_={o.ref} which={n.task.which} />
          ) : n.task.kind === "issues" ? (
            <>
              <ul className="onext__issues">
                {o.issues?.map((i) => (
                  <li key={i.at + i.text}>
                    <span className="onext__when">{at(i.at)}</span>
                    {i.text}
                  </li>
                ))}
              </ul>
              {o.status !== "paid" ? (
                <Suspense fallback={<p className="onext__pf onext__pf--wait">Looking in PayFast&rsquo;s record…</p>}>
                  <PayfastLookup order={o} />
                </Suspense>
              ) : null}
              <ResolveIssues ref_={o.ref} />
            </>
          ) : n.task.kind === "payment" ? (
            <Suspense fallback={<p className="onext__pf onext__pf--wait">Looking in PayFast&rsquo;s record…</p>}>
              <PayfastLookup order={o} />
            </Suspense>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** An unpaid order, looked for in PayFast's record: a payment whose notice never arrived can be accepted here. */
async function PayfastLookup({ order: o }: { order: Order }) {
  const missed = await missedPayments(o);
  if (!Array.isArray(missed)) {
    return (
      <p className="onext__pf onext__pf--bad">
        <Alert size={18} /> PayFast&rsquo;s record couldn&rsquo;t be read: {missed.error}
      </p>
    );
  }
  if (!missed.length) return <p className="onext__pf">PayFast has no payment for this order.</p>;
  if (missed.length > 1) {
    return (
      <p className="onext__pf onext__pf--bad">
        <Alert size={18} /> PayFast shows {missed.length} payments, none notified. Refund the extras in PayFast first.
      </p>
    );
  }
  const m = missed[0];
  return (
    <div className="onext__pf onext__pf--found">
      <p>
        PayFast shows <strong>{rands(m.gross)}</strong> paid · <span className="mono">{m.pfPaymentId}</span> · notice never arrived
      </p>
      <AcceptPayfastRecord ref_={o.ref} />
    </div>
  );
}
