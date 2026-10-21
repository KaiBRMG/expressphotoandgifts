import "server-only";

import { rands } from "@/lib/catalog/listing";
import { db } from "@/lib/firebase";
import { applyNotice, changeOrder, flagOnce, getOrder, orders } from "@/lib/checkout/orders";
import { afterPaid } from "@/lib/checkout/paid";
import { amountMatches, pfAmount } from "@/lib/checkout/payfast";
import { cardPayment, transactionHistory, type ApiResult, type HistoryRow } from "@/lib/checkout/payfastApi";
import { ATTEMPT, DAY_MS, SWEEP_AFTER_DAYS, type Attempt, type Notice, type NoticeOutcome, type NoticeRecord, type Order, type OrderActionResult } from "@/lib/checkout/order";
import { shopDate } from "@/lib/shopTime";

/**
 * The shop's payments set beside PayFast's own record of them. PayFast's
 * transaction history is the truth about money; each of its payments names
 * the frozen attempt it paid for, so a payment is either matched to its paid
 * order or is an exception with a plain reason. The daily check (and Check
 * now) flags each exception on its order once, so it shows in Orders' Needs a
 * look; nothing here marks an order paid except staff accepting a payment
 * PayFast's history shows and the notice missed.
 */

/** What a line of PayFast's history is, set beside our orders. */
export type Match =
  /** A payment that paid its order, to the cent. */
  | { kind: "matched"; ref: string; name: string }
  /** PayFast took it; the order isn't paid, because the notice never arrived. Staff can accept it. */
  | { kind: "missed"; ref: string; name: string }
  /** Its amount isn't what its attempt asked for. */
  | { kind: "amount"; ref: string; name: string; expected: number }
  /** A second payment for an order another payment already paid. */
  | { kind: "duplicate"; ref: string; name: string }
  /** It names an order or attempt the shop doesn't have. */
  | { kind: "no-order"; ref: string | null }
  /** Made outside the shop's checkout (no attempt ID): a payment link from PayFast's dashboard, say. */
  | { kind: "outside" }
  /** A refund, matched to its order when PayFast names one. */
  | { kind: "refund"; ref: string | null; name: string | null }
  /** Anything else PayFast lists (payouts, fees): shown, never an exception. */
  | { kind: "other" };

export type LedgerRow = HistoryRow & { match: Match };

/** A paid order whose payment PayFast's history doesn't have (after a day's grace, since its history can lag). */
export type Unrecorded = { ref: string; name: string; total: number; paidAt: string; pfPaymentId: string };

export type Ledger = {
  /** Exceptions first, then newest first. */
  rows: LedgerRow[];
  unrecorded: Unrecorded[];
  /** Rows and unrecorded orders that need a look. */
  exceptions: number;
  /** The payments among the rows (not refunds, payouts or fees), and their sums in cents. */
  payments: { count: number; gross: number; fee: number; net: number };
};

const EXCEPTIONS = new Set<Match["kind"]>(["missed", "amount", "duplicate", "no-order"]);
export const isException = (m: Match) => EXCEPTIONS.has(m.kind);

const isPayment = (r: HistoryRow) => /^FUNDS_RECEIVED$/i.test(r.type) && r.gross > 0;
const isRefund = (r: HistoryRow) => /REFUND/i.test(r.type);

const customer = (o: Pick<Order, "contact">) => `${o.contact.firstName} ${o.contact.lastName}`;

/** A history row as the notice PayFast should have sent for it. */
const noticeOf = (r: HistoryRow): Notice => ({ attempt: r.attempt, pfPaymentId: r.pfPaymentId, status: "COMPLETE", amountGross: pfAmount(r.gross), amountFee: pfAmount(r.fee), amountNet: pfAmount(r.net) });

