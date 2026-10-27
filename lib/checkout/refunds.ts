import { rands } from "@/lib/catalog/listing";
import { hasLeftShop, lineWhat, refundedOf, type Order, type OrderLine, type RefundLine } from "./order";

/**
 * What a refund gives back, by the terms (`app/terms/page.tsx`, clauses 9 to
 * 11 and the collection and delayed-delivery terms), worked out the same in
 * the admin's form and on the server that makes it:
 *
 * - each unit at what was actually paid for it after every deal (11.4, 2.8),
 *   never more across refunds than its line came to;
 * - delivery only where the terms give it back: the whole order cancelled
 *   before it left the shop, a cooling-off return, our fault, or a parcel no
 *   longer needed (11.5, 10.4, "Delayed deliveries"), and only once;
 * - less what the terms let the shop keep, with a reason: the courier's
 *   charge for a change-of-mind return (9.6), the work already done on a
 *   personalised item cancelled once started, up to its price (10.2), or the
 *   cost of keeping an order never collected ("Collection");
 * - never a change-of-mind return of personalised goods (9.6, ECTA s42(2)),
 *   nor a cancellation, as such, of something already sent (10.3).
 *
 * The money goes back through PayFast to the card or account paid with
 * (11.1); a deal's code isn't given back (2.8). Cents throughout.
 */

export const REFUND_REASONS = {
  cancelled: { label: "The customer cancelled before it left the shop", terms: "10.2, 10.3", keep: "Work already done on personalised items" },
  unsupplied: { label: "We can’t supply it: sold out, a price error, or a photo we can’t print", terms: "10.4", keep: null },
  late: { label: "Not ready or sent within 30 days of payment", terms: "10.5", keep: null },
  faulty: { label: "Faulty, damaged in delivery, or our mistake", terms: "9.1", keep: null },
  returned: { label: "Returned within 7 days of delivery: a change of mind", terms: "9.6", keep: "The courier’s charge to return it" },
  uncollected: { label: "Never collected", terms: "Collection", keep: "The cost of keeping it" },
  goodwill: { label: "A goodwill gesture", terms: "", keep: "Not given back" },
} as const satisfies Record<string, { label: string; terms: string; keep: string | null }>;

export type RefundReason = keyof typeof REFUND_REASONS;

export const isRefundReason = (x: unknown): x is RefundReason => typeof x === "string" && Object.hasOwn(REFUND_REASONS, x);

/**
 * What staff choose: the reason, how many of each line's units (by its place
 * in the order), whether delivery goes back, and anything kept. `message` is
 * for the customer's email (required when the shop can't supply it, 10.4:
 * the shop tells them why); `note` is the shop's own record.
 */
export type RefundInput = { reason: RefundReason; lines: { line: number; quantity: number }[]; delivery: boolean; keep: number; keepNote: string; note: string; message: string };

/** The reasons an order is cancelled for, from the shop's side however the customer asked (10.1): they asked, the shop can't supply it, or it is late. */
export const CANCEL_REASONS = ["cancelled", "unsupplied", "late"] as const satisfies readonly RefundReason[];
export type CancelReason = (typeof CANCEL_REASONS)[number];
export const isCancelReason = (x: unknown): x is CancelReason => (CANCEL_REASONS as readonly unknown[]).includes(x);

/** A cancellation as a refund: every unit still to refund, and the delivery, whatever the form sent for them. */
export const cancelInput = (o: Pick<Order, "lines" | "refunds">, input: Omit<RefundInput, "lines" | "delivery">): RefundInput => {
  const units = refundedUnits(o);
  return { ...input, lines: o.lines.map((l, i) => ({ line: i, quantity: l.quantity - units[i] })), delivery: true };
};

/** Whether the order can still be cancelled as such: paid, not yet left the shop, not cancelled, and something left to refund. */
export function cancelProblem(o: Refundable): string | null {
  if (o.status !== "paid") return "Only a paid order can be cancelled. An unpaid one is never made.";
  if (o.stage === "cancelled") return "This order is already cancelled.";
  if (hasLeft(o)) return "It has left the shop, so it can’t be cancelled now: a change-of-mind return (9.6) or a fault (9.1) covers it, as a refund.";
  if (refundedOf(o) >= o.total) return "Everything on this order has been refunded already.";
  return null;
}

/** Whether delivery goes back with this refund: always, at staff's choice, or not at all. */
export type DeliveryRule = "must" | "may" | "no";

