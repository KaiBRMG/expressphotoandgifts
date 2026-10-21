import "server-only";

import { after } from "next/server";

import { rands } from "@/lib/catalog/listing";
import { db } from "@/lib/firebase";
import { rateLimit } from "@/lib/rateLimit";
import { shopDate } from "@/lib/shopTime";
import { shippingBoxes } from "@/lib/settings";
import { readParcels, sized, type Parcel } from "./boxes";
import {
  accountExtras,
  cancelShipment,
  createShipment,
  findShipments,
  priceWaybill,
  proofOfDelivery,
  trackShipment,
  type Booked,
  type BookingOptions,
  type Direction,
  type Extra,
  type Priced,
} from "./courier";
import { orderEmails } from "./emails";
import { DAY_MS, FINAL_STATUSES, hasLeftShop, stageUpdate, needsLookUp, statusText, type Order, type OrderActionResult, type Shipment, type ShipmentOptions } from "./order";
import { changeOrder, getOrder, orders } from "./orders";

/**
 * An order's courier waybills, from booking to delivery: the one out to the
 * customer (`shipment`) and, once that is delivered, a return of it to the
 * shop (`returnShipment`). Staff book each from the admin; The Courier Guy's
 * webhook and a daily check keep their status. TCG documents no idempotency
 * key and its webhooks carry no signature, so:
 *
 * - booking holds the order (`state: "booking"`) before asking TCG, and an
 *   outcome that can't be known (`unknown`) is never retried by itself: staff
 *   look it up (by the waybill's reference among TCG's shipments made around
 *   then) or check TCG's portal first, or it could be sent, and charged, twice;
 * - a webhook only says which shipment to look at: its status is always read
 *   again from TCG with the shop's key.
 */

/** Where each direction's waybill lives on the order. */
const FIELD = { out: "shipment", return: "returnShipment" } as const satisfies Record<Direction, keyof Order>;

const waybillOf = (o: Order, which: Direction) => o[FIELD[which]];

/** "The waybill" or "The return", for the log and staff. */
const NAMED = { out: "waybill", return: "return" } as const;

/** Who the log names for what the courier reported. */
const COURIER = "The Courier Guy";

/** The latest events kept on the order. */
const EVENTS_KEPT = 30;

/** How many waybills the daily check asks TCG about at once: well inside its rate limit. */
const CHECKS_AT_ONCE = 3;

/** How far ahead staff may set the collection day. */
const COLLECT_WITHIN_DAYS = 30;


/** Statuses the shop must act on, in its words. */
const PROBLEMS: Record<string, string> = {
  "collection-exception": "The courier had a problem collecting it.",
  "collection-failed-attempt": "The courier tried to collect it and couldn’t.",
  "delivery-exception": "The courier had a problem delivering it.",
  "delivery-failed-attempt": "The courier tried to deliver it and couldn’t.",
  "delivery-rejected": "The delivery was refused at the door.",
  "on-hold": "The courier is holding it.",
  damaged: "The courier reports it damaged.",
  "under-query": "The courier has it under query.",
  "returned-to-hub": "It went back to the courier’s hub after a failed delivery.",
  "return-to-hub": "It is going back to the courier’s hub.",
  "returned-to-sender": "The courier is returning it to the sender.",
  undeliverable: "The courier says it can’t be delivered.",
  cancelled: "The courier cancelled the waybill.",
  failed: "The courier couldn’t make the waybill.",
  "approval-rejected": "The waybill wasn’t approved on the courier’s account.",
  "payment-pending": "The courier is waiting for payment on the account before it sends it.",
  "payment-failed": "The courier’s payment for the waybill failed.",
  "pending-approval": "The waybill is waiting for approval on the courier’s account.",
};

const MINUTE = 60 * 1000;

type CourierOrder = Order & { fulfilment: Extract<Order["fulfilment"], { method: "courier" }> };

const isCourier = (o: Order): o is CourierOrder => o.fulfilment.method === "courier";

