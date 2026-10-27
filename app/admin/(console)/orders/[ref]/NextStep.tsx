import { Suspense } from "react";
import { cartUnits } from "@/lib/catalog/cart";
import { itemCount, photoCount, plural, rands } from "@/lib/catalog/listing";
import { missedPayments } from "@/lib/admin/payments";
import { quotedParcels, type Boxes } from "@/lib/checkout/boxes";
import type { Direction } from "@/lib/checkout/courier";
import { hasLeftShop, holdsWaybill, needsLookUp, orderPhotos, statusText, SWEEP_AFTER_DAYS, type Order, type OrderStage } from "@/lib/checkout/order";
import { unitsToReturn } from "@/lib/catalog/stock";
import { dayText, estimateText } from "@/lib/checkout/tracking";
import { Alert, ArrowRight, Check, Clock, External, Printer } from "@/app/site/icons";
import { at } from "../../../when";
import { SettleShipment } from "./CourierActions";
import { PackForm } from "./PackForm";
import { AcceptPayfastRecord, AdvanceStage, ResolveIssues } from "./OrderActions";

type Act = { stage: OrderStage; label: string } | { href: string; label: string; print?: boolean; here?: boolean };

/** What the panel holds under its head: the task itself, done in place. */
type Task = { kind: "pack"; saved: boolean } | { kind: "settle"; which: Direction } | { kind: "issues" } | { kind: "payment" };

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
  if (o.refunding) return { tone: "alert", title: "Check the refund", facts: ["It may or may not have reached PayFast", "On the Payment tab"], acts: [] };
  if (stage === "cancelled") {
    // Cancelled with a waybill still standing: the courier would collect a parcel nobody paid for.
    if (holdsWaybill(s) && !hasLeftShop(s?.status)) return { tone: "alert", title: "Cancel the waybill", facts: ["The order is cancelled and refunded", "In the Courier tab"], acts: [] };
    return { tone: "done", title: "Cancelled and refunded", facts: [...(o.stagedAt?.cancelled ? [`Refunded ${at(o.stagedAt.cancelled)}`] : []), ...(unitsToReturn(o.stock) ? ["Put its stock back on the Payment tab if unused"] : [])], acts: [] };
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
      : { tone: "act", title: "Pack it, then mark ready", facts: ["Boxes and weights", "Booked later, with the day’s other orders"], acts: [], task: { kind: "pack", saved: false } };
  }
  if (collect && stage === "ready") {
    return {
      tone: "wait",
      title: `Waiting for ${o.contact.firstName} to collect`,
      facts: [o.emails?.ready?.ok ? `Ready email sent ${at(o.emails.ready.at)}` : "Ready email not sent"],
      acts: [{ stage: "done", label: "Mark collected" }],
    };
  }
  // Ready to send, or sent with no waybill standing (failed or cancelled): waiting for the day's collection, which is booked from the Dashboard.
  if (!collect && (!s || s.state === "failed" || s.state === "cancelled")) {
    const failed = s?.error ? [`The last booking failed: ${s.error}`] : [];
    if (!o.packed) {
      return { tone: "act", title: "Enter the parcels", facts: ["The courier booking leaves this order out until they’re saved", ...failed], acts: [], task: { kind: "pack", saved: false } };
    }
    return {
      tone: "wait",
      title: "Ready for the courier",
      facts: [plural(o.packed.parcels.length, "parcel", "parcels"), "Booked from the Dashboard, with the other orders that are ready", ...failed],
      acts: [{ href: "/admin", label: "Book the courier", here: true }],
      task: { kind: "pack", saved: true },
    };
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
    <section className={`onext onext--${n.tone}${n.task ? " onext--task" : ""}`} aria-labelledby="next-title">
      <div className="onext__head">
        <span className="onext__icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        {/* Live, so a change of step is announced; the task under it (a form pricing as it's edited) is not. */}
        <div className="onext__text" aria-live="polite">
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
                <a key={a.label} href={a.href} {...(a.here ? {} : { target: "_blank", rel: "noopener" })} className={`onext__btn${i > 0 ? " onext__btn--quiet" : ""}`}>
                  {a.print ? <Printer size={18} /> : null}
                  {a.label}
                  {a.print ? null : a.here ? <ArrowRight size={16} /> : <External size={16} />}
                </a>
              ),
            )}
          </div>
        ) : null}
      </div>

      {n.task ? (
        <div className="onext__task">
          {n.task.kind === "pack" && f.method === "courier" ? (
            <PackForm ref_={o.ref} parcels={o.packed?.parcels ?? quotedParcels(boxes, f.service)} boxes={boxes} saved={n.task.saved} />
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
