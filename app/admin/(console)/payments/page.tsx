import type { Metadata } from "next";
import Link from "next/link";
import { lastCheck, monthLedger, parseMonth, thisMonth, type CheckRecord, type Ledger, type LedgerRow, type Match, type Unrecorded } from "@/lib/admin/payments";
import { rands, signedRands } from "@/lib/catalog/listing";
import { payfastSandbox } from "@/lib/checkout/payfast";
import { payfastStatus } from "@/lib/checkout/payfastApi";
import { fromShopTime } from "@/lib/shopTime";
import { Alert, Check } from "@/app/site/icons";
import { at, short, whenInline } from "../../when";
import { MonthNav, monthName } from "../MonthNav";
import { PayfastStatusNotice } from "../PayfastStatusNotice";
import { CheckNow } from "./CheckNow";

export const metadata: Metadata = { title: "Payments" };

/** PayFast's funding codes in the shop's words; anything else as PayFast writes it. */
const FUNDING: Record<string, string> = { CC: "card", DC: "debit card", EFT: "EFT", WALLET: "wallet" };
const funding = (code: string) => FUNDING[code.toUpperCase()] ?? code;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** When the payments were last checked against PayFast, under Check now. */
function checkedLine(check: CheckRecord | null, now: string) {
  if (!check) return "Not checked yet. The daily check runs at 06:00.";
  if (!check.ok) return `The last check, ${whenInline(check.at, now)}, couldn’t read PayFast.`;
  return `Checked ${whenInline(check.at, now)} by ${check.by}.`;
}

/** The page's answer, in one sentence: does the month add up? */
function verdict(ledger: Ledger, month: string, current: string) {
  const { count } = ledger.payments;
  if (count === 0 && ledger.unrecorded.length === 0) return `No payments in ${monthName(month)}.`;
  if (ledger.exceptions) return `${ledger.exceptions} ${plural(ledger.exceptions, "payment needs", "payments need")} a look`;
  const when = month === current ? "this month" : `in ${monthName(month)}`;
  return count === 1 ? `The one payment ${when} matches its order.` : `All ${count} payments ${when} match their orders.`;
}

/** What a line needs, in the shop's words, when it doesn't add up: the problem and what to do. */
function reason(m: Match): { text: string; fix: string } | null {
  switch (m.kind) {
    case "missed":
      return { text: "Paid, but the order isn’t marked paid", fix: "Its notice never arrived. Open the order to accept PayFast’s record." };
    case "amount":
      return { text: `Expected ${rands(m.expected)}`, fix: "The amount isn’t what its order asked for. It wasn’t marked paid." };
    case "duplicate":
      return { text: "A second payment for this order", fix: "The customer paid twice. Refund one in PayFast." };
    case "no-order":
      return { text: m.ref ? `No such order (${m.ref})` : "Names no order of the shop’s", fix: "Check it in PayFast." };
    default:
      return null;
  }
}

/**
 * PayFast's own record of the month's money, each payment beside the order it
 * paid. Exceptions come first and say what to do; a matched payment is a
 * quiet row. Read live from PayFast on every visit; Check now also flags each
 * exception on its order, as the daily check does.
 */
