import Link from "next/link";
import type { Funnel, Report, Span } from "@/lib/admin/analytics";
import { productHref, rands } from "@/lib/catalog/listing";
import { Alert, Download } from "@/app/site/icons";
import { Tip } from "../../Tip";
import { MonthNav, shortMonth } from "../MonthNav";
import { dayMonth } from "../../when";
import { BarList } from "./BarList";
import { percent, numbered, waited } from "./format";
import { Takings } from "./Takings";

/**
 * How the online shop did, a month at a time, for the owner's review: the
 * money first, then what sold, how far customers got, who they were, how
 * long orders took.
 */
export function AnalyticsView({ report, current }: { report: Report; current: string }) {
  const month = report.month;
  const name = shortMonth(month);

  return (
    <div className="page an">
      <header className="page__head">
        <div>
          <h1 className="page__title">Analytics</h1>
          <p className="page__lede">How the online shop did, a month at a time: the money, what sold, how far customers got and who they were.</p>
        </div>
        <a className="admin-link" href={`/admin/analytics/export?month=${month}`} download>
          <Download size={18} /> {name}&rsquo;s orders as a spreadsheet
        </a>
      </header>

      <MonthNav base="/admin/analytics" month={month} current={current} />

      <Takings r={report.revenue} month={month} today={report.today} current={month === current} />

      <Sales report={report} />
      <FunnelSection funnel={report.funnel} month={month} />

      <div className="an__pair">
        <Customers report={report} />
        <Turnaround report={report} />
      </div>
    </div>
  );
}

