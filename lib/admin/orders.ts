import "server-only";

import { cartUnits } from "@/lib/catalog/cart";
import { EMAIL_NAMES, orderEmails, type OrderEmail } from "@/lib/checkout/emails";
import { contactName } from "@/lib/checkout/details";
import { changeOrder, getOrder, orders } from "@/lib/checkout/orders";
import { hasLeftShop, holdsPhotos, NOTE_MAX, orderPhotos, REF, refundedOf, STAGES, stageLabel, stageUpdate, type NoticeRecord, type Order, type OrderActionResult, type OrderStage } from "@/lib/checkout/order";

/**
 * Orders as the admin reads and works them, always fresh from Firestore.
 * The shop changes only its own side of an order: where it has got to, a
 * refund (`./refunds.ts`), and that an issue has been looked at. What was
 * bought and paid is never changed here. Each change is logged with who
 * made it.
 */

/** The stages of an order still to work on. `stage` is only ever set on a paid order. */
export const OPEN: OrderStage[] = ["new", "making", "ready"];

/** How many of the latest paid orders the list reads besides the open ones, so recent finished orders show. Older ones open by their number. */
const RECENT = 100;

/** An order as its row in the list shows it. */
export type OrderRow = {
  ref: string;
  paid: boolean;
  stage: OrderStage | null;
  flagged: boolean;
  name: string;
  email: string;
  phone: string;
  method: "collect" | "courier";
  units: number;
  /** What was in it ("Photo Mug, A4 Print and 2 more"), so the list can be read without opening each order. */
  what: string;
  /** The customer's photos the shop still holds for printing; 0 once they are deleted. */
  photos: number;
  total: number;
  refunded: number;
  /** When it was paid, or for an unpaid order, last changed. */
  at: string;
};