export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const current = thisMonth();
  const month = parseMonth((await searchParams).month) ?? current;
  const [read, check, status] = await Promise.all([monthLedger(month), lastCheck(), payfastStatus()]);
  const now = new Date().toISOString();
  const ledger = read.ok ? read.data : null;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Payments</h1>
          <p className="page__lede">PayFast’s own record of every payment, each beside the order it paid. Anything that doesn’t add up comes first.</p>
        </div>
        <div className="pay__check">
          <CheckNow month={month} />
          <p className="pay__checked">{checkedLine(check, now)}</p>
        </div>
      </header>

      <PayfastStatusNotice status={status} />

      <MonthNav base="/admin/payments" month={month} current={current}>
        {payfastSandbox() ? <span className="pay__sandbox">Sandbox</span> : null}
      </MonthNav>

      {!ledger ? (
        <div className="pay__verdict pay__verdict--bad" role="alert">
          <Alert size={24} />
          <div>
            <p className="pay__verdictText">PayFast’s record couldn’t be read.</p>
            {!read.ok ? <p className="pay__verdictMore">{read.message}</p> : null}
          </div>
        </div>
      ) : (
        <>
          <div className={`pay__verdict${ledger.exceptions ? " pay__verdict--bad" : ""}`} role="status">
            {ledger.exceptions ? <Alert size={24} /> : <Check size={24} />}
            <div>
              <p className="pay__verdictText">{verdict(ledger, month, current)}</p>
              {ledger.payments.count ? (
                <p className="pay__verdictMore">
                  {rands(ledger.payments.gross)} taken, {rands(-ledger.payments.fee)} to PayFast in fees, {rands(ledger.payments.net)} to the shop.
                </p>
              ) : null}
            </div>
          </div>

          {ledger.rows.length || ledger.unrecorded.length ? (
            <div className="plist__wrap">
              <table className="plist ledger">
                <caption className="visually-hidden">PayFast’s transactions in {monthName(month)}, exceptions first</caption>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Payment</th>
                    <th className="plist__num">Paid</th>
                    <th className="plist__num">Fee</th>
                    <th className="plist__num">To the shop</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.unrecorded.map((u) => (
                    <UnrecordedRow key={u.ref} u={u} now={now} />
                  ))}
                  {ledger.rows.map((r, i) => (
                    <Row key={`${r.pfPaymentId}-${r.type}-${i}`} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}

      {check && !check.ok ? (
        <p className="hint pay__foot">
          The last check’s error: {check.error} ({at(check.at)})
        </p>
      ) : null}
    </div>
  );
}

function Row({ r }: { r: LedgerRow }) {
  const m = r.match;
  const why = reason(m);
  const ref = "ref" in m ? m.ref : null;
  const name = "name" in m ? m.name : null;
  const kind = m.kind === "refund" ? "Refund" : m.kind === "outside" ? "Not from the shop’s checkout" : m.kind === "other" ? r.type.replace(/_/g, " ").toLowerCase() : null;
  // A line with an order shows the order; its kind (a refund, say) then goes under it.
  const tag = ref && name ? kind : null;
  const when = short(fromShopTime(r.date));
  const how = r.funding ? funding(r.funding) : null;

  return (
    <tr className={`plist__row ledger__row${why ? " ledger__row--look" : ""}${m.kind === "other" ? " ledger__row--quiet" : ""}`}>
      <td className="ledger__when">
        {when}
        {how ? <span className="ledger__how">{how}</span> : null}
      </td>
      <td className="plist__main">
        {ref && name ? (
          <Link href={`/admin/orders/${ref}`} className="plist__name">
            {name}
          </Link>
        ) : (
          <span className="ledger__what">{kind ?? r.party}</span>
        )}
        <span className="plist__code">{[r.attempt || null, `PayFast ${r.pfPaymentId}`].filter(Boolean).join(" · ")}</span>
        <span className="ledger__whenInline">{[when, how, tag].filter(Boolean).join(" · ")}</span>
        {tag ? <span className="ledger__how ledger__kind">{tag}</span> : null}
        {why ? (
          <span className="ledger__why">
            <span className="flag">
              <Alert size={14} />
              {why.text}
            </span>
            <span className="ledger__fix">{why.fix}</span>
          </span>
        ) : null}
      </td>
      <td className="plist__num ledger__amount" data-label="Paid">
        {signedRands(r.gross)}
      </td>
      <td className="plist__num ledger__amount" data-label="Fee">
        {signedRands(-r.fee)}
      </td>
      <td className="plist__num ledger__amount" data-label="To the shop">
        {signedRands(r.net)}
      </td>
    </tr>
  );
}

function UnrecordedRow({ u, now }: { u: Unrecorded; now: string }) {
  return (
    <tr className="plist__row ledger__row ledger__row--look">
      <td className="ledger__when">{whenInline(u.paidAt, now)}</td>
      <td className="plist__main">
        <Link href={`/admin/orders/${u.ref}`} className="plist__name">
          {u.name}
        </Link>
        <span className="plist__code">
          {u.ref} · PayFast {u.pfPaymentId}
        </span>
        <span className="ledger__why">
          <span className="flag">
            <Alert size={14} />
            Not in PayFast’s record
          </span>
          <span className="ledger__fix">The order is marked paid, but PayFast’s history has no such payment. Check it in PayFast before making it.</span>
        </span>
      </td>
      <td className="plist__num ledger__amount" data-label="Order">
        {rands(u.total)}
      </td>
      <td className="plist__num ledger__amount" data-label="Fee">
        –
      </td>
      <td className="plist__num ledger__amount" data-label="To the shop">
        –
      </td>
    </tr>
  );
}