/** "TCG charged R146.28, R10.00 more than the customer paid", for the log. A return has nothing the customer paid to compare. */
const chargeNote = (o: Order, b: Booked, which: Direction) => {
  if (b.rate === undefined) return "";
  if (which === "return") return ` TCG charged ${rands(b.rate)}.`;
  const diff = b.rate - o.delivery;
  return ` TCG charged ${rands(b.rate)}${diff === 0 ? ", what the customer paid" : `, ${rands(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than the customer paid`}.`;
};

/** The waybill as booked, open for the daily check. */
const bookedAs = (s: Shipment, b: Booked): Shipment => {
  const booked: Shipment = { ...s, state: "booked", open: true, ...b };
  delete booked.error;
  return booked;
};

/** After the response: the customer's "on its way" email, recorded on the order. Never throws. */
const emailShipped = (order: Order) =>
  after(async () => {
    const sent = (await orderEmails(order, "shipped")).shipped!;
    await orders()
      .doc(order.ref)
      .update({ "emails.shipped": sent })
      .catch((e) => console.error("Shipped email record not saved", order.ref, e));
  });

// ─── What staff choose ─────────────────────────────────────────────────────────

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Reads the booking options staff sent: a collection day from today to a
 * month out, hours in order, and extras only from those the account offers
 * on this route (read from TCG now), or why not.
 */
async function readOptions(raw: unknown, which: Direction, o: CourierOrder): Promise<{ options: BookingOptions; extras: Extra[] } | { error: string }> {
  const x = (raw ?? {}) as Partial<Record<keyof BookingOptions, unknown>>;
  const date = typeof x.collectionDate === "string" && x.collectionDate ? x.collectionDate : null;
  const today = shopDate();
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > shopDate(Date.now() + COLLECT_WITHIN_DAYS * DAY_MS))) {
    return { error: `Choose a collection day from today to ${COLLECT_WITHIN_DAYS} days ahead.` };
  }
  const time = (v: unknown) => (typeof v === "string" && TIME.test(v) ? v : null);
  const after = time(x.after);
  const before = time(x.before);
  if ((x.after && !after) || (x.before && !before)) return { error: "Collection hours are times like 10:00." };
  if (after && before && after >= before) return { error: "The collection window has to end after it starts." };

  const ids = Array.isArray(x.extras) ? [...new Set(x.extras.filter((id): id is number => Number.isSafeInteger(id)))] : [];
  let extras: Extra[] = [];
  if (ids.length) {
    const offered = await accountExtras(which, o.fulfilment.address);
    if ("error" in offered) return { error: `The courier’s extras couldn’t be checked: ${offered.error}` };
    extras = offered.extras.filter((e) => ids.includes(e.id));
    if (extras.length !== ids.length) return { error: "An extra chosen isn’t offered on the account any more. Reload and choose again." };
  }
  return { options: { collectionDate: date, after, before, extras: extras.map((e) => e.id) }, extras };
}

/** The options as the order keeps them: what was set, and nothing else. */
const keptOptions = ({ collectionDate, after, before }: BookingOptions, extras: Extra[]): ShipmentOptions => ({
  ...(collectionDate ? { collectionDate } : {}),
  ...(after ? { after } : {}),
  ...(before ? { before } : {}),
  ...(extras.length ? { extras: extras.map(({ id, name, charge }) => ({ id, name, charge })) } : {}),
});

/** The service code staff chose for a return; an outbound waybill always goes on the order's own. */
const readCode = (x: unknown) => (typeof x === "string" && /^[\w -]{1,40}$/.test(x) ? x : null);

/** Why a return can't be booked yet, or nothing. */
const returnProblem = (o: Order) => {
  const s = o.shipment;
  if (s?.state !== "booked" || s.status !== "delivered") return "A return can be booked once the courier has delivered the order.";
  return null;
};

// ─── Reading for the booking form ──────────────────────────────────────────────