export type RefundPlan = {
  reason: RefundReason;
  lines: RefundLine[];
  /** The delivery given back. */
  delivery: number;
  keep: { amount: number; note: string } | null;
  /** The shop's words to the customer, in the refund email; "" for none. */
  message: string;
  /** What goes to the customer: lines and delivery, less what is kept. */
  amount: number;
  /** Nothing is left to refund after this: every unit and the delivery. */
  whole: boolean;
  /** It hadn't left the shop: a whole refund then cancels the order. */
  beforeSent: boolean;
};

/** What the whole line came to after every deal. */
export const linePaid = (l: Pick<OrderLine, "paid" | "price" | "quantity">) => l.paid ?? l.price * l.quantity;

/** What the first `units` of a line come to: shares rounded so that all its units come to exactly what it was paid. */
const share = (l: OrderLine, units: number) => Math.round((linePaid(l) * units) / l.quantity);

/** Made to the customer's specification: their photos or words on it (9.6, 10.2). */
export const isPersonalised = (l: Pick<OrderLine, "sets">) => l.sets.some((s) => s.files.length > 0 || s.words.trim() !== "");

/** Units of each line refunded so far, by its place in the order. Refunds from before lines were kept count by amount only. */
export const refundedUnits = (o: Pick<Order, "refunds" | "lines">) => {
  const units = o.lines.map(() => 0);
  for (const r of o.refunds ?? []) for (const l of r.lines ?? []) if (units[l.line] !== undefined) units[l.line] += l.quantity;
  return units;
};

/** The delivery refunded so far. */
export const deliveryRefunded = (o: Pick<Order, "refunds">) => (o.refunds ?? []).reduce((n, r) => n + (r.delivery ?? 0), 0);

/** It has left the shop: with the courier, or collected. */
export const hasLeft = (o: Pick<Order, "fulfilment" | "shipment" | "stage">) => o.stage === "done" || (o.fulfilment.method === "courier" && hasLeftShop(o.shipment?.status));

/** Whether delivery goes back for this reason, when this refund leaves nothing else to refund (`whole`) or not. */
export function deliveryRule(reason: RefundReason, whole: boolean): DeliveryRule {
  switch (reason) {
    case "late":
      return "must";
    case "cancelled":
      // Part of an order cancelled: the rest still goes, by the same courier.
      return whole ? "must" : "no";
    case "uncollected":
      return "no";
    case "goodwill":
      return "may";
    default:
      // A parcel no longer needed, a return, our fault: all of it back with the last of the goods; with part of them, staff judge.
      return whole ? "must" : "may";
  }
}

/** What `planRefund` reads of an order, and all the admin's refund form is sent. */
export type Refundable = Pick<Order, "ref" | "status" | "stage" | "lines" | "refunds" | "delivery" | "total" | "fulfilment" | "shipment">;

/** Whether these units are the last of the goods to refund: after them, every unit of every line has been. */
export const leavesNoGoods = (o: Pick<Order, "lines" | "refunds">, chosen: { line: number; quantity: number }[], units = refundedUnits(o)) =>
  o.lines.every((l, i) => l.quantity - units[i] === (chosen.find((x) => x.line === i)?.quantity ?? 0));

/** What PayFast has refunded on the payment beyond what the order records: a refund made in its dashboard and not yet recorded, when above 0. */
export const unrecordedRefund = (o: Pick<Order, "refunds">, payfastRefunded: number) => payfastRefunded - refundedOf(o);

/** A refunded line's units as the log and the customer's email name them. */
export const refundLineWhat = (o: Pick<Order, "lines">, l: Pick<RefundLine, "line" | "quantity">) => lineWhat({ ...o.lines[l.line], quantity: l.quantity });