/** The products in an order, named once each: "Photo Mug and A4 Print", or "Photo Mug, A4 Print and 2 more". */
export function linesWhat(lines: Order["lines"]): string {
  const names = [...new Set(lines.map((l) => l.name))];
  if (names.length <= 2) return names.join(" and ");
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

/** An order as its row: here, and on its customer's page. */
export const orderRow = (o: Order): OrderRow => ({
  ref: o.ref,
  paid: o.status === "paid",
  stage: o.stage ?? null,
  flagged: o.flagged === true,
  name: contactName(o.contact),
  email: o.contact.email,
  phone: o.contact.phone,
  method: o.fulfilment.method,
  units: cartUnits(o.lines),
  what: linesWhat(o.lines),
  photos: holdsPhotos(o) ? orderPhotos(o) : 0,
  total: o.total,
  refunded: refundedOf(o),
  at: o.paidAt ?? o.updatedAt,
});

/**
 * Every order still to make or hand over, every one flagged for a look (paid
 * or not), and the most recent finished ones: what the work needs, without
 * reading the shop's whole history on each visit.
 */
export async function listOrders(): Promise<OrderRow[]> {
  const fields = ["ref", "status", "stage", "flagged", "contact", "fulfilment.method", "lines", "total", "refunds", "paidAt", "updatedAt", "photosDeletedAt"];
  const snaps = await Promise.all([
    orders().where("stage", "in", OPEN).select(...fields).get(),
    orders().where("flagged", "==", true).select(...fields).get(),
    // By `paidAt` alone: a stage filter beside it would need a composite index.
    orders().orderBy("paidAt", "desc").limit(RECENT).select(...fields).get(),
  ]);
  const byRef = new Map(snaps.flatMap((s) => s.docs).map((d) => [d.id, orderRow(d.data() as Order)]));
  return [...byRef.values()].sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * The oldest paid order still to work on besides this one, for the "Next order"
 * link: the one waiting longest, as the list reads. Open orders are few, so it
 * reads their payment times only and sorts here, which needs no index.
 */
export async function nextOrder(ref: string): Promise<{ ref: string; name: string } | null> {
  const snaps = await orders().where("stage", "in", OPEN).select("contact", "paidAt").get();
  const next = snaps.docs
    .filter((d) => d.id !== ref)
    .map((d) => ({ ref: d.id, name: contactName(d.get("contact")), at: (d.get("paidAt") as string | null) ?? "" }))
    .sort((a, b) => a.at.localeCompare(b.at))[0];
  return next ? { ref: next.ref, name: next.name } : null;
}

/** One order with every PayFast notice it received, oldest first. */
export async function getOrderForAdmin(ref: string): Promise<{ order: Order; notices: NoticeRecord[] } | null> {
  if (!REF.test(ref)) return null;
  const [order, notices] = await Promise.all([getOrder(ref), orders().doc(ref).collection("notices").orderBy("at").get()]);
  return order ? { order, notices: notices.docs.map((d) => d.data() as NoticeRecord) } : null;
}

export type { OrderActionResult };

/** A note staff give, for the record: trimmed and held to `NOTE_MAX`, or null when too short to say anything. */
export const cleanNote = (note: unknown) => {
  const s = typeof note === "string" ? note.trim().slice(0, NOTE_MAX) : "";
  return s.length >= 3 ? s : null;
};

/** Sets a paid order's stage (new, being made, ready, done): on with the work, or back or across by hand when the record is wrong. */
export async function setStage(ref: string, stage: unknown, by: string): Promise<OrderActionResult> {
  const done = await changeOrder(ref, by, (o) => {
    if (!(STAGES as readonly unknown[]).includes(stage)) return { error: "That isn’t a stage an order can be at." };
    if (o.status !== "paid") return { error: "Only a paid order can be worked on." };
    if (o.stage === "cancelled") return { error: "This order was cancelled and refunded in full, so there’s no more work on it." };
    if (o.stage === stage) return { error: "The order is already there." };
    return { update: stageUpdate(stage as OrderStage), log: `Moved to ${stageLabel(stage as OrderStage, o.fulfilment.method)}` };
  });
  // A customer collecting hears when it's ready; a delivery is announced by its waybill instead.
  if ("ok" in done && stage === "ready") {
    const order = await getOrder(ref);
    if (order?.fulfilment.method === "collect" && !order.emails?.ready?.ok) await mailCustomer(ref, "ready", by);
  }
  return done;
}

/** Marks an order's issues as looked at. They stay on the order, with what was done. */
export const resolveIssues = (ref: string, note: unknown, by: string) =>
  changeOrder(ref, by, (o) => {
    if (!o.flagged) return { error: "Nothing on this order is waiting to be looked at." };
    const what = cleanNote(note);
    if (!what) return { error: "Say what was done about it, for the record." };
    return { update: { flagged: false }, log: `Looked at the issues: ${what}` };
  });

/**
 * Sends one of a paid order's emails and records how it went in the same
 * write as its log line. `again` is the admin's resend: a new key, so Resend
 * sends it even within a day of the first.
 */
export async function mailCustomer(ref: string, who: OrderEmail, by: string, again = false): Promise<OrderActionResult> {
  const order = await getOrder(ref);
  if (!order) return { error: "There’s no such order." };
  if (order.status !== "paid") return { error: "Only a paid order has emails to send." };
  if (who === "shipped" && !order.shipment?.tracking) return { error: "The order has no waybill to tell the customer about." };
  if (who === "shipped" && !hasLeftShop(order.shipment?.status)) return { error: "The courier hasn’t collected it yet. This email says it has." };
  if (who === "ready" && order.fulfilment.method !== "collect") return { error: "Only an order to collect has a ready email." };
  if (who === "refund" && !order.refunds?.length) return { error: "No refund has been recorded on this order." };
  const sent = (await orderEmails(order, who, again ? `/again-${Date.now()}` : ""))[who]!;
  if (!sent.ok) console.error(`Order email (${who}) failed`, ref, sent.error);
  const done = await changeOrder(ref, by, () => ({
    update: { [`emails.${who}`]: sent },
    log: `Sent ${EMAIL_NAMES[who].toLowerCase()}${again ? " again" : ""}${sent.ok ? "" : " (it failed)"}`,
  }));
  if ("error" in done) return done;
  return sent.ok ? { ok: true } : { error: sent.error ?? "The email didn’t go." };
}

/** The admin's resend of an order's email. */
export async function resendEmail(ref: string, which: unknown, by: string): Promise<OrderActionResult> {
  if (!(typeof which === "string" && which in EMAIL_NAMES)) return { error: "There’s no such email." };
  return mailCustomer(ref, which as OrderEmail, by, true);
}