/** The extras the account offers for this order's waybill (or its return), for the booking form. */
export async function extrasFor(ref: string, which: Direction): Promise<{ ok: true; extras: Extra[] } | { error: string }> {
  const o = await getOrder(ref);
  if (!o || !isCourier(o)) return { error: "This order isn’t sent by courier." };
  return accountExtras(which, o.fulfilment.address);
}

/**
 * What TCG would charge for the waybill as staff have it set up: every
 * service with its price and dates. Outbound, staff compare the order's own
 * service with what the customer paid; for a return, they choose a service.
 */
export async function previewWaybill(
  ref: string,
  which: Direction,
  rawParcels: unknown,
  rawOptions: unknown,
): Promise<{ ok: true; services: Priced[]; booked: string | null; paid: number | null } | { error: string }> {
  const chosen = readParcels(rawParcels);
  if (!chosen) return { error: "Each parcel needs a box and its packed weight." };
  const [o, boxes] = await Promise.all([getOrder(ref), shippingBoxes()]);
  if (!o || !isCourier(o)) return { error: "This order isn’t sent by courier." };
  const parcels = chosen.map((p) => sized(boxes, p));
  const read = await readOptions(rawOptions, which, o);
  if ("error" in read) return read;
  const priced = await priceWaybill({ direction: which, address: o.fulfilment.address, parcels, service: { code: "", cover: o.fulfilment.service.cover }, ...read });
  if ("error" in priced) return priced;
  return { ok: true, services: priced.services, booked: which === "out" ? o.fulfilment.service.code : null, paid: which === "out" ? o.delivery : null };
}

/** A delivered waybill's proof of delivery, read from TCG on request. */
export async function proofFor(ref: string, which: Direction) {
  const o = await getOrder(ref);
  const w = o && waybillOf(o, which);
  if (w?.state !== "booked" || !w.tracking) return { error: "There’s no waybill to read." };
  return proofOfDelivery(w.tracking);
}

// ─── Booking ───────────────────────────────────────────────────────────────────

/**
 * Books a waybill for a paid courier order: out to the customer, or a return
 * of a delivered one, with the parcels and options staff chose. Holds the
 * order first, so a second press, a second tab or a second member of staff
 * can't book it twice.
 */
export async function bookShipment(ref: string, which: Direction, rawParcels: unknown, rawOptions: unknown, rawCode: unknown, by: string): Promise<OrderActionResult> {
  const chosen = readParcels(rawParcels);
  if (!chosen) return { error: "Each parcel needs a box and its packed weight." };
  const [before, boxes] = await Promise.all([getOrder(ref), shippingBoxes()]);
  if (!before || !isCourier(before)) return { error: "This order isn’t sent by courier." };
  const parcels = chosen.map((p) => sized(boxes, p));
  const read = await readOptions(rawOptions, which, before);
  if ("error" in read) return read;
  const code = which === "out" ? before.fulfilment.service.code : readCode(rawCode);
  if (!code) return { error: "Choose the service for the return." };
  const field = FIELD[which];
  const doc = orders().doc(ref);

  const held = await db().runTransaction(async (tx): Promise<{ error: string } | { o: CourierOrder; shipment: Shipment }> => {
    const o = (await tx.get(doc)).data() as Order | undefined;
    if (!o || !isCourier(o)) return { error: "This order isn’t sent by courier." };
    if (o.status !== "paid") return { error: "Only a paid order can be sent." };
    if (which === "return" && returnProblem(o)) return { error: returnProblem(o)! };
    const w = waybillOf(o, which);
    if (w?.state === "booked") return { error: `This order already has a ${NAMED[which]}. Cancel it first to book another.` };
    if (needsLookUp(w)) return { error: "An earlier booking may have reached The Courier Guy. Look it up first, so it isn’t booked twice." };
    if (w?.state === "booking") return { error: "It’s being booked right now. Wait a moment, then reload." };
    const shipment: Shipment = {
      state: "booking",
      at: new Date().toISOString(),
      by,
      parcels,
      options: keptOptions(read.options, read.extras),
    };
    tx.update(doc, { [field]: shipment, updatedAt: shipment.at });
    return { o, shipment };
  });
  if ("error" in held) return held;

  const { o, shipment } = held;
  const result = await createShipment({
    ref,
    direction: which,
    contact: o.contact,
    address: o.fulfilment.address,
    recipient: o.fulfilment.recipient ?? null,
    service: { code, cover: o.fulfilment.service.cover },
    parcels,
    ...read,
    ...(which === "return" ? { returnOf: o.shipment?.short ?? o.shipment?.tracking } : {}),
  });

  const what = `${which === "return" ? "a return" : "The Courier Guy"}${parcelsText(parcels)}`;
  if (result.kind === "booked") {
    const booked = bookedAs(shipment, result.shipment);
    await changeOrder(ref, by, () => ({
      update: { [field]: booked },
      log: `Booked ${what}, waybill ${booked.tracking}.${chargeNote(o, result.shipment, which)}`,
    }));
    if (which === "out") emailShipped({ ...o, shipment: booked });
    return { ok: true };
  }
  if (result.kind === "refused") {
    await changeOrder(ref, by, () => ({
      update: { [field]: { ...shipment, state: "failed", error: result.error } },
      log: `The Courier Guy refused to book ${which === "return" ? "the return" : "it"}: ${result.error}`,
    }));
    return { error: `The Courier Guy refused it: ${result.error}` };
  }
  await changeOrder(ref, by, () => ({
    update: { [field]: { ...shipment, state: "unknown", error: result.error } },
    log: `Booking ${which === "return" ? "the return" : "the courier"} didn’t finish: ${result.error}`,
    issue: `The courier booking${which === "return" ? " of the return" : ""} may or may not have been made (${result.error}). Look it up before booking again.`,
  }));
  return { error: `${result.error} It may still have been booked: press Look it up before trying again.` };
}

