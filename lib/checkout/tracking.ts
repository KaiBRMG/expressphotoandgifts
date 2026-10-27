import { fromShopTime, SHOP_TZ } from "@/lib/shopTime";
import { COURIER_TROUBLE, FINAL_STATUSES, hasLeftShop, refundedOf, statusText, trackingWords, type Order, type TrackingEvent } from "./order";

/**
 * An order's progress as the customer follows it: the shop's own stages
 * (paid, being made, ready) joined to The Courier Guy's tracking once a
 * waybill is booked, as one line of steps. Only what the shop or the courier
 * has recorded is shown as done, with the moment it was recorded when known;
 * nothing is promised that neither has said.
 */

export type StepState = "done" | "now" | "next";

export type Step = { key: string; label: string; state: StepState; at?: string; note?: string };

export type Tracking = {
  steps: Step[];
  /** One line on where it is now, for the top of the page. */
  headline: string;
  /** Something has gone wrong with the delivery: the customer should know, and can call. */
  problem: boolean;
  /** Nothing more will change: delivered, collected, or stopped. */
  finished: boolean;
  /** The courier's waybill, events (newest first) and expected delivery, once booked. */
  courier?: { tracking: string; events: TrackingEvent[]; estimate?: { from: string; to: string }; checkedAt?: string };
};

/** A courier status in the customer's words; TCG's own name for any not listed. */
const SAID: Record<string, string> = {
  submitted: "Waybill made",
  "collection-assigned": "A driver is coming to the shop",
  "collection-unassigned": "Waiting for a driver to collect",
  "collection-exception": "A problem collecting it",
  "collection-failed-attempt": "The driver couldn’t collect it",
  collected: "Collected from the shop",
  "at-hub": "At the courier’s depot",
  manifested: "Sorted at the depot",
  "ready-for-dispatch": "Ready to leave the depot",
  "in-transit": "On the road",
  "at-destination-hub": "At the depot near you",
  "delivery-scheduled": "Delivery scheduled",
  "delivery-assigned": "With a delivery driver",
  "delivery-unassigned": "Waiting for a delivery driver",
  "out-for-delivery": "Out for delivery",
  "delivery-exception": "A problem delivering it",
  "delivery-failed-attempt": "The driver couldn’t deliver it",
  "delivery-rejected": "Delivery refused",
  "on-hold": "On hold with the courier",
  damaged: "Reported damaged",
  "under-query": "Under query with the courier",
  "returned-to-hub": "Back at the courier’s depot",
  "return-to-hub": "Going back to the depot",
  "returned-to-sender": "Being returned to the shop",
  undeliverable: "Can’t be delivered",
  delivered: "Delivered",
};

export const eventWords = (status: string) => SAID[status] ?? statusText(status);

const firstAt = (events: TrackingEvent[], match: (s: string) => boolean) => {
  // Events are newest first; the step happened at the earliest of its kind.
  for (let i = events.length - 1; i >= 0; i--) if (match(events[i].status)) return events[i].at;
  return undefined;
};

/**
 * The furthest step reached is the one happening now, and those before it
 * are done; the last step, once reached, is done too. `reached` is by step.
 */
function settle(steps: Omit<Step, "state">[], reached: boolean[]): Step[] {
  const now = reached.lastIndexOf(true);
  const last = steps.length - 1;
  return steps.map((s, i) => ({ ...s, state: i > now ? "next" : i < now || i === last ? "done" : "now" }));
}

/** The key of the step happening now, or the last one once all are done. */
const current = (steps: Step[]) => (steps.find((s) => s.state === "now") ?? steps[steps.length - 1]).key;

/** Where it is, by the step happening now, for the top of the receipt. */
const COLLECT_HEADLINE: Record<string, string> = {
  paid: "Paid and with the shop. It’s next in line to be made.",
  making: "Being made at the shop.",
  ready: "Ready and waiting at the counter. Bring your order number.",
  done: "Collected. Enjoy it.",
};

const COURIER_HEADLINE: Record<string, string> = {
  paid: COLLECT_HEADLINE.paid,
  making: "Being made at the shop. It goes to The Courier Guy once it’s done.",
  booked: "Packed and booked. Waiting for the courier to collect it.",
  collected: "With The Courier Guy, on its way to you.",
  out: "Out for delivery.",
  delivered: "Delivered.",
};

