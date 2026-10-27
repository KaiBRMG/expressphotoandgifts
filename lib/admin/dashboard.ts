import "server-only";

import { linesWhat, OPEN } from "@/lib/admin/orders";
import { contactName } from "@/lib/checkout/details";
import { DAY_MS, hasLeftShop, holdsWaybill, readyToBook, type Order } from "@/lib/checkout/order";
import { orders } from "@/lib/checkout/orders";
import { shopDate, shopMidnight } from "@/lib/shopTime";

/**
 * What the dashboard reads: the work queue and the day's takings, always
 * fresh from Firestore. The open orders are few (the Orders page reads them
 * all), so the queue reads their fields once rather than counting each stage.
 */

/** A paid order still being made is late once it has waited this long since payment. */
const LATE_AFTER_HOURS = 48;

/** A collection order left in Ready this many days is worth a message to the customer. */
const COLLECT_AFTER_DAYS = 5;

/** A collection booked with no day, or one whose day has passed, is worth a call to the courier once it has waited this long. */
const COLLECT_LATE_HOURS = 48;

const OPEN_FIELDS = [
  "status",
  "contact",
  "paidAt",
  "stage",
  "stagedAt",
  "fulfilment.method",
  "lines",
  "packed",
  "shipment.state",
  "shipment.tracking",
  "shipment.status",
  "shipment.options",
  "shipment.parcels",
  "shipment.at",
  "shipment.checkedAt",
];
const FLAGGED_FIELDS = ["contact", "issues"];

type OpenRow = Partial<Pick<Order, "status" | "contact" | "paidAt" | "stage" | "stagedAt" | "lines" | "packed">> & {
  fulfilment?: { method?: "collect" | "courier" };
  shipment?: Partial<Order["shipment"] & object>;
};
type FlaggedRow = Partial<Pick<Order, "contact" | "issues">>;

/** An order that needs a person, and why in one sentence. */
type Look = { ref: string; name: string; text: string };

/** A courier order packed and waiting for the next collection to be booked. */
export type Waiting = { ref: string; name: string; what: string; parcels: number };

/** An order booked with the courier, who hasn't collected it yet. `date`, `after` and `before` are the collection asked for; `late` when the courier is overdue. */
export type Awaiting = {
  ref: string;
  name: string;
  tracking: string;
  parcels: number;
  date: string | null;
  after: string | null;
  before: string | null;
  late: boolean;
  /** The courier's latest status for it, as the webhook or a check last recorded it, and when that was read. */
  status: string | null;
  checkedAt: string | null;
};

/** Where the shop's deliveries are: what is still being made, what waits for a collection, what the courier has been booked for. */
export type CourierDesk = {
  /** Courier orders paid and not yet marked ready to send. */
  making: number;
  /** Packed with parcels saved: what the next booking takes. */
  ready: Waiting[];
  /** Marked ready to send with no parcels saved: left out of a booking until they are. */
  unpacked: { ref: string; name: string }[];
  /** Booked and waiting for the courier, oldest booking first. */
  booked: Awaiting[];
  /** Courier orders the courier collected today (moved to Sent), so a collection that happened shows. */
  collectedToday: number;
};

export type WorkQueue = {
  counts: { new: number; making: number; readyCollect: number; readySend: number };
  /** Paid orders not yet done: the sum of `counts`. */
  todo: number;
  /** The paid order still to make that has waited longest, with whether that is long enough to be late. */
  oldest: { ref: string; name: string; what: string; paidAt: string; late: boolean } | null;
  /** Every flagged order, paid or not, in the words of its latest issue (a payment that didn't match, a courier's trouble, an oversell). */
  look: Look[];
  /** Collection orders left in Ready past COLLECT_AFTER_DAYS, longest first. */
  collect: { ref: string; name: string; since: string }[];
  courier: CourierDesk;
};

