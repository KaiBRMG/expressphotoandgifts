import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { rands } from "@/lib/catalog/listing";
import { unitsToReturn } from "@/lib/catalog/stock";
import { changeOrder, getOrder, type Change } from "@/lib/checkout/orders";
import { hasLeftShop, holdsWaybill, NOTE_MAX, stageUpdate, type Order, type OrderActionResult, type Refund } from "@/lib/checkout/order";
import { payfastCredentials } from "@/lib/checkout/payfast";
import { createRefund, paymentRefunds, refundedTotal, refundMethod } from "@/lib/checkout/payfastApi";
import { cancelInput, cancelProblem, isCancelReason, isRefundReason, planRefund, planWords, REFUND_REASONS, unrecordedRefund, type RefundInput, type RefundPlan } from "@/lib/checkout/refunds";
import { cancelOrderShipment } from "@/lib/checkout/shipments";
import { returnStock } from "@/lib/stock";
import { mailCustomer } from "./orders";

/**
 * Refunds, as the terms set them (`lib/checkout/refunds.ts` works out how
 * much): always through PayFast to the card or account the customer paid
 * with (11.1), and emailed to them once made (11.3).
 *
 * The shop refunds through PayFast's API from the order's page. PayFast has
 * no idempotency key, so like a courier booking the order is held while
 * PayFast is asked (`refunding`), with what PayFast had refunded before; its
 * total afterwards says whether the refund went, and an answer that can't be
 * read leaves the hold for staff to check rather than a second refund. A
 * payment PayFast can refund only to a bank account (an EFT) is refunded in
 * its dashboard, and recorded here only once PayFast's own record shows it.
 */

const STANDING = "A refund on this order is still with PayFast. Check it on the Payment tab before refunding again.";

/** The form's choices, as sent from the browser; anything it can't read is left out, and the plan says what's wrong. */
function readInput(raw: unknown): RefundInput | null {
  const r = raw as Partial<Record<keyof RefundInput, unknown>> | null;
  if (!r || typeof r !== "object" || !isRefundReason(r.reason) || !Array.isArray(r.lines)) return null;
  return {
    reason: r.reason,
    lines: r.lines.slice(0, 200).map((l: { line?: unknown; quantity?: unknown } | null) => ({ line: Number(l?.line), quantity: Number(l?.quantity) })),
    delivery: r.delivery === true,
    keep: Math.round(Number(r.keep) || 0),
    keepNote: typeof r.keepNote === "string" ? r.keepNote : "",
    note: typeof r.note === "string" ? r.note.trim().slice(0, NOTE_MAX) : "",
    message: typeof r.message === "string" ? r.message : "",
  };
}

const refundOf = (p: RefundPlan, by: string, via: Refund["via"], note: string, at = new Date().toISOString()): Refund => ({
  at,
  by,
  amount: p.amount,
  note: note || REFUND_REASONS[p.reason].label,
  reason: p.reason,
  lines: p.lines,
  delivery: p.delivery,
  keep: p.keep,
  ...(p.message ? { message: p.message } : {}),
  via,
});

/** The order, the plan for it, and its PayFast payment; or why there's no refund to make. */
async function prepare(ref: string, raw: unknown): Promise<{ error: string } | { o: Order; input: RefundInput; plan: RefundPlan; pf: string }> {
  const input = readInput(raw);
  if (!input) return { error: "Choose why it’s being refunded, and what." };
  const o = await getOrder(ref);
  if (!o) return { error: "There’s no such order." };
  const planned = replan(o, input);
  if ("error" in planned) return planned;
  const pf = o.payment?.pfPaymentId;
  if (!pf) return { error: "The order has no PayFast payment to refund." };
  return { o, input, plan: planned, pf };
}