function judge(r: HistoryRow, order: Order | undefined, attempt: Attempt | undefined, ref: string | undefined): Match {
  if (isRefund(r)) return { kind: "refund", ref: ref ?? null, name: order ? customer(order) : null };
  if (!isPayment(r)) return { kind: "other" };
  if (!r.attempt) return { kind: "outside" };
  if (!ref || !order || !attempt) return { kind: "no-order", ref: ref ?? null };
  const who = { ref: order.ref, name: customer(order) };
  // The test a notice gets (`applyNotice`), so what the ledger calls missed is what accepting it will pay.
  if (!amountMatches(attempt.total, pfAmount(r.gross))) return { kind: "amount", ...who, expected: attempt.total };
  if (order.status === "paid") return order.payment?.pfPaymentId === r.pfPaymentId ? { kind: "matched", ...who } : { kind: "duplicate", ...who };
  return { kind: "missed", ...who };
}

/**
 * Sets PayFast's history beside our orders, reading each order and attempt it
 * names once. With `window`, also finds paid orders in it that PayFast has no
 * record of; their query doubles as the read of the paid orders it names.
 */
export async function matchHistory(rows: HistoryRow[], window?: { from: string; to: string }): Promise<Ledger> {
  const attempts = [...new Set(rows.map((r) => r.attempt).filter((a) => ATTEMPT.test(a)))];
  const refOf = (a: string) => ATTEMPT.exec(a)?.[1];
  const paidInWindow = window
    ? // By `paidAt` alone, a range on the field it orders by: no composite index.
      (await orders().where("paidAt", ">=", `${window.from}T00:00:00`).where("paidAt", "<=", `${window.to}T23:59:59.999Z`).orderBy("paidAt").get()).docs.map((d) => d.data() as Order)
    : [];
  const orderOf = new Map(paidInWindow.map((o) => [o.ref, o]));
  const toRead = [...new Set(attempts.map((a) => refOf(a)!))].filter((r) => !orderOf.has(r));
  const [orderSnaps, attemptSnaps] = await Promise.all([
    toRead.length ? db().getAll(...toRead.map((r) => orders().doc(r))) : [],
    attempts.length ? db().getAll(...attempts.map((a) => orders().doc(refOf(a)!).collection("attempts").doc(a))) : [],
  ]);
  for (const s of orderSnaps) if (s.exists) orderOf.set(s.id, s.data() as Order);
  const attemptOf = new Map(attemptSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as Attempt]));

  const ledger: LedgerRow[] = rows.map((r) => {
    const ref = refOf(r.attempt);
    return { ...r, match: judge(r, ref ? orderOf.get(ref) : undefined, attemptOf.get(r.attempt), ref) };
  });

  const seen = new Set(rows.filter(isPayment).map((r) => r.pfPaymentId));
  const graceEnds = Date.now() - DAY_MS;
  const unrecorded = paidInWindow
    .filter((o) => o.payment && !seen.has(o.payment.pfPaymentId) && Date.parse(o.paidAt!) < graceEnds)
    .map((o) => ({ ref: o.ref, name: customer(o), total: o.total, paidAt: o.paidAt!, pfPaymentId: o.payment!.pfPaymentId }));

  const payments = ledger.filter(isPayment);
  const byDate = (a: LedgerRow, b: LedgerRow) => b.date.localeCompare(a.date);
  const flagged = ledger.filter((r) => isException(r.match));
  return {
    rows: [...flagged.sort(byDate), ...ledger.filter((r) => !isException(r.match)).sort(byDate)],
    unrecorded,
    exceptions: flagged.length + unrecorded.length,
    payments: {
      count: payments.length,
      gross: payments.reduce((n, r) => n + r.gross, 0),
      fee: payments.reduce((n, r) => n + r.fee, 0),
      net: payments.reduce((n, r) => n + r.net, 0),
    },
  };
}

/* ---- Months ------------------------------------------------------------- */

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const thisMonth = () => shopDate().slice(0, 7);

