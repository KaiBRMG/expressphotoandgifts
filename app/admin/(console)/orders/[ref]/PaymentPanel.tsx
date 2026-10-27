import { rands } from "@/lib/catalog/listing";
import { unitsToReturn } from "@/lib/catalog/stock";
import { hasLeftShop, refundedOf, type NoticeOutcome, type NoticeRecord, type Order } from "@/lib/checkout/order";
import { paymentIdFor } from "@/lib/admin/payments";
import { paymentRefunds, refundedTotal } from "@/lib/checkout/payfastApi";
import { cancelProblem, REFUND_REASONS, isRefundReason, unrecordedRefund, type Refundable } from "@/lib/checkout/refunds";
import { at } from "../../../when";
import { CancelOrder, CheckRefund, CheckWithPayfast, RefundForm, ReturnToStock } from "./OrderActions";

/** PayFast's "123.45" as cents. */
const pfCents = (amount: string) => Math.round(Number(amount) * 100) || 0;

const OUTCOMES: Record<NoticeOutcome, string> = {
  paid: "Paid the order",
  duplicate: "A second payment",
  mismatch: "Amount didn’t match",
  "not-complete": "Not complete",
  "unknown-attempt": "Unknown attempt",
  refused: "Refused",
  missed: "Paid, notice missed",
  "no-record": "Not in PayFast’s record",
  refund: "Refund not recorded",
  unconfirmed: "Window said paid, no payment",
};

/**
 * The order's payment record: the payment as PayFast's notice reported it,
 * PayFast's own word on it when staff ask, refunds as PayFast's records show
 * them, and every notice the order received.
 */
export async function PaymentPanel({ order: o, notices }: { order: Order; notices: NoticeRecord[] }) {
  const paid = o.status === "paid";
  // A paid order's refunds, asked of PayFast as the tab renders. (An unpaid one is looked for in the next step.)
  const fromPayfast = paid && o.payment ? await paymentRefunds(o.payment.pfPaymentId) : null;
  // The payment "Check with PayFast" asks about, found as the action finds it.
  const pf = paymentIdFor(o, notices);
  const recorded = refundedOf(o);
  const check = o.payfastCheck;
  // All the refund and cancel forms are sent of the order.
  const refundable: Refundable = { ref: o.ref, status: o.status, stage: o.stage, lines: o.lines, refunds: o.refunds, delivery: o.delivery, total: o.total, fulfilment: o.fulfilment, shipment: o.shipment };

  return (
    <div className="otab">
      {o.payment ? (
        <dl className="ofacts">
          <div>
            <dt>PayFast payment</dt>
            <dd className="mono">{o.payment.pfPaymentId}</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd>{rands(pfCents(o.payment.amountGross))}</dd>
          </div>
          <div>
            <dt>PayFast’s fee</dt>
            <dd>{rands(Math.abs(pfCents(o.payment.amountFee)))}</dd>
          </div>
          <div>
            <dt>To the shop</dt>
            <dd>{rands(pfCents(o.payment.amountNet))}</dd>
          </div>
          <div>
            <dt>Attempt</dt>
            <dd className="mono">{o.payment.attempt}</dd>
          </div>
        </dl>
      ) : (
        <p className="osec__soft">No payment yet.</p>
      )}

      {pf ? (
        <div className="opay__check">
          <CheckWithPayfast ref_={o.ref} />
          {check ? (
            "error" in check ? (
              <p className="osec__soft">
                Couldn’t ask PayFast ({at(check.at)}): {check.error}
              </p>
            ) : (
              <p className="opay__said">
                PayFast says <strong>{check.status.toLowerCase()}</strong>
                {check.amount !== null ? `, ${rands(check.amount)}` : ""}
                {check.bankMessage ? `. The bank: “${check.bankMessage}”` : ""}
                <span className="osec__soft">
                  Payment {check.pfPaymentId}, asked {at(check.at)} by {check.by}
                </span>
              </p>
            )
          ) : null}
        </div>
      ) : null}

      {fromPayfast ? (
        <>
          <h3 className="osec__sub">Refunds (PayFast)</h3>
          {!fromPayfast.ok ? (
            <p className="osec__soft">PayFast’s refunds couldn’t be read: {fromPayfast.message}</p>
          ) : fromPayfast.data.refunds.length === 0 ? (
            <p className="osec__soft">None.</p>
          ) : (
            <ul className="olog">
              {fromPayfast.data.refunds.map((r, i) => (
                <li key={`${r.at}-${i}`}>
                  <strong>{rands(Math.abs(r.amount))}</strong> refunded
                  <span className="osec__soft">{r.at}</span>
                </li>
              ))}
              {fromPayfast.data.available !== null ? <li className="osec__soft">{rands(fromPayfast.data.available)} left that PayFast can refund</li> : null}
            </ul>
          )}
        </>
      ) : null}

      {o.refunds?.length ? (
        <>
          <h3 className="osec__sub">Refunds recorded</h3>
          <ul className="olog">
            {o.refunds.map((r) => (
              <li key={r.at}>
                <strong>{rands(r.amount)}</strong> · {isRefundReason(r.reason) ? REFUND_REASONS[r.reason].label : r.note}
                {r.keep ? ` · ${rands(r.keep.amount)} kept: ${r.keep.note}` : ""}
                <span className="osec__soft">
                  {at(r.at)}, {r.by}
                  {r.via === "dashboard" ? ", made in PayFast’s dashboard" : r.via === "payfast" ? ", through PayFast" : ""}
                  {isRefundReason(r.reason) && r.note !== REFUND_REASONS[r.reason].label ? `: ${r.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {fromPayfast?.ok && unrecordedRefund(o, refundedTotal(fromPayfast.data)) > 0 ? (
        <p className="admin-error">
          PayFast shows {rands(unrecordedRefund(o, refundedTotal(fromPayfast.data)))} refunded that this order doesn’t record. Record it below (It was refunded in PayFast’s dashboard), so the
          customer is emailed and the books match.
        </p>
      ) : null}
      {o.refunding ? <CheckRefund ref_={o.ref} amount={o.refunding.plan.amount} unclear={o.refunding.state === "unknown"} /> : null}
      {paid && !o.refunding && !cancelProblem(refundable) ? (
        <CancelOrder order={refundable} units={unitsToReturn(o.stock)} waybill={o.shipment?.state === "booked" && !hasLeftShop(o.shipment.status) ? (o.shipment.tracking ?? null) : null} />
      ) : null}
      {paid && !o.refunding && recorded < o.total ? <RefundForm order={refundable} /> : null}
      {paid && unitsToReturn(o.stock) > 0 ? <ReturnToStock ref_={o.ref} units={unitsToReturn(o.stock)} /> : null}

      {notices.length ? (
        <>
          <h3 className="osec__sub">PayFast notices</h3>
          <ul className="olog">
            {notices.map((n) => (
              <li key={`${n.outcome}-${n.pfPaymentId}-${n.status}-${n.at}`}>
                <strong>{OUTCOMES[n.outcome]}</strong> · {n.status ? `${n.status} ` : ""}{rands(pfCents(n.amountGross))} · <span className="mono">{n.pfPaymentId}</span>
                <span className="osec__soft">
                  {at(n.at)}
                  {n.attempt ? `, attempt ${n.attempt}` : ""}
                  {n.reason ? `: ${n.reason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