const parcelsText = (parcels: Parcel[]) => ` (${parcels.length} parcel${parcels.length === 1 ? "" : "s"})`;

/**
 * Settles a booking whose outcome wasn't known: finds its waybills among
 * those TCG made around the time booking started. One: it is the order's.
 * None: staff can book again. More than one: the first is kept and staff are
 * asked to cancel the others in TCG's portal.
 */
export async function lookUpShipment(ref: string, which: Direction, by: string): Promise<OrderActionResult> {
  const o = await getOrder(ref);
  const s = o && waybillOf(o, which);
  if (!o || !s || !needsLookUp(s)) return { error: "Only a booking that didn’t finish needs looking up." };

  // Booking waits 30 seconds for TCG; the window allows for clocks and queues either side.
  const at = Date.parse(s.at);
  const found = await findShipments(ref, which, new Date(at - 10 * MINUTE), new Date(at + 15 * MINUTE));
  if (!found) return { error: `The Courier Guy couldn’t be asked. Search its portal for the reference ${ref}, then come back.` };

  const field = FIELD[which];
  const [first, ...extra] = found;
  const done = await changeOrder(ref, by, (now) => {
    const w = waybillOf(now, which);
    if (w?.at !== s.at || !needsLookUp(w)) return { error: "The booking changed meanwhile. Reload to see it." };
    if (!first) {
      return {
        update: { [field]: { ...s, state: "failed", error: "The Courier Guy has no waybill for this." } },
        log: `Looked up the booking: The Courier Guy has no ${NAMED[which]} for this order.`,
      };
    }
    return {
      update: { [field]: bookedAs(s, first) },
      log: `Looked up the booking: found waybill ${first.tracking}.${chargeNote(o, first, which)}`,
      ...(extra.length
        ? { issue: `The Courier Guy has ${found.length} waybills for this: ${found.map((f) => f.tracking).join(", ")}. Cancel all but ${first.tracking} in its portal.` }
        : {}),
    };
  });
  if ("error" in done) return done;
  if (!first) return { ok: true, notice: "The Courier Guy has no waybill for this. You can book it again." };
  if (which === "out") emailShipped({ ...o, shipment: bookedAs(s, first) });
  return extra.length ? { ok: true, notice: `Found ${found.length} waybills. Cancel the extra ones in TCG’s portal.` } : { ok: true };
}

