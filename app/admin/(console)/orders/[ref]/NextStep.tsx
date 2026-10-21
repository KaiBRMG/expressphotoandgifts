import { cartUnits } from "@/lib/catalog/cart";
import { itemCount, photoCount } from "@/lib/catalog/listing";
import { hasLeftShop, needsLookUp, orderPhotos, statusText, type Order, type OrderStage } from "@/lib/checkout/order";
import { dayText, estimateText } from "@/lib/checkout/tracking";
import { ArrowDown, External } from "@/app/site/icons";
import { at } from "../../../when";
import { AdvanceStage } from "./OrderActions";

type Act = { stage: OrderStage; label: string } | { href: string; label: string; external?: boolean };

/** `act`: staff have something to do. `wait`: someone else does. `alert`: something's wrong. `done`: nothing left. */
type Next = { tone: "act" | "wait" | "alert" | "done"; title: string; detail: string; acts: Act[] };

/**
 * The one thing the order needs next, from its payment, issues, stage and
 * waybill, in the order the shop works: a problem first, then making it,
 * then handing it over. Every other control on the page stays where it is;
 * this only says which one is next, and offers it.
 */
export function nextStep(o: Order): Next {
  const f = o.fulfilment;
  const stage = o.stage ?? "new";
  const s = f.method === "courier" ? o.shipment : undefined;
  const r = o.returnShipment;

  if (o.status !== "paid") {
    return {
      tone: "wait",
      title: "Waiting for payment",
      detail: "Nothing to make until PayFast confirms it. If the customer says they paid, check the payment against PayFast below.",
      acts: [{ href: "#pay-title", label: "See the payment" }],
    };
  }
  if (o.flagged) {
    return {
      tone: "alert",
      title: "Look at what’s flagged",
      detail: (o.issues?.length ?? 1) === 1 ? "An issue on this order needs a look before anything else." : `${o.issues!.length} issues on this order need a look before anything else.`,
      acts: [{ href: "#issues-title", label: "See the issues" }],
    };
  }
  if (needsLookUp(s) || needsLookUp(r)) {
    return {
      tone: "alert",
      title: "Look up the courier booking",
      detail: "A booking didn’t finish and may have reached The Courier Guy. Look it up before booking again, so it isn’t sent and charged twice.",
      acts: [{ href: "#ship-title", label: "Go to Courier" }],
    };
  }
  if (s?.state === "booking" || r?.state === "booking") {
    return { tone: "wait", title: "Booking with The Courier Guy", detail: "Reload in a moment to see the waybill.", acts: [] };
  }

  if (s?.state === "booked" && s.tracking) {
    const labels = `/admin/orders/${o.ref}/label?which=out&kind=`;
    if (!hasLeftShop(s.status)) {
      const when = s.options?.collectionDate ? ` The courier collects from ${dayText(s.options.collectionDate)}.` : " The courier collects on its next round.";
      return {
        tone: "act",
        title: "Label the parcel for collection",
        detail: `Waybill ${s.tracking} is booked. Print the waybill and stickers and put them on the parcel.${when}`,
        acts: [
          { href: `${labels}waybill`, label: "Print the waybill", external: true },
          { href: `${labels}stickers`, label: "Parcel stickers", external: true },
        ],
      };
    }
    if (s.status !== "delivered") {
      return {
        tone: "done",
        title: "With The Courier Guy",
        detail: `${s.status ? statusText(s.status) : "On its way"}${s.estimate ? `, expected ${estimateText(s.estimate)}` : ""}. Nothing to do unless the courier reports a problem; it’s flagged here if so.`,
        acts: [],
      };
    }
    return { tone: "done", title: "Delivered", detail: s.checkedAt ? `The courier confirmed delivery; read ${at(s.checkedAt)}.` : "The courier confirmed delivery.", acts: [] };
  }

  const photos = orderPhotos(o);
  const what = `${itemCount(cartUnits(o.lines))}${photos ? `, ${photoCount(photos)} to print` : ""}`;
  if (stage === "new") {
    return { tone: "act", title: "Start making it", detail: `${what}. Moving it on tells the customer it’s being made.`, acts: [{ stage: "making", label: "Start making" }] };
  }
  if (stage === "making") {
    const collect = f.method === "collect";
    return {
      tone: "act",
      title: collect ? "Mark it ready to collect" : "Pack it, then mark it ready to send",
      detail: collect ? "Once it’s made. The customer is emailed that it’s waiting at the counter." : "Once it’s made and packed. Booking the courier comes next.",
      acts: [{ stage: "ready", label: collect ? "Ready to collect" : "Ready to send" }],
    };
  }
  if (stage === "ready") {
    if (f.method === "collect") {
      const mailed = o.emails?.ready?.ok ? `emailed ${at(o.emails.ready.at)}` : "not emailed yet: send it under Emails";
      return {
        tone: "wait",
        title: `Waiting for ${o.contact.firstName} to collect`,
        detail: `Ready at the counter (${mailed}). Mark it collected when it’s handed over.`,
        acts: [{ stage: "done", label: "Mark collected" }],
      };
    }
    return {
      tone: "act",
      title: "Book The Courier Guy",
      detail: "Choose the boxes and packed weights under Courier. Booking emails the customer the tracking number.",
      acts: [{ href: "#ship-title", label: "Book the courier" }],
    };
  }
  return { tone: "done", title: f.method === "collect" ? "Collected" : "Sent", detail: "Nothing left to do on this order.", acts: [] };
}

/** The next step, held at the top of the page as staff scroll. */
export function NextStep({ order }: { order: Order }) {
  const n = nextStep(order);
  return (
    <section className={`onext onext--${n.tone}`} aria-labelledby="next-title" aria-live="polite">
      <div className="onext__text">
        <h2 id="next-title" className="onext__title">
          {n.title}
        </h2>
        <p className="onext__detail">{n.detail}</p>
      </div>
      {n.acts.length ? (
        <div className="onext__acts">
          {n.acts.map((a, i) =>
            "stage" in a ? (
              <AdvanceStage key={a.label} ref_={order.ref} stage={a.stage} label={a.label} />
            ) : (
              <a
                key={a.label}
                href={a.href}
                className={`onext__btn${i > 0 ? " onext__btn--quiet" : ""}`}
                {...(a.external ? { target: "_blank", rel: "noopener" } : {})}
              >
                {a.label}
                {a.external ? <External size={16} /> : <ArrowDown size={16} />}
              </a>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