/** What a refund would give back, or why it can't be made as asked. */
export function planRefund(o: Refundable, input: RefundInput): { ok: true; plan: RefundPlan } | { ok: false; error: string } {
  if (o.status !== "paid") return { ok: false, error: "Only a paid order can be refunded." };
  if (!isRefundReason(input.reason)) return { ok: false, error: "Choose why it’s being refunded." };
  const reason = input.reason;
  const left = hasLeft(o);
  const units = refundedUnits(o);

  const lines: RefundLine[] = [];
  for (const { line, quantity } of input.lines) {
    if (!quantity) continue;
    const l = o.lines[line];
    if (!l || !Number.isSafeInteger(line) || !Number.isSafeInteger(quantity) || quantity < 0) return { ok: false, error: "That isn’t a line of this order." };
    if (lines.some((x) => x.line === line)) return { ok: false, error: "Each line once." };
    const done = units[line];
    if (quantity > l.quantity - done) return { ok: false, error: `Only ${l.quantity - done} of ${lineWhat(l)} ${l.quantity - done === 1 ? "is" : "are"} left to refund.` };
    if (reason === "returned" && isPersonalised(l)) return { ok: false, error: `${lineWhat(l)} is personalised, so the law gives no change-of-mind return for it (clause 9.6). If it’s faulty, choose that instead.` };
    if (reason === "uncollected" && isPersonalised(l)) return { ok: false, error: `${lineWhat(l)} was made for the customer, so the terms let the shop keep it without a refund once it goes uncollected. Choose a goodwill gesture to refund it anyway.` };
    lines.push({ line, sku: l.sku, quantity, amount: share(l, done + quantity) - share(l, done) });
  }

  if (reason === "cancelled" && left) return { ok: false, error: "It has left the shop, so it can’t be cancelled as such: a change-of-mind return (9.6) or a fault (9.1) covers it now." };
  if (reason === "returned" && !left) return { ok: false, error: "It hasn’t reached the customer yet: cancel it instead." };
  if (reason === "uncollected" && o.fulfilment.method !== "collect") return { ok: false, error: "Only an order to collect can go uncollected." };

  const deliveryLeft = o.delivery - deliveryRefunded(o);
  const allGoods = leavesNoGoods(o, lines, units);
  const rule = deliveryRule(reason, allGoods);
  const delivery = deliveryLeft > 0 && (rule === "must" || (rule === "may" && input.delivery)) ? deliveryLeft : 0;
  if (reason === "late" && !allGoods) return { ok: false, error: "A late order is cancelled whole (clause 10.5): choose every line still to refund." };

  const message = input.message.trim().slice(0, 500);
  if (reason === "unsupplied" && message.length < 3) return { ok: false, error: "Tell the customer why it can’t be supplied (clause 10.4): it goes in their email." };

  const kept = Number.isSafeInteger(input.keep) && input.keep > 0 ? input.keep : 0;
  const keepNote = input.keepNote.trim();
  const goods = lines.reduce((n, l) => n + l.amount, 0);
  let keep: RefundPlan["keep"] = null;
  if (kept) {
    const may = REFUND_REASONS[reason].keep;
    if (!may) return { ok: false, error: "The terms don’t let the shop keep anything back for this reason." };
    if (keepNote.length < 3) return { ok: false, error: "Say what’s kept back, for the customer’s email." };
    // 10.2: only the work on what was being made, up to its price; and only once making started.
    const cap = reason === "cancelled" ? (o.stage === "new" ? 0 : lines.filter((l) => isPersonalised(o.lines[l.line])).reduce((n, l) => n + l.amount, 0)) : goods + delivery;
    if (kept > cap) return { ok: false, error: reason === "cancelled" ? (cap ? `The terms keep at most the price of the personalised items already started: ${rands(cap)}.` : "Nothing personalised has been started, so it’s refunded in full (clause 10.2).") : "That keeps back more than is being refunded." };
    keep = { amount: kept, note: keepNote.slice(0, 200) };
  }

  const amount = goods + delivery - kept;
  if (amount <= 0) return { ok: false, error: lines.length || delivery ? "That leaves nothing to refund." : "Choose what’s being refunded." };
  if (amount > o.total - refundedOf(o)) return { ok: false, error: `That’s more than is left to refund (${rands(o.total - refundedOf(o))}).` };
  const whole = allGoods && delivery === deliveryLeft;
  return { ok: true, plan: { reason, lines, delivery, keep, message, amount, whole, beforeSent: !left } };
}

/** A plan in a line, for the order's log and PayFast's record. */
export function planWords(o: Pick<Order, "lines">, p: RefundPlan) {
  const parts = [...p.lines.map((l) => refundLineWhat(o, l)), ...(p.delivery ? ["delivery"] : [])];
  return `${REFUND_REASONS[p.reason].label}: ${parts.join(", ") || "nothing"}${p.keep ? `, less ${rands(p.keep.amount)} (${p.keep.note})` : ""}`;
}