/**
 * For when the lookup can't reach TCG: staff have searched TCG's portal for
 * the order's reference, found no waybill, and say so. Then it can be booked.
 */
export const markNotBooked = (ref: string, which: Direction, by: string) =>
  changeOrder(ref, by, (o) => {
    const w = waybillOf(o, which);
    return w && needsLookUp(w)
      ? { update: { [FIELD[which]]: { ...w, state: "failed", error: "Checked in TCG’s portal: not booked." } }, log: "Checked TCG’s portal: the booking wasn’t made." }
      : { error: "Only a booking that didn’t finish can be cleared." };
  });

/** Cancels a waybill with TCG. Its charges are reversed only if the parcel wasn't collected yet. */
export async function cancelOrderShipment(ref: string, which: Direction, by: string): Promise<OrderActionResult> {
  const o = await getOrder(ref);
  const s = o && waybillOf(o, which);
  if (s?.state !== "booked" || !s.tracking) return { error: "There’s no waybill to cancel." };
  const done = await cancelShipment(s.tracking);
  if ("error" in done) return { error: `The Courier Guy didn’t cancel it: ${done.error}` };
  return changeOrder(ref, by, () => ({
    update: { [`${FIELD[which]}.state`]: "cancelled", [`${FIELD[which]}.open`]: false },
    log: `Cancelled ${which === "return" ? "the return, " : ""}waybill ${s.tracking}, with The Courier Guy.`,
  }));
}

// ─── Following ─────────────────────────────────────────────────────────────────

/**
 * Reads a booked waybill's status from TCG and records it: its events, the
 * order moved to Sent once the outbound parcel has left the shop, and
 * anything the shop must act on flagged, with `issue` (what a webhook
 * reported) beside it, all in one write. `staff` for a check from the admin;
 * otherwise the change is the courier's. `tracking` when the caller has it,
 * saving a read.
 */
export async function syncShipment(
  ref: string,
  opts: { which?: Direction; tracking?: string; staff?: string; issue?: string } = {},
): Promise<OrderActionResult> {
  const which = opts.which ?? "out";
  const field = FIELD[which];
  const by = opts.staff ?? COURIER;
  const tracking = opts.tracking ?? (await getOrder(ref).then((o) => (o ? waybillOf(o, which)?.tracking : undefined)));
  const tracked = tracking ? await trackShipment(tracking) : null;
  if (!tracking || !tracked) {
    if (opts.issue) await changeOrder(ref, by, () => ({ update: {}, issue: opts.issue }));
    return { error: tracking ? "The Courier Guy’s tracking couldn’t be read just now. Try again later." : "There’s no waybill to follow." };
  }

  return changeOrder(ref, by, (o) => {
    const s = waybillOf(o, which);
    // Cancelled or rebooked while TCG was asked: this answer is for a waybill the order no longer has.
    if (s?.state !== "booked" || s.tracking !== tracking) return { update: {}, issue: opts.issue };

    const changed = tracked.status !== s.status;
    const sent = which === "out" && changed && hasLeftShop(tracked.status) && o.stage !== "done";
    const problem = changed ? PROBLEMS[tracked.status] : undefined;
    const label = which === "return" ? "Return" : "Courier";
    const issue = [opts.issue, problem && `${which === "return" ? "The return: " : ""}${problem} Waybill ${tracking}; see TCG’s portal for details.`].filter(Boolean).join(" ");
    return {
      update: {
        [`${field}.status`]: tracked.status,
        [`${field}.events`]: tracked.events.slice(0, EVENTS_KEPT),
        [`${field}.checkedAt`]: new Date().toISOString(),
        ...(tracked.estimate ? { [`${field}.estimate`]: tracked.estimate } : {}),
        ...(FINAL_STATUSES.has(tracked.status) ? { [`${field}.open`]: false } : {}),
        ...(sent ? stageUpdate("done") : {}),
      },
      log: changed ? `${label} status: ${statusText(tracked.status)}.${sent ? " Moved to Sent: the courier has it." : ""}` : opts.staff ? `Checked the ${label.toLowerCase()} status: no change.` : undefined,
      issue: issue || undefined,
    };
  });
}

