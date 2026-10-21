import { rands } from "@/lib/catalog/listing";
import { refundedOf, type NoticeOutcome, type NoticeRecord, type Order } from "@/lib/checkout/order";
import { missedPayments, paymentIdFor } from "@/lib/admin/payments";
import { paymentRefunds } from "@/lib/checkout/payfastApi";
import { at } from "../../../when";
import { AcceptPayfastRecord, CheckWithPayfast, RecordRefund } from "./OrderActions";

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
 * The order's money: the payment as PayFast's notice reported it, PayFast's
 * own word on it when staff ask, refunds as PayFast's records show them, and
 * every notice the order received. A payment PayFast's history shows but
 * whose notice never arrived can be accepted here; nothing else marks it paid.
 */
export async function PaymentPanel({ order: o, notices }: { order: Order; notices: NoticeRecord[] }) {
  const paid = o.status === "paid";
  // Asked of PayFast as the page opens: an unpaid order's missed payments, a paid one's refunds. One call either way.
  const [missedRead, fromPayfast] = await Promise.all([paid ? [] : missedPayments(o), paid && o.payment ? paymentRefunds(o.payment.pfPaymentId) : null]);
  const missed = Array.isArray(missedRead) ? missedRead : [];
  // The payment "Check with PayFast" asks about, found as the action finds it.
  const pf = paymentIdFor(o, notices);
  const recorded = refundedOf(o);
  const check = o.payfastCheck;

  return (
    <section className="osec" aria-labelledby="pay-title">
      <h2 id="pay-title" className="osec__title">
        Payment
      </h2>
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

      {missed.length ? (
        <div className="opay__accept">
          <p>
            {missed.length === 1
              ? `PayFast’s record shows ${rands(missed[0].gross)} paid for this order (payment ${missed[0].pfPaymentId}), but its notice never reached the shop. Check it in your PayFast dashboard, then accept it: the order is marked paid exactly as its notice would have done, and the emails go.`
              : `PayFast’s record shows ${missed.length} payments for this order whose notices never arrived. Check them in your PayFast dashboard: one will need refunding before this order can be accepted.`}
          </p>
          {missed.length === 1 ? <AcceptPayfastRecord ref_={o.ref} /> : null}
        </div>
      ) : !Array.isArray(missedRead) ? (
        <p className="osec__soft">PayFast’s record couldn’t be read to look for this order’s payment: {missedRead.error}</p>
      ) : null}

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
          <h3 className="osec__sub">Refunds in PayFast</h3>
          {!fromPayfast.ok ? (
            <p className="osec__soft">PayFast’s refunds couldn’t be read: {fromPayfast.message}</p>
          ) : fromPayfast.data.refunds.length === 0 ? (
            <p className="osec__soft">None. Refunds are made in your PayFast dashboard and show here.</p>
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
          <h3 className="osec__sub">Refunds made outside PayFast</h3>
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
    </section>
  );
}