function Section({ id, title, lede, children }: { id: string; title: string; lede?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="an__sec" aria-labelledby={id}>
      <h2 id={id} className="an__title">
        {title}
      </h2>
      {lede ? <p className="an__lede">{lede}</p> : null}
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="an__empty">{children}</p>;

/* ---- What sold ----------------------------------------------------------- */

function Sales({ report }: { report: Report }) {
  const { sales, revenue, funnel } = report;
  const counted = funnel.since !== null;
  return (
    <Section id="an-sales" title="What sold" lede="At the prices customers paid for each item, after price deals and before deals on the whole cart.">
      {revenue.orders === 0 ? (
        <Empty>Nothing sold this month yet.</Empty>
      ) : (
        <>
          <div className="an__split">
            <div>
              <h3 className="an__sub">By category</h3>
              <BarList label="Sales by category" bars={sales.categories.map((c) => ({ key: c.key, label: c.name, value: c.revenue, shown: rands(c.revenue), detail: numbered(c.units, "item", "items") }))} />
            </div>
            <div>
              <h3 className="an__sub">Best sellers</h3>
              <div className="an__tableWrap">
                <table className="an__table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="an__num">Sold</th>
                      <th className="an__num">Takings</th>
                      {counted ? (
                        <th className="an__num">
                          <span className="label-tip">
                            Viewed, added
                            <Tip about="Viewed, added">Visits that opened the product’s page, then visits that added it to the cart. The shop counts each once a visit.</Tip>
                          </span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.products.map((p) => (
                      <tr key={p.key}>
                        <td>
                          <a className="an__product" href={productHref(p.key)} target="_blank" rel="noopener">
                            {p.name}
                          </a>
                        </td>
                        <td className="an__num">{p.units}</td>
                        <td className="an__num">{rands(p.revenue)}</td>
                        {counted ? (
                          <td className="an__num">
                            {p.views}, {p.carts}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="an__split">
            <div>
              <h3 className="an__sub">Best sizes</h3>
              <BarList label="Best selling sizes" bars={sales.sizes.map((s) => ({ key: s.key, label: s.name, value: s.units, shown: `${s.units.toLocaleString("en-ZA")} sold`, detail: rands(s.revenue) }))} />
            </div>
            <div>
              <h3 className="an__sub">Deals</h3>
              {sales.campaigns.length === 0 ? (
                <Empty>No campaign took anything off an order this month.</Empty>
              ) : (
                <div className="an__tableWrap">
                  <table className="an__table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th className="an__num">Orders</th>
                        <th className="an__num">
                          <span className="label-tip">
                            Given away
                            <Tip about="Given away">What the deal took off prices on paid orders this month.</Tip>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.campaigns.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link className="an__product" href={`/admin/campaigns/${c.id}`}>
                              {c.name}
                            </Link>
                          </td>
                          <td className="an__num">{c.orders}</td>
                          <td className="an__num">{rands(c.given)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

/* ---- How far customers got ---------------------------------------------- */

function FunnelSection({ funnel, month }: { funnel: Funnel; month: string }) {
  // The browser's steps only once they were being counted: before that, their zeros would read as no one visiting.
  const counted = funnel.since !== null && funnel.since <= `${month}-31`;
  const steps = counted ? funnel.steps : funnel.steps.filter((s) => s.key === "pay" || s.key === "paid");
  const top = Math.max(1, ...steps.map((s) => s.count));
  const lede = !counted ? (
    "Looking at a product, adding to cart and each step of checkout are counted from the day this page went live, so this month shows only the orders."
  ) : (
    <>Each visit counts once a step; Pressed Pay and Paid are orders. Counted since {dayMonth(new Date(`${funnel.since}T12:00:00+02:00`))}.</>
  );
  return (
    <Section id="an-funnel" title="How far customers got" lede={lede}>
      <ol className="funnel">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].count : null;
          return (
            <li key={s.key} className="funnel__step">
              <span className="funnel__label">{s.label}</span>
              <span className="funnel__count">{s.count.toLocaleString("en-ZA")}</span>
              <span className="funnel__on">{prev ? `${percent(s.count, prev)} of the step before` : ""}</span>
              <span className="funnel__track" aria-hidden="true">
                <span className="funnel__fill" style={{ width: `${Math.max(s.count ? 1.5 : 0, (s.count / top) * 100)}%` }} />
              </span>
            </li>
          );
        })}
      </ol>
      {funnel.unpaid.orders ? (
        <p className="an__aside">
          <Alert size={20} /> {numbered(funnel.unpaid.orders, "order", "orders")} worth {rands(funnel.unpaid.value)} got as far as Pay and {funnel.unpaid.orders === 1 ? "wasn’t" : "weren’t"} paid.
        </p>
      ) : null}
      {funnel.misses.length ? (
        <>
          <h3 className="an__sub">Searches that found nothing</h3>
          <ul className="misses">
            {funnel.misses.map((m) => (
              <li key={m.q} className="misses__item">
                <span>{m.q}</span>
                <span className="misses__n mono">{m.n}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Section>
  );
}

/* ---- Customers and turnaround -------------------------------------------- */

function Customers({ report }: { report: Report }) {
  const c = report.customers;
  return (
    <Section id="an-customers" title="Who ordered">
      {c.people === 0 ? (
        <Empty>No one has paid for an order this month yet.</Empty>
      ) : (
        <>
          <dl className="an__facts">
            <Fact term="Customers" value={c.people} />
            <Fact term="Ordered before" value={c.returning} of={`${c.people}`} />
            <Fact term="Signed in" value={c.accounts} of={numbered(report.revenue.orders, "order", "orders")} />
            <Fact term="Sent as gifts" value={c.gifts} of={`${report.revenue.shipped.orders} couriered`} />
          </dl>
          {c.provinces.length ? (
            <>
              <h3 className="an__sub">Couriered to</h3>
              <BarList label="Couriered orders by province" bars={c.provinces.map((p) => ({ key: p.name, label: p.name, value: p.orders, shown: numbered(p.orders, "order", "orders") }))} />
            </>
          ) : null}
        </>
      )}
    </Section>
  );
}

/** A figure: a number, or a value already in words, and what it's out of. */
function Fact({ term, value, of }: { term: string; value: number | string; of?: string }) {
  return (
    <div className="an__fact">
      <dt>{term}</dt>
      <dd>
        {typeof value === "number" ? value.toLocaleString("en-ZA") : value}
        {of !== undefined ? <span className="an__of"> of {of}</span> : null}
      </dd>
    </div>
  );
}

function Turnaround({ report }: { report: Report }) {
  const t = report.turnaround;
  const rows: [string, Span][] = [
    ["Paid to ready", t.ready],
    ["Paid to collected", t.collected],
    ["Paid to sent", t.sent],
    ["Paid to delivered", t.delivered],
  ];
  const any = rows.some(([, s]) => s);
  return (
    <Section id="an-turnaround" title="How long orders took" lede="The middle order of the month, from payment to each stage, counted in hours on the clock, nights and weekends included.">
      {!any ? (
        <Empty>No order paid this month has reached a stage yet.</Empty>
      ) : (
        <dl className="an__facts an__facts--rows">
          {rows.map(([term, s]) => (
            <div key={term} className="an__fact">
              <dt>{term}</dt>
              <dd>
                {s ? waited(s.hours) : "—"}
                {s ? <span className="an__of"> over {numbered(s.n, "order", "orders")}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}
