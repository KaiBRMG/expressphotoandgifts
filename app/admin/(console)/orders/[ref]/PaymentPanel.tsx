import { rands } from "@/lib/catalog/listing";
import { unitsToReturn } from "@/lib/catalog/stock";
import { refundedOf, type NoticeOutcome, type NoticeRecord, type Order } from "@/lib/checkout/order";
import { paymentIdFor } from "@/lib/admin/payments";
import { paymentRefunds } from "@/lib/checkout/payfastApi";
import { at } from "../../../when";
import { CheckWithPayfast, RecordRefund, ReturnToStock } from "./OrderActions";

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
          <h3 className="osec__sub">Refunds (outside PayFast)</h3>
          <ul className="olog">
            {o.refunds.map((r) => (
              <li key={r.at}>
                <strong>{rands(r.amount)}</strong> · {r.note}
                <span className="osec__soft">
                  {at(r.at)}, {r.by}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {paid && recorded < o.total ? <RecordRefund ref_={o.ref} left={o.total - recorded} /> : null}
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
