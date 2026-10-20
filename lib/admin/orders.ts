import "server-only";

import { FieldValue, type Query } from "firebase-admin/firestore";

import { cartUnits } from "@/lib/catalog/cart";
import { rands } from "@/lib/catalog/listing";
import { orderEmails } from "@/lib/checkout/emails";
import { db } from "@/lib/firebase";
import { getOrder, orders } from "@/lib/checkout/orders";
import { NOTE_MAX, REF, refundedOf, STAGES, stageLabel, type LogEntry, type NoticeRecord, type Order, type OrderStage, type Refund } from "@/lib/checkout/order";

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

export type OrderActionResult = { ok: true } | { error: string };

/**
 * Changes an order in a transaction: `fn` reads it and returns the update and
 * the log line, or an error. Only ever for an order that exists.
 */
async function change(
  ref: string,
  by: string,
  fn: (o: Order) => { update: Record<string, unknown>; log: string } | { error: string },
): Promise<OrderActionResult> {
  if (!REF.test(ref)) return { error: "There’s no such order." };
  const doc = orders().doc(ref);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(doc);
    if (!snap.exists) return { error: "There’s no such order." };
    const made = fn(snap.data() as Order);
    if ("error" in made) return made;
    const now = new Date().toISOString();
    const entry: LogEntry = { at: now, by, text: made.log };
    tx.update(doc, { ...made.update, updatedAt: now, log: FieldValue.arrayUnion(entry) });
    return { ok: true } as const;
  });
}

/** A note staff give, for the record: trimmed and held to `NOTE_MAX`, or null when too short to say anything. */
const cleanNote = (note: unknown) => {
  const s = typeof note === "string" ? note.trim().slice(0, NOTE_MAX) : "";
  return s.length >= 3 ? s : null;
};

/** Moves a paid order along: new, being made, ready, done. */
export const setStage = (ref: string, stage: unknown, by: string) =>
  change(ref, by, (o) => {
    if (!STAGES.includes(stage as OrderStage)) return { error: "That isn’t a stage an order can be at." };
    if (o.status !== "paid") return { error: "Only a paid order can be worked on." };
    if (o.stage === stage) return { error: "The order is already there." };
    return { update: { stage }, log: `Moved to ${stageLabel(stage as OrderStage, o.fulfilment.method)}` };
  });

/**
 * Records a refund the shop has made in PayFast's dashboard. Never more,
 * across every refund, than the order's total.
 */
export const recordRefund = (ref: string, amount: unknown, note: unknown, by: string) =>
  change(ref, by, (o) => {
    if (o.status !== "paid") return { error: "Only a paid order can be refunded." };
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) return { error: "Enter the amount refunded, in rands." };
    const left = o.total - refundedOf(o);
    if (amount > left) return { error: `That’s more than is left to refund (${rands(left)}).` };
    const why = cleanNote(note);
    if (!why) return { error: "Say why it was refunded, for the record." };
    const refund: Refund = { at: new Date().toISOString(), by, amount, note: why };
    return { update: { refunds: FieldValue.arrayUnion(refund) }, log: `Recorded a refund of ${rands(amount)}: ${why}` };
  });

/** Marks an order's issues as looked at. They stay on the order, with what was done. */
export const resolveIssues = (ref: string, note: unknown, by: string) =>
  change(ref, by, (o) => {
    if (!o.flagged) return { error: "Nothing on this order is waiting to be looked at." };
    const what = cleanNote(note);
    if (!what) return { error: "Say what was done about it, for the record." };
    return { update: { flagged: false }, log: `Looked at the issues: ${what}` };
  });

/** Sends a paid order's email again, to the shop or the customer, and records how it went in the same write as its log line. */
export async function resendEmail(ref: string, who: unknown, by: string): Promise<OrderActionResult> {
  if (who !== "shop" && who !== "customer") return { error: "Send it to the shop or the customer." };
  const order = await getOrder(ref);
  if (!order) return { error: "There’s no such order." };
  if (order.status !== "paid") return { error: "Only a paid order has emails to send." };
  const sent = (await orderEmails(order, who, `/again-${Date.now()}`))[who]!;
  const done = await change(ref, by, () => ({
    update: { [`emails.${who}`]: sent },
    log: `Sent the ${who === "shop" ? "shop’s" : "customer’s"} email again${sent.ok ? "" : " (it failed)"}`,
  }));
  if ("error" in done) return done;
  return sent.ok ? { ok: true } : { error: sent.error ?? "The email didn’t go." };
}