/** The plan on the order as it stands, with no refund held on PayFast; inside a write, also for the amount already checked with PayFast. */
function replan(o: Order, input: RefundInput, amount?: number): RefundPlan | { error: string } {
  if (o.refunding) return { error: STANDING };
  const planned = planRefund(o, input);
  if (!planned.ok) return { error: planned.error };
  if (amount !== undefined && planned.plan.amount !== amount) return { error: "The order changed meanwhile. Check the refund, then try again." };
  return planned.plan;
}

/**
 * The refund written onto the order, in the change that releases any hold.
 * A refund of everything before it left the shop cancels the order: its
 * stage is cancelled, out of the work, and a waybill still on it is flagged to
 * cancel so the courier doesn't collect it.
 */
function recorded(o: Order, refund: Refund, plan: RefundPlan, extra?: string, cancelling = false): Change {
  const cancels = plan.whole && plan.beforeSent;
  // A cancellation cancels the waybill itself once this is written; only a refund that happens to cancel the order leaves it to staff.
  const waybill = cancels && !cancelling && holdsWaybill(o.shipment) ? (o.shipment?.tracking ?? "being booked") : null;
  const issue = [extra, waybill && `Refunded in full with waybill ${waybill} still on the order. Cancel it in the Courier tab so The Courier Guy doesn’t collect it.`].filter(Boolean).join(" ");
  return {
    update: { refunds: FieldValue.arrayUnion(refund), refunding: FieldValue.delete(), ...(cancels ? stageUpdate("cancelled", refund.at) : {}) },
    log: `Refunded ${rands(refund.amount)} through PayFast${refund.via === "dashboard" ? " (made in PayFast’s dashboard)" : ""}. ${planWords(o, plan)}.${cancels ? " The order is cancelled." : ""}`,
    ...(issue ? { issue } : {}),
  };
}

/** After a refund is recorded: the customer's email (11.3), and what staff may still have to do. A refund never changes stock, so the order read before it says. */
async function finish(ref: string, by: string, o: Pick<Order, "stock">, cancelling = false): Promise<OrderActionResult> {
  const mailed = await mailCustomer(ref, "refund", by);
  // A cancellation puts the stock back itself, when staff ask it to.
  const stock = !cancelling && unitsToReturn(o.stock) > 0 ? " If what it took from stock wasn’t made or came back unused, put it back below." : "";
  return { ok: true, notice: `Refunded.${"error" in mailed ? ` The refund email didn’t go (${mailed.error}): resend it from the Emails tab.` : " The customer has been emailed."}${stock}` };
}

/** Refunds the plan through PayFast's API, to the card or account the customer paid with. */
export async function refundThroughPayfast(ref: string, raw: unknown, by: string, cancelling = false): Promise<OrderActionResult> {
  const ready = await prepare(ref, raw);
  if ("error" in ready) return ready;
  const { o, input, plan, pf } = ready;
  if (payfastCredentials()?.sandbox) return { error: "PayFast makes no refunds in its sandbox. On the live account this refunds the customer’s card." };

  const [method, before] = await Promise.all([refundMethod(pf), paymentRefunds(pf)]);
  if (!before.ok) return { error: `PayFast’s refunds couldn’t be read, so nothing was refunded: ${before.message}` };
  const how = method.ok ? method.data.method : "unknown";
  if (how === "bank") return { error: "PayFast can refund this payment only to a bank account (it wasn’t paid by card) and needs the customer’s bank details for that. Make the refund in PayFast’s dashboard, then record it here." };
  if (how === "none") return { error: `PayFast says this payment can’t be refunded now${method.ok && method.data.message ? `: ${method.data.message}` : ""}. Check it in PayFast’s dashboard.` };
  const prior = refundedTotal(before.data);
  const unrecorded = unrecordedRefund(o, prior);
  if (unrecorded > 0) return { error: `PayFast shows ${rands(unrecorded)} more refunded than this order records. Record that refund first, so nothing is refunded twice.` };
  if (before.data.available !== null && plan.amount > before.data.available) return { error: `PayFast has only ${rands(before.data.available)} left to refund on this payment.` };

  const held = await changeOrder(ref, by, (fresh) => {
    const again = replan(fresh, input, plan.amount);
    if ("error" in again) return again;
    return { update: { refunding: { state: "sending", at: new Date().toISOString(), by, before: prior, plan: again, note: input.note } }, log: `Asked PayFast to refund ${rands(plan.amount)}.` };
  });
  if ("error" in held) return held;

  const sent = await createRefund(pf, plan.amount, `Order ${o.ref}: ${REFUND_REASONS[plan.reason].label}`);
  // A refusal PayFast stated means nothing was refunded; a server error or no answer at all might have been either.
  const refused = !sent.ok && sent.reason !== "unreachable" ? sent.message : null;
  return settle(ref, by, refused, cancelling);
}