/** How old the courier's status on an order may get before a customer's view of it asks TCG again. */
const STALE_MS = 10 * 60_000;

/** Stops one server asking TCG twice about a waybill while its first answer is on the way. */
const askingNow = rateLimit(1, STALE_MS);

/**
 * For the customer's tracking: when the outbound waybill's status hasn't
 * been read for a while (a webhook missed or slow), asks TCG again after the
 * response is sent. The answer stamps `checkedAt`, which every server sees,
 * so a customer watching or reloading reaches TCG once a window at most.
 */
export function refreshIfStale(o: Order) {
  const s = isCourier(o) ? o.shipment : undefined;
  const tracking = s?.state === "booked" && s.open ? s.tracking : undefined;
  if (!tracking || (s?.checkedAt && Date.now() - Date.parse(s.checkedAt) <= STALE_MS) || !askingNow(o.ref)) return;
  after(() => syncShipment(o.ref, { tracking }).then(() => undefined, (e) => console.error("Courier status not refreshed", o.ref, e)));
}

/** The order carrying a TCG shipment, by the shipment's id, and which of its waybills it is; or null. */
export async function orderForShipment(id: number): Promise<{ ref: string; which: Direction; tracking?: string; open: boolean } | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  for (const which of ["out", "return"] as const) {
    const snap = await orders().where(`${FIELD[which]}.id`, "==", id).select(FIELD[which]).limit(1).get();
    if (snap.empty) continue;
    const s = waybillOf(snap.docs[0].data() as Order, which);
    return { ref: snap.docs[0].id, which, tracking: s?.tracking, open: s?.state === "booked" && s.open === true };
  }
  return null;
}

/**
 * The daily check: every open waybill (out and returns) has its status read
 * again (a webhook missed is caught here), a few at a time, and a booking
 * left half-done by a server that stopped is flagged for staff to look up.
 */
export async function checkShipments(): Promise<{ checked: number; failed: number; stuck: number }> {
  const directions = ["out", "return"] as const;
  const [open, booking] = await Promise.all([
    Promise.all(directions.map((which) => orders().where(`${FIELD[which]}.open`, "==", true).select(FIELD[which]).get())),
    Promise.all(directions.map((which) => orders().where(`${FIELD[which]}.state`, "==", "booking").select(FIELD[which]).get())),
  ]);

  const stuck = directions.flatMap((which, i) => booking[i].docs.filter((d) => needsLookUp(waybillOf(d.data() as Order, which))).map((d) => ({ ref: d.id, which })));
  await Promise.all(
    stuck.map(({ ref, which }) =>
      changeOrder(ref, COURIER, (o) =>
        needsLookUp(waybillOf(o, which))
          ? {
              update: { [`${FIELD[which]}.state`]: "unknown", [`${FIELD[which]}.error`]: "The booking stopped before The Courier Guy’s answer was recorded." },
              issue: `A courier booking${which === "return" ? " of a return" : ""} stopped half-way. Look it up before booking again.`,
            }
          : { error: "Settled meanwhile." },
      ),
    ),
  );

  const queue = directions.flatMap((which, i) => open[i].docs.map((d) => ({ ref: d.id, which, tracking: waybillOf(d.data() as Order, which)?.tracking })));
  let checked = 0;
  let failed = 0;
  await Promise.all(
    Array.from({ length: CHECKS_AT_ONCE }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const done = await syncShipment(next.ref, { which: next.which, tracking: next.tracking }).catch((e) => ({ error: String(e) }));
        if ("error" in done) failed++;
        else checked++;
      }
    }),
  );
  return { checked, failed, stuck: stuck.length };
}

