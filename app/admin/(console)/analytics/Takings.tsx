import type { Cost, Revenue } from "@/lib/admin/analytics";
import { rands, signedRands } from "@/lib/catalog/listing";
import { shortMonth } from "../MonthNav";
import { dayLabel, numbered, wholeRands } from "./format";
import { PaceChart } from "./PaceChart";

type Step = {
  label: string;
  /** Cents; a deduction is drawn hanging back from where the line before ended. */
  amount: number | null;
  kind: "add" | "less" | "total";
  /** Why the amount isn't known, or a word on how it was read. */
  note?: string;
};

/**
 * Takings: the page's one blue ground. The month's money as one sentence,
 * how it built up against the month before, and a ledger from the catalogue's
 * prices down to what the shop kept once PayFast and The Courier Guy were paid.
 */
export function Takings({ r, month, today, current }: { r: Revenue; month: string; today: number; current: boolean }) {
  const name = shortMonth(month);
  const beforeName = shortMonth(r.before.month);
  const comparison = compare(r, beforeName, current ? today : null);

  const cost = (c: Cost): Pick<Step, "amount" | "note"> => (c.ok ? { amount: c.cents, note: c.note } : { amount: null, note: c.why });

  const steps: Step[] = [
    { label: "Items at catalogue prices", amount: r.catalogue, kind: "add" },
    { label: "Deals", amount: r.deals, kind: "less" },
    { label: "Delivery charged", amount: r.delivery, kind: "add" },
    { label: "Customers paid", amount: r.paid, kind: "total" },
    { label: r.refunded ? `Refunds (${r.refunded})` : "Refunds", amount: r.refunds, kind: "less" },
    { label: "Takings", amount: r.net, kind: "total" },
    { label: "PayFast fees", kind: "less", ...cost(r.fees) },
    { label: "The Courier Guy", kind: "less", ...cost(r.courier) },
    {
      label: "Kept after fees and courier",
      amount: r.kept,
      kind: "total",
      note: r.kept === null ? "Known once PayFast and The Courier Guy can both be read." : undefined,
    },
  ];

  return (
    <section className="takings" aria-labelledby="takings-title">
      <div className="takings__top">
        <div>
          <h2 id="takings-title" className="takings__title">
            Takings in {name}
          </h2>
          <p className="takings__figure">{wholeRands(r.net)}</p>
          <p className="takings__line">
            {r.orders === 0 ? `No paid orders in ${name}${current ? " yet" : ""}.` : `From ${numbered(r.orders, "paid order", "paid orders")}${r.refunds ? `, after ${rands(r.refunds)} refunded` : ""}.`}
            {comparison ? ` ${comparison}` : ""}
          </p>
          {r.orders ? (
            <dl className="takings__facts">
              <div>
                <dt>Average order</dt>
                <dd>{rands(r.average!)}</dd>
              </div>
              <div>
                <dt>Collected</dt>
                <dd>
                  {numbered(r.collect.orders, "order", "orders")}, {wholeRands(r.collect.paid)}
                </dd>
              </div>
              <div>
                <dt>Couriered</dt>
                <dd>
                  {numbered(r.shipped.orders, "order", "orders")}, {wholeRands(r.shipped.paid)}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
        <div>
          <PaceChart pace={r.pace} month={month} previous={r.before.month} nowName={name} beforeName={beforeName} />
          <div className="visually-hidden">
            <table>
              <caption>
                Takings so far, day by day, {name} beside {beforeName}
              </caption>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>{name}</th>
                  <th>{beforeName}</th>
                </tr>
              </thead>
              <tbody>
                {r.pace.map((p) => (
                  <tr key={p.day}>
                    <th>{dayLabel(month, p.day)}</th>
                    <td>{p.now === null ? "To come" : rands(p.now)}</td>
                    <td>{p.before === null ? "—" : rands(p.before)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Ledger steps={steps} />

      <p className="takings__note">
        {r.courier.ok && r.shipped.orders
          ? `Customers paid ${rands(r.delivery)} for delivery and The Courier Guy charged ${rands(r.courier.cents)}${
              r.delivery === r.courier.cents
                ? ", which is level"
                : r.delivery > r.courier.cents
                  ? `, so delivery made ${rands(r.delivery - r.courier.cents)}`
                  : `, so the shop carried ${rands(r.courier.cents - r.delivery)}`
            }. `
          : ""}
        Prices include VAT. Counter sales aren&rsquo;t in these figures.
      </p>
    </section>
  );
}

/** The waterfall as a ledger: each line's amount on the right, and a bar showing where it leaves the running total. */
function Ledger({ steps }: { steps: Step[] }) {
  // Each line runs from where the running total stood to where it leaves it; a total starts again from nothing.
  const rows = steps.reduce<(Step & { from: number; to: number; run: number })[]>((out, s) => {
    const amount = s.amount ?? 0;
    const start = s.kind === "total" ? 0 : (out.at(-1)?.run ?? 0);
    const run = s.kind === "total" ? amount : start + (s.kind === "add" ? amount : -amount);
    return [...out, { ...s, run, from: Math.max(0, Math.min(start, run)), to: Math.max(0, start, run) }];
  }, []);
  const scale = Math.max(1, ...rows.map((s) => s.to));

  return (
    <table className="ledgerfall">
      <caption className="visually-hidden">From the catalogue&rsquo;s prices to what the shop kept</caption>
      <tbody>
        {rows.map((s) => (
          <tr key={s.label} className={`ledgerfall__row ledgerfall__row--${s.kind}`}>
            <th scope="row" className="ledgerfall__label">
              {s.label}
              {s.note ? <span className="ledgerfall__note">{s.note}</span> : null}
            </th>
            <td className="ledgerfall__bar" aria-hidden="true">
              {s.amount !== null && s.to > s.from ? <span className="ledgerfall__fill" style={{ left: `${(s.from / scale) * 100}%`, width: `${((s.to - s.from) / scale) * 100}%` }} /> : null}
            </td>
            <td className="ledgerfall__amount">{s.amount === null ? "Not read" : s.kind === "less" ? signedRands(-s.amount || 0) : rands(s.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The month against the one before: by the same day while it runs, whole once it's over. */
function compare(r: Revenue, beforeName: string, today: number | null): string | null {
  if (r.before.orders === 0) return r.orders === 0 ? null : `${beforeName} had no paid orders to set it against.`;
  const diff = r.net - (today === null ? r.before.net : r.before.atSameDay);
  const by = today === null ? "" : ` by the ${ordinal(today)}`;
  if (diff === 0) return `Level with ${beforeName}${by}.`;
  const way = diff > 0 ? (today === null ? "more than" : "ahead of") : today === null ? "less than" : "behind";
  return `${wholeRands(Math.abs(diff))} ${way} ${beforeName}${by}.`;
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