export function trackOrder(o: Order): Tracking | null {
  if (o.status !== "paid") return null;
  const stage = o.stage ?? "new";
  const at = o.stagedAt ?? {};
  const making = stage !== "new";
  const made = making && stage !== "making";
  const paid = { key: "paid", label: "Paid", at: o.paidAt, note: "With the shop, and next in line to be made." };

  // Refunded in full before it left the shop: nothing more is coming.
  if (stage === "cancelled") {
    const steps = settle([paid, { key: "cancelled", label: "Cancelled and refunded", at: at.cancelled }], [true, true]);
    return { steps, headline: "Cancelled, and refunded in full to the card or account you paid with.", problem: false, finished: true };
  }

  if (o.fulfilment.method === "collect") {
    const steps = settle(
      [
        paid,
        { key: "making", label: "Being made", at: at.making, note: "The shop is printing and making your order. We’ll email you when it’s ready." },
        { key: "ready", label: "Ready to collect", at: at.ready, note: "Waiting at the counter. Give your order number when you come in." },
        { key: "done", label: "Collected", at: at.done },
      ],
      [true, making, made, stage === "done"],
    );
    return { steps, headline: COLLECT_HEADLINE[current(steps)], problem: false, finished: stage === "done" };
  }

  const s = o.shipment?.state === "booked" && o.shipment.tracking ? o.shipment : undefined;
  const status = s?.status;
  const events = s?.events ?? [];
  const left = hasLeftShop(status);
  const delivered = status === "delivered";
  const out = delivered || status === "out-for-delivery";
  const problem = !!status && status in COURIER_TROUBLE;

  // Marked Sent by staff without a waybill here: it has left the shop, with nothing to follow.
  const sentByHand = !s && stage === "done";
  const steps = settle(
    [
      paid,
      {
        key: "making",
        label: "Being made",
        at: at.making,
        note: made ? "Made, and being packed for the courier. We’ll email you the tracking number once the courier has collected it." : "The shop is printing and making your order.",
      },
      { key: "booked", label: "Packed and booked", at: s?.at, note: "Booked with The Courier Guy. Waiting for them to collect it from the shop." },
      { key: "collected", label: "With The Courier Guy", at: firstAt(events, hasLeftShop) ?? (sentByHand ? at.done : undefined), note: "On its way to you." },
      { key: "out", label: "Out for delivery", at: firstAt(events, (x) => x === "out-for-delivery"), note: "With the courier’s driver." },
      { key: "delivered", label: "Delivered", at: firstAt(events, (x) => x === "delivered") },
    ],
    [true, making || !!s, !!s, left || sentByHand, out, delivered],
  );

  // A problem shows on the step it happened at, in the shop's plain words.
  if (problem) {
    const here = steps.find((x) => x.state === "now");
    if (here) here.note = trackingWords(status);
  }

  const now = current(steps);
  const headline = problem ? trackingWords(status) : now === "making" && made ? "Made, and being packed for The Courier Guy." : COURIER_HEADLINE[now];

  return {
    steps,
    headline,
    problem,
    finished: sentByHand || (!!status && FINAL_STATUSES.has(status)),
    ...(s ? { courier: { tracking: s.tracking!, events, estimate: delivered ? undefined : s.estimate, checkedAt: s.checkedAt } } : {}),
  };
}

/** Nothing more for the customer to wait for: delivered, collected or stopped, or refunded in full. `t` is its tracking, when already worked out. */
export const orderSettled = (o: Order, t: Tracking | null = trackOrder(o)) => refundedOf(o) >= o.total || t?.finished === true;

const zone = { timeZone: SHOP_TZ } as const;

/** "Tue 20 Oct", in the shop's time zone, so server and browser agree. A bare `YYYY-MM-DD` is that day in the shop. */
export const dayText = (when: string) =>
  (/^\d{4}-\d{2}-\d{2}$/.test(when) ? fromShopTime(`${when} 12:00:00`) : new Date(when)).toLocaleDateString("en-ZA", { ...zone, weekday: "short", day: "numeric", month: "short" });

/** "Tue 20 Oct, 14:05". */
export const momentText = (iso: string) => `${dayText(iso)}, ${new Date(iso).toLocaleTimeString("en-ZA", { ...zone, hour: "2-digit", minute: "2-digit" })}`;

/** "Thu 22 Oct" or "Thu 22 Oct to Fri 23 Oct": the courier's expected delivery days. */
export const estimateText = ({ from, to }: { from: string; to: string }) => {
  const a = dayText(from);
  const b = dayText(to);
  return a === b ? a : `${a} to ${b}`;
};