export async function workQueue(now = Date.now()): Promise<WorkQueue> {
  const [open, flagged, sent] = await Promise.all([
    orders().where("stage", "in", OPEN).select(...OPEN_FIELDS).get(),
    orders().where("flagged", "==", true).select(...FLAGGED_FIELDS).get(),
    orders().where("stagedAt.done", ">=", new Date(shopMidnight(now)).toISOString()).select("fulfilment.method").get(),
  ]);

  const counts = { new: 0, making: 0, readyCollect: 0, readySend: 0 };
  const collect: WorkQueue["collect"] = [];
  const courier: CourierDesk = { making: 0, ready: [], unpacked: [], booked: [], collectedToday: sent.docs.filter((d) => d.get("fulfilment.method") === "courier").length };
  const today = shopDate(now);
  let first: { id: string; row: OpenRow } | null = null;

  for (const d of open.docs) {
    const o = d.data() as OpenRow;
    const send = o.fulfilment?.method === "courier";
    if (o.stage === "new" || o.stage === "making") {
      counts[o.stage]++;
      if (send) courier.making++;
      if (o.paidAt && (!first || o.paidAt < first.row.paidAt!)) first = { id: d.id, row: o };
    } else if (o.stage === "ready") {
      const collected = o.fulfilment?.method === "collect";
      counts[collected ? "readyCollect" : "readySend"]++;
      const since = o.stagedAt?.ready ?? o.paidAt;
      if (collected && since && now - Date.parse(since) >= COLLECT_AFTER_DAYS * DAY_MS) collect.push({ ref: d.id, name: contactName(o.contact!), since });
      if (send) {
        const w = o.shipment;
        const name = contactName(o.contact!);
        if (w?.state === "booked" && w.tracking && !hasLeftShop(w.status)) {
          const { collectionDate: date = null, after = null, before = null } = w.options ?? {};
          const late = date ? date < today : now - Date.parse(w.at!) >= COLLECT_LATE_HOURS * 3600_000;
          courier.booked.push({ ref: d.id, name, tracking: w.tracking, parcels: w.parcels?.length ?? 1, date, after, before, late, status: w.status ?? null, checkedAt: w.checkedAt ?? null });
        } else if (readyToBook(o)) {
          courier.ready.push({ ref: d.id, name, what: linesWhat(o.lines ?? []), parcels: o.packed!.parcels.length });
        } else if (!holdsWaybill(w) && !o.packed) {
          courier.unpacked.push({ ref: d.id, name });
        }
      }
    }
  }
  collect.sort((a, b) => a.since.localeCompare(b.since));
  courier.ready.sort((a, b) => a.ref.localeCompare(b.ref));
  courier.booked.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.ref.localeCompare(b.ref));

  const look = flagged.docs.map((d) => {
    const o = d.data() as FlaggedRow;
    return { ref: d.id, name: contactName(o.contact!), text: o.issues?.at(-1)?.text ?? "Something on this order needs a look." };
  });

  const oldest = first && {
    ref: first.id,
    name: contactName(first.row.contact!),
    what: linesWhat(first.row.lines ?? []),
    paidAt: first.row.paidAt!,
    late: now - Date.parse(first.row.paidAt!) >= LATE_AFTER_HOURS * 3600_000,
  };

  return { counts, todo: counts.new + counts.making + counts.readyCollect + counts.readySend, oldest, look, collect, courier };
}

export type Takings = { orders: number; amount: number };

/**
 * What customers have paid since midnight in the shop's time, and what they
 * had paid by this time yesterday (a whole day's total would make every
 * morning look slow). `paidAt` is only ever set by a payment, so it alone
 * says an order is paid. Refunds are the Analytics page's business.
 */
export async function takings(now = Date.now()): Promise<{ today: Takings; yesterday: Takings }> {
  const start = shopMidnight(now);
  const snaps = await orders().where("paidAt", ">=", new Date(start - DAY_MS).toISOString()).select("total", "paidAt").get();
  const today: Takings = { orders: 0, amount: 0 };
  const yesterday: Takings = { orders: 0, amount: 0 };
  for (const d of snaps.docs) {
    const o = d.data() as Pick<Order, "total" | "paidAt">;
    const at = Date.parse(o.paidAt!);
    const into = at >= start ? today : at < now - DAY_MS ? yesterday : null;
    if (!into) continue;
    into.orders++;
    into.amount += o.total;
  }
  return { today, yesterday };
}