/** A month asked for ("2026-10"), or null when it isn't one or hasn't started yet. */
export const parseMonth = (x: unknown): string | null => (typeof x === "string" && MONTH.test(x) && x <= thisMonth() ? x : null);

/** A month's first and last day, the last held to today. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const today = shopDate();
  return { from: `${month}-01`, to: last < today ? last : today };
}

/** A month's ledger, read live from PayFast. */
export async function monthLedger(month: string): Promise<ApiResult<Ledger>> {
  const range = monthRange(month);
  const history = await transactionHistory(range.from, range.to);
  return history.ok ? { ok: true, data: await matchHistory(history.data, range) } : history;
}

/* ---- The check: daily, and on demand ----------------------------------- */

/** The last check's outcome, for the dashboard and the Payments page. */
export type CheckRecord = { at: string; by: string; from: string; to: string } & ({ ok: true; payments: number; exceptions: number } | { ok: false; error: string });

const checkDoc = () => db().collection("meta").doc("payfastCheck");

export async function lastCheck(): Promise<CheckRecord | null> {
  const snap = await checkDoc().get();
  return snap.exists ? (snap.data() as CheckRecord) : null;
}

/** How far back the daily check looks: long enough for a notice PayFast retried for days, or a weekend nobody checked. */
const CHECK_DAYS = 7;

/**
 * Reads PayFast's history for the window (the last week by default), flags
 * each exception on its order once, and records the outcome. `by` is "daily
 * check" from the cron, or the member of staff who pressed Check now.
 */
export async function runCheck(by: string, window?: { from: string; to: string }): Promise<CheckRecord> {
  const range = window ?? { from: shopDate(Date.now() - CHECK_DAYS * DAY_MS), to: shopDate() };
  const at = new Date().toISOString();
  const history = await transactionHistory(range.from, range.to);
  let record: CheckRecord;
  if (history.ok) {
    const ledger = await matchHistory(history.data, range);
    await Promise.all([...ledger.rows.map(flagFromHistory), ...ledger.unrecorded.map(flagUnrecorded)]);
    record = { at, by, ...range, ok: true, payments: ledger.payments.count, exceptions: ledger.exceptions };
  } else record = { at, by, ...range, ok: false, error: history.message };
  await checkDoc().set(record);
  return record;
}

/** Flags an order for one history exception, once: the record's ID is the payment's, so the next day's check writes nothing. */
function flagFromHistory(r: LedgerRow) {
  const m = r.match;
  const paid = `PayFast took ${rands(r.gross)} (payment ${r.pfPaymentId}, ${r.date}) for ${r.attempt}`;
  let outcome: NoticeOutcome;
  let text: string;
  switch (m.kind) {
    case "missed":
      outcome = "missed";
      text = `${paid}, but its notice never reached the shop, so the order isn’t marked paid. Accept PayFast’s record on this order once you’ve checked it.`;
      break;
    case "amount":
      outcome = "mismatch";
      text = `${paid}, which isn’t its attempt’s total of ${rands(m.expected)}. It was not marked paid.`;
      break;
    case "duplicate":
      outcome = "duplicate";
      text = `${paid}, after another payment had already paid the order. The customer paid twice: refund one in PayFast.`;
      break;
    default:
      return null;
  }
  return flagOnce(m.ref, `history-${r.pfPaymentId}`, { ...noticeOf(r), at: new Date().toISOString(), outcome, reason: "from PayFast’s transaction history" }, text);
}

function flagUnrecorded(u: Unrecorded) {
  const record: NoticeRecord = { attempt: "", pfPaymentId: u.pfPaymentId, status: "", amountGross: pfAmount(u.total), amountFee: "", amountNet: "", at: new Date().toISOString(), outcome: "no-record", reason: "missing from PayFast’s transaction history" };
  const text = `This order is marked paid by PayFast payment ${u.pfPaymentId}, but PayFast’s transaction history has no such payment. Check it in PayFast before making the order.`;
  return flagOnce(u.ref, `history-none-${u.pfPaymentId}`, record, text);
}

