import "server-only";

import { FieldValue, type Query } from "firebase-admin/firestore";

import { cartUnits } from "@/lib/catalog/cart";
import { rands } from "@/lib/catalog/listing";
import { EMAIL_NAMES, orderEmails, type OrderEmail } from "@/lib/checkout/emails";
import { changeOrder, getOrder, orders } from "@/lib/checkout/orders";
import { NOTE_MAX, REF, refundedOf, STAGES, stageLabel, stageUpdate, type NoticeRecord, type Order, type OrderActionResult, type OrderStage, type Refund } from "@/lib/checkout/order";

/**
 * Orders as the admin reads and works them, always fresh from Firestore.
 * The shop changes only its own side of an order: where it has got to, a
 * refund made in PayFast, and that an issue has been looked at. What was
 * bought and paid is never changed here. Each change is logged with who
 * made it.
 */

/** The stages of an order still to work on. `stage` is only ever set on a paid order. */
const OPEN: OrderStage[] = ["new", "making", "ready"];

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
  total: number;
  refunded: number;
  /** When it was paid, or for an unpaid order, last changed. */
  at: string;
};

const toRow = (o: Order): OrderRow => ({
  ref: o.ref,
  paid: o.status === "paid",
  stage: o.stage ?? null,
  flagged: o.flagged === true,
  name: `${o.contact.firstName} ${o.contact.lastName}`,
  email: o.contact.email,
  phone: o.contact.phone,
  method: o.fulfilment.method,
  units: cartUnits(o.lines),
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
  const fields = ["ref", "status", "stage", "flagged", "contact", "fulfilment.method", "lines", "total", "refunds", "paidAt", "updatedAt"];
  const snaps = await Promise.all([
    orders().where("stage", "in", OPEN).select(...fields).get(),
    orders().where("flagged", "==", true).select(...fields).get(),
    // By `paidAt` alone: a stage filter beside it would need a composite index.
    orders().orderBy("paidAt", "desc").limit(RECENT).select(...fields).get(),
  ]);
  const byRef = new Map(snaps.flatMap((s) => s.docs).map((d) => [d.id, toRow(d.data() as Order)]));
  return [...byRef.values()].sort((a, b) => b.at.localeCompare(a.at));
}

/** The dashboard's numbers: orders at each open stage, and how many need a look. One read each, however many orders there are. */
export async function countOrders(): Promise<{ stages: Record<(typeof OPEN)[number], number>; flagged: number }> {
  const count = async (q: Query) => (await q.count().get()).data().count;
  const [flagged, ...stages] = await Promise.all([count(orders().where("flagged", "==", true)), ...OPEN.map((s) => count(orders().where("stage", "==", s)))]);
  return { stages: Object.fromEntries(OPEN.map((s, i) => [s, stages[i]])) as Record<(typeof OPEN)[number], number>, flagged };
}

/** One order with every PayFast notice it received, oldest first. */
export async function getOrderForAdmin(ref: string): Promise<{ order: Order; notices: NoticeRecord[] } | null> {
  if (!REF.test(ref)) return null;
  const [order, notices] = await Promise.all([getOrder(ref), orders().doc(ref).collection("notices").orderBy("at").get()]);
  return order ? { order, notices: notices.docs.map((d) => d.data() as NoticeRecord) } : null;
}

export type { OrderActionResult };

/** A note staff give, for the record: trimmed and held to `NOTE_MAX`, or null when too short to say anything. */
const cleanNote = (note: unknown) => {
  const s = typeof note === "string" ? note.trim().slice(0, NOTE_MAX) : "";
  return s.length >= 3 ? s : null;
};

/** Moves a paid order along: new, being made, ready, done. */
export async function setStage(ref: string, stage: unknown, by: string): Promise<OrderActionResult> {
  const done = await changeOrder(ref, by, (o) => {
    if (!STAGES.includes(stage as OrderStage)) return { error: "That isn’t a stage an order can be at." };
    if (o.status !== "paid") return { error: "Only a paid order can be worked on." };
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

/**
 * Records a refund the shop has made in PayFast's dashboard. Never more,
 * across every refund, than the order's total.
 */
export async function recordRefund(ref: string, amount: unknown, note: unknown, by: string): Promise<OrderActionResult> {
  const done = await changeOrder(ref, by, (o) => {
    if (o.status !== "paid") return { error: "Only a paid order can be refunded." };
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) return { error: "Enter the amount refunded, in rands." };
    const left = o.total - refundedOf(o);
    if (amount > left) return { error: `That’s more than is left to refund (${rands(left)}).` };
    const why = cleanNote(note);
    if (!why) return { error: "Say why it was refunded, for the record." };
    const refund: Refund = { at: new Date().toISOString(), by, amount, note: why };
    return { update: { refunds: FieldValue.arrayUnion(refund) }, log: `Recorded a refund of ${rands(amount)}: ${why}` };
  });
  if ("ok" in done) await mailCustomer(ref, "refund", by);
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
async function mailCustomer(ref: string, who: OrderEmail, by: string, again = false): Promise<OrderActionResult> {
  const order = await getOrder(ref);
  if (!order) return { error: "There’s no such order." };
  if (order.status !== "paid") return { error: "Only a paid order has emails to send." };
  if (who === "shipped" && !order.shipment?.tracking) return { error: "The order has no waybill to tell the customer about." };
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