/**
 * Settles a held refund by what PayFast has refunded since it was asked:
 * recorded when its total moved by the refund, released when it didn't move
 * and PayFast refused (or, staff checking later, didn't make it), and held
 * and flagged when PayFast's record can't be read or doesn't add up.
 * `refused` is PayFast's refusal of the request just made; undefined when
 * staff check later.
 */
async function settle(ref: string, by: string, refused?: string | null, cancelling = false): Promise<OrderActionResult> {
  const o = await getOrder(ref);
  const held = o?.refunding;
  if (!o || !held) return { error: "There’s no refund waiting on PayFast here." };
  // Staff checking while the request may still be out: its own answer settles it.
  if (refused === undefined && held.state === "sending" && Date.now() - Date.parse(held.at) < 60_000) return { error: "PayFast is still being asked. Check again in a minute." };
  const now = o.payment ? await paymentRefunds(o.payment.pfPaymentId) : null;
  const moved = now?.ok ? refundedTotal(now.data) - held.before : null;
  const asking = refused !== undefined;
  const amount = rands(held.plan.amount);

  let outcome: OrderActionResult = { ok: true };
  const done = await changeOrder(ref, by, (fresh) => {
    if (fresh.refunding?.at !== held.at) return { error: "That refund was settled meanwhile." };
    if (moved !== null && moved >= held.plan.amount) {
      const extra = moved > held.plan.amount ? `PayFast shows ${rands(moved - held.plan.amount)} more refunded on this payment than the refund of ${amount} the shop asked for. Check PayFast’s dashboard.` : undefined;
      return recorded(fresh, refundOf(held.plan, held.by, "payfast", held.note), held.plan, extra, cancelling);
    }
    if (moved === 0 && (refused || !asking)) {
      outcome = { error: refused ? `PayFast refused the refund: ${refused}` : "PayFast shows no such refund, so none was made. You can refund again." };
      return { update: { refunding: FieldValue.delete() }, log: refused ? `PayFast refused the refund of ${amount}: ${refused}` : `Checked with PayFast: the refund of ${amount} wasn’t made.` };
    }
    outcome = {
      error:
        moved === null
          ? `PayFast’s answer couldn’t be read, so the refund of ${amount} may or may not have been made. Check it on the Payment tab before refunding again.`
          : moved === 0
            ? `PayFast doesn’t show the refund of ${amount} yet. Check it on the Payment tab in a minute, before refunding again.`
            : `PayFast shows ${rands(moved)} refunded since, not ${amount}. Check PayFast’s dashboard.`,
    };
    if (fresh.refunding.state === "unknown") return { update: {} };
    return {
      update: { "refunding.state": "unknown" },
      issue: `A refund of ${amount} asked of PayFast isn’t settled. Check it on the Payment tab (Check the refund) before refunding again, or the customer may be refunded twice.`,
    };
  });
  if ("error" in done) return done;
  if ("error" in outcome) return outcome;
  return finish(ref, by, o, cancelling);
}

/** Staff's "Check the refund": settles a refund held on PayFast's answer from PayFast's record now. */
export const checkRefund = (ref: string, by: string) => settle(ref, by);