/* ---- What staff do from an order --------------------------------------- */

/**
 * For an unpaid order: the payments PayFast's history shows for it whose
 * notices never arrived, read live (one call), so the order can be accepted
 * without waiting for the next check. Only the days it could have been paid
 * in: from when it was placed to a fortnight after it was last saved, by
 * which time its photos are gone and the browser has started over.
 */
export async function missedPayments(order: Pick<Order, "ref" | "createdAt" | "updatedAt" | "status">): Promise<LedgerRow[] | { error: string }> {
  if (order.status === "paid") return [];
  const today = shopDate();
  const until = shopDate(Date.parse(order.updatedAt) + SWEEP_AFTER_DAYS * DAY_MS);
  const history = await transactionHistory(shopDate(Date.parse(order.createdAt)), until < today ? until : today);
  if (!history.ok) return { error: history.message };
  const ledger = await matchHistory(history.data.filter((r) => ATTEMPT.exec(r.attempt)?.[1] === order.ref));
  return ledger.rows.filter((r) => r.match.kind === "missed");
}

/**
 * The order's PayFast payment to ask about: the one that paid it, or for an
 * unpaid order, the latest a notice or the daily check recorded against it.
 */
export const paymentIdFor = (order: Pick<Order, "payment">, notices: Pick<NoticeRecord, "pfPaymentId" | "at">[]) =>
  order.payment?.pfPaymentId ?? [...notices].sort((a, b) => b.at.localeCompare(a.at)).find((n) => /^\d+$/.test(n.pfPaymentId))?.pfPaymentId;

/**
 * Marks an order paid from PayFast's own history when its notice never
 * arrived: only for a pending order, and only when that history shows exactly
 * one completed payment for one of its attempts, to the cent. The payment then
 * goes through the same path a notice does (logged as staff's, in the same
 * write), so a late notice for it changes nothing, and the emails go as usual.
 */
export async function acceptFromPayfast(ref: string, by: string): Promise<OrderActionResult> {
  const order = await getOrder(ref);
  if (!order) return { error: "There’s no such order." };
  if (order.status === "paid") return { error: "This order is already paid." };

  const missed = await missedPayments(order);
  if ("error" in missed) return missed;
  if (missed.length === 0) return { error: "PayFast’s history shows no payment for this order that matches one of its attempts to the cent." };
  if (missed.length > 1) return { error: "PayFast’s history shows more than one payment for this order. Check them in PayFast; one will need refunding." };

  const applied = await applyNotice(noticeOf(missed[0]), { acceptedBy: by });
  if (applied.outcome !== "paid") return { error: `It couldn’t be marked paid (${applied.outcome}). Check the order’s PayFast notices.` };
  await afterPaid(applied.order);
  return { ok: true };
}

/** Asks PayFast about the order's card payment and keeps its answer on the order. */
export async function checkCard(ref: string, by: string): Promise<OrderActionResult> {
  const found = await getOrder(ref);
  if (!found) return { error: "There’s no such order." };
  const notices = await orders().doc(ref).collection("notices").get();
  const pfPaymentId = paymentIdFor(found, notices.docs.map((d) => d.data() as NoticeRecord));
  if (!pfPaymentId) return { error: "No PayFast payment has been recorded for this order yet, so there’s nothing to ask PayFast about." };

  const at = new Date().toISOString();
  const got = await cardPayment(pfPaymentId);
  const check = got.ok ? { at, by, pfPaymentId, status: got.data.status, amount: got.data.amount, bankMessage: got.data.bankMessage } : { at, by, pfPaymentId, error: got.message };
  const saved = await changeOrder(ref, by, () => ({ update: { payfastCheck: check } }));
  if ("error" in saved) return saved;
  return got.ok ? { ok: true } : { error: got.message };
}
