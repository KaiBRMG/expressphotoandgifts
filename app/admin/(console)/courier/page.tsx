import type { Metadata } from "next";
import Link from "next/link";
import { courierMonth, type CourierRow } from "@/lib/admin/courier";
import { parseMonth, thisMonth } from "@/lib/admin/payments";
import { rands, signedRands } from "@/lib/catalog/listing";
import { courierReady } from "@/lib/checkout/courier";
import { statusText } from "@/lib/checkout/order";
import { Alert, ArrowLeft, ArrowRight, Check, External } from "@/app/site/icons";
import { short } from "../../when";

export const metadata: Metadata = { title: "Courier" };

const monthName = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });

const shift = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * The Courier Guy's own record of the month: every waybill on the account,
 * each beside the order it carried, with what TCG charged against what the
 * customer paid for delivery. Anything that doesn't add up comes first.
 * Read live from TCG on every visit.
 */
export default async function CourierPage({ searchParams }: PageProps<"/admin/courier">) {
  const current = thisMonth();
  const month = parseMonth((await searchParams).month) ?? current;
  const read = courierReady() ? await courierMonth(month) : { ok: false as const, message: "The Courier Guy isn’t set up: TCG_API_KEY is missing." };
  const ledger = read.ok ? read.data : null;
  const count = ledger?.rows.length ?? 0;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Courier</h1>
          <p className="page__lede">The Courier Guy&rsquo;s own record of every waybill, each beside the order it carried and what it cost. Anything that doesn&rsquo;t add up comes first.</p>
        </div>
        <a className="admin-link pay__checked" href={`/admin/courier/statement?month=${month}`} target="_blank" rel="noopener">
          TCG&rsquo;s statement for {monthName(month)} <External size={14} />
        </a>
      </header>

      <nav className="pay__months" aria-label="Month">
        <Link className="pay__step" href={`/admin/courier?month=${shift(month, -1)}`} aria-label={`Previous month, ${monthName(shift(month, -1))}`}>
          <ArrowLeft size={20} />
        </Link>
        <h2 className="pay__month">{monthName(month)}</h2>
        {month < current ? (
          <Link className="pay__step" href={`/admin/courier?month=${shift(month, 1)}`} aria-label={`Next month, ${monthName(shift(month, 1))}`}>
            <ArrowRight size={20} />
          </Link>
        ) : (
          <span className="pay__step pay__step--off" aria-hidden="true">
            <ArrowRight size={20} />
          </span>
        )}
      </nav>

      {!ledger ? (
        <div className="pay__verdict pay__verdict--bad" role="alert">
          <Alert size={24} />
          <div>
            <p className="pay__verdictText">The Courier Guy&rsquo;s record couldn&rsquo;t be read.</p>
            {!read.ok ? <p className="pay__verdictMore">{read.message}</p> : null}
          </div>
        </div>
      ) : (
        <>
          <div className={`pay__verdict${ledger.exceptions ? " pay__verdict--bad" : ""}`} role="status">
            {ledger.exceptions ? <Alert size={24} /> : <Check size={24} />}
            <div>
              <p className="pay__verdictText">
                {count === 0
                  ? `No waybills in ${monthName(month)}.`
                  : ledger.exceptions
                    ? `${ledger.exceptions} ${plural(ledger.exceptions, "waybill needs", "waybills need")} a look`
                    : count === 1
                      ? "The one waybill matches its order."
                      : `All ${count} waybills match their orders.`}
              </p>
              {count ? (
                <p className="pay__verdictMore">
                  {rands(ledger.charged)} charged by The Courier Guy; customers paid {rands(ledger.paid)} for delivery
                  {ledger.paid !== ledger.charged ? `, so the shop is ${ledger.paid > ledger.charged ? `${rands(ledger.paid - ledger.charged)} ahead` : `${rands(ledger.charged - ledger.paid)} short`}` : ""}.
                  {ledger.billed ? "" : " TCG’s billing couldn’t be read, so these are its booking prices, not its charges."}
                </p>
              ) : null}
            </div>
          </div>

          {count ? (
            <div className="plist__wrap">
              <table className="plist ledger">
                <caption className="visually-hidden">The Courier Guy&rsquo;s waybills in {monthName(month)}, exceptions first</caption>
                <thead>
                  <tr>
                    <th>Booked</th>
                    <th>Waybill</th>
                    <th className="plist__num">Customer paid</th>
                    <th className="plist__num">TCG charged</th>
                    <th className="plist__num">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.rows.map((r) => (
                    <Row key={r.waybill.id} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Row({ r }: { r: CourierRow }) {
  const w = r.waybill;
  const when = w.created ? short(new Date(w.created)) : "";
  const cancelled = w.status === "cancelled";
  const paid = r.order?.paid ?? null;
  const diff = paid !== null && r.charged !== null && !cancelled ? paid - r.charged : null;
  const what = [w.tracking, w.status ? statusText(w.status) : null, r.direction === "return" ? "Return" : null].filter(Boolean).join(" · ");

  return (
    <tr className={`plist__row ledger__row${r.problem ? " ledger__row--look" : ""}${cancelled && !r.problem ? " ledger__row--quiet" : ""}`}>
      <td className="ledger__when">{when}</td>
      <td className="plist__main">
        {r.order ? (
          <Link href={`/admin/orders/${r.order.ref}`} className="plist__name">
            {r.order.name}
          </Link>
        ) : (
          <span className="ledger__what">{w.reference || "No reference"}</span>
        )}
        <span className="plist__code">{what}</span>
        <span className="ledger__whenInline">{[when, r.order?.ref].filter(Boolean).join(" · ")}</span>
        {r.problem ? (
          <span className="ledger__why">
            <span className="flag">
              <Alert size={14} />
              {r.problem.text}
            </span>
            <span className="ledger__fix">{r.problem.fix}</span>
          </span>
        ) : null}
      </td>
      <td className="plist__num ledger__amount" data-label="Customer paid">
        {paid === null ? "–" : rands(paid)}
      </td>
      <td className="plist__num ledger__amount" data-label="TCG charged">
        {r.charged === null ? "–" : rands(r.charged)}
      </td>
      <td className="plist__num ledger__amount" data-label="Difference">
        {diff === null ? "–" : signedRands(diff)}
      </td>
    </tr>
  );
}