/**
 * Records a refund made in PayFast's dashboard (an EFT payment's, to the
 * customer's bank account, say), only once PayFast's own record shows that
 * much refunded beyond what the order already records.
 */
export async function recordDashboardRefund(ref: string, raw: unknown, by: string, cancelling = false): Promise<OrderActionResult> {
  const ready = await prepare(ref, raw);
  if ("error" in ready) return ready;
  const { o, input, plan, pf } = ready;
  const pfRefunds = await paymentRefunds(pf);
  if (!pfRefunds.ok) return { error: `PayFast’s refunds couldn’t be read, so it can’t be checked: ${pfRefunds.message}` };
  const unrecorded = unrecordedRefund(o, refundedTotal(pfRefunds.data));
  if (plan.amount > unrecorded) {
    return {
      error:
        unrecorded > 0
          ? `PayFast shows ${rands(unrecorded)} refunded that this order doesn’t record yet, less than ${rands(plan.amount)}.`
          : "PayFast shows no refund on this payment that isn’t recorded already. Make it in PayFast’s dashboard first; it can take a few minutes to show.",
    };
  }
  const refund = refundOf(plan, by, "dashboard", input.note);
  const done = await changeOrder(ref, by, (fresh) => {
    const again = replan(fresh, input, plan.amount);
    return "error" in again ? again : recorded(fresh, refund, again, undefined, cancelling);
  });
  if ("error" in done) return done;
  return finish(ref, by, o, cancelling);
}

/**
 * Cancels a paid order from the shop's side, however the customer asked
 * (10.1): for the customer (10.2, 10.3), because the shop can't supply it
 * (10.4), or because it's late (10.5). It is a refund of everything still
 * due, less only what 10.2 lets the shop keep for personalised work already
 * started, through PayFast or as made in its dashboard; the refund marks the
 * order cancelled (`recorded`). Then, once the money is back, its waybill is
 * cancelled while the courier hasn't collected it, and its stock put back
 * when staff say it wasn't used. A refund PayFast hasn't settled yet does
 * neither: the order shows what's left once it is.
 */
export async function cancelOrder(ref: string, raw: unknown, by: string, via: "payfast" | "dashboard"): Promise<OrderActionResult> {
  const r = raw as { reason?: unknown; keep?: unknown; keepNote?: unknown; note?: unknown; message?: unknown; restock?: unknown } | null;
  if (!r || !isCancelReason(r.reason)) return { error: "Choose why the order is being cancelled." };
  const o = await getOrder(ref);
  if (!o) return { error: "There’s no such order." };
  const problem = cancelProblem(o);
  if (problem) return { error: problem };
  const input = cancelInput(o, { reason: r.reason, keep: Math.round(Number(r.keep) || 0), keepNote: String(r.keepNote ?? ""), note: String(r.note ?? "").trim().slice(0, NOTE_MAX), message: String(r.message ?? "") });
  const refunded = via === "payfast" ? await refundThroughPayfast(ref, input, by, true) : await recordDashboardRefund(ref, input, by, true);
  if ("error" in refunded) return refunded;

  const notes = [refunded.notice];
  const now = await getOrder(ref);
  const s = now?.shipment;
  if (s?.state === "booked" && !hasLeftShop(s.status)) {
    const cancelled = await cancelOrderShipment(ref, "out", by);
    notes.push("error" in cancelled ? `The waybill wasn’t cancelled (${cancelled.error}): cancel it in the Courier tab.` : `Waybill ${s.tracking} is cancelled.`);
  }
  if (r.restock === true && unitsToReturn(now?.stock) > 0) {
    const back = await returnStock(ref, by);
    notes.push("error" in back ? `The stock wasn’t put back (${back.error}).` : "Its stock is back on the shelf.");
  }
  return { ok: true, notice: notes.filter(Boolean).join(" ") };
}
