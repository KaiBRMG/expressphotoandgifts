import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, type CustomerDetail, type Tally } from "@/lib/admin/customers";
import { itemCount, rands } from "@/lib/catalog/listing";
import { addressLine, nationalPhone } from "@/lib/checkout/details";
import { stageLabel } from "@/lib/checkout/order";
import { Alert, ArrowLeft, Mail, Phone, WhatsApp } from "@/app/site/icons";
import { EmailHistory } from "./EmailHistory";
import { BarList } from "../../analytics/BarList";
import type { ConsentSource } from "@/lib/account/auth";
import { at, when, whenDay as day } from "../../../when";

export async function generateMetadata({ params }: PageProps<"/admin/customers/[key]">): Promise<Metadata> {
  await requireAdmin();
  const c = await getCustomer((await params).key);
  return { title: c ? c.row.name || c.row.email : "Customer" };
}

/** Where a change of mind about marketing email was made, as `setMarketing`'s callers name it. */
const SOURCES: Record<ConsentSource, string> = { footer: "the footer’s sign-up (confirmed by email)", account: "their account page", email: "an email’s unsubscribe link" };

/** A WhatsApp chat with a South African mobile, or null for anything else. */
function chat(phone: string): string | null {
  const n = nationalPhone(phone);
  return n ? `https://wa.me/27${n.slice(1)}` : null;
}

/**
 * One customer, read fresh: who they are and how to reach them beside
 * everything they have ordered, what they buy, where it goes and what they
 * agreed to. Read-only: every change to an order happens on the order.
 */
export default async function CustomerPage({ params }: PageProps<"/admin/customers/[key]">) {
  await requireAdmin();
  const c = await getCustomer((await params).key);
  if (!c) notFound();
  const now = new Date().toISOString();
  const { row } = c;
  const gross = row.spent + row.refunded;
  const wa = row.phone ? chat(row.phone) : null;

  return (
    <div className="page order customer">
      <Link href="/admin/customers" className="back">
        <ArrowLeft size={18} />
        Customers
      </Link>

      <header className="ohead">
        <h1 className="page__title">{row.name || row.email}</h1>
        <p className="ohead__chips">
          {c.account ? <span className="ochip">Account since {day(c.account.since, now)}</span> : <span className="ochip ochip--quiet">Guest, no account</span>}
          {c.marketing?.optedIn ? (
            <span className="ochip ochip--paid">Marketing email: yes</span>
          ) : (
            <span className="ochip ochip--quiet">{c.marketing ? "Marketing email: withdrawn" : "Marketing email: no"}</span>
          )}
        </p>
      </header>

      <div className="order__grid">
        <div className="customer__main">
          <section className="csec" aria-labelledby="orders-title">
            <h2 id="orders-title" className="csec__title">
              Orders
            </h2>
            {c.orders.length === 0 ? (
              <p className="csec__empty">No orders yet. They made an account without ordering.</p>
            ) : (
              <div className="plist__wrap">
                <table className="plist">
                  <caption className="visually-hidden">{c.orders.length} orders</caption>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th className="plist__wide">Paid</th>
                      <th className="plist__num">Total</th>
                      <th>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.orders.map((o) => (
                      <tr key={o.ref} className="plist__row olist__row">
                        <td className="plist__main">
                          <Link href={`/admin/orders/${o.ref}`} className="plist__name">
                            {o.what || "Order"}
                          </Link>
                          <span className="plist__code">
                            {o.ref} · {itemCount(o.units)} · {o.method === "collect" ? "Collect" : "Courier"}
                          </span>
                          {o.flagged ? (
                            <span className="plist__flags">
                              <span className="flag">
                                <Alert size={14} />
                                Needs a look
                              </span>
                            </span>
                          ) : null}
                        </td>
                        <td className="plist__wide plist__date">{o.paid ? when(o.at, now) : "Not paid"}</td>
                        <td className="plist__num olist__total">
                          {rands(o.total)}
                          {o.refunded ? <span className="olist__refund">{o.refunded >= o.total ? "Refunded" : `${rands(o.refunded)} refunded`}</span> : null}
                        </td>
                        <td className="olist__stage">
                          {o.paid && o.stage ? (
                            <span className={`status ostage--${o.stage}`}>{stageLabel(o.stage, o.method)}</span>
                          ) : (
                            <span className="status status--archived">Not paid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {c.products.length ? (
            <section className="csec" aria-labelledby="buys-title">
              <h2 id="buys-title" className="csec__title">
                What they buy
              </h2>
              <BarList
                label="Products by units bought"
                bars={c.products.slice(0, 8).map((t) => ({
                  key: t.key,
                  label: t.detail ? `${t.label}, ${t.detail}` : t.label,
                  value: t.count,
                  shown: itemCount(t.count),
                  detail: rands(t.amount),
                }))}
              />
              {c.products.length > 8 ? <p className="csec__more">And {c.products.length - 8} more, on their orders.</p> : null}
            </section>
          ) : null}

          {c.campaigns.length ? (
            <section className="csec" aria-labelledby="deals-title">
              <h2 id="deals-title" className="csec__title">
                Deals they used
              </h2>
              <ul className="crows">
                {c.campaigns.map((t) => (
                  <li key={t.key} className="crows__row">
                    <Link className="admin-link" href={`/admin/campaigns/${t.key}`}>
                      {t.label}
                    </Link>
                    <span className="crows__value">
                      Saved {rands(t.amount)} <span className="crows__soft">on {t.count === 1 ? "1 order" : `${t.count} orders`}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {c.addresses.length || c.recipients.length ? <Deliveries addresses={c.addresses} recipients={c.recipients} /> : null}

          <Marketing c={c} now={now} />
        </div>

        <aside className="glance" aria-label="Customer at a glance">
          <section className="glance__part" aria-labelledby="who-title">
            <h2 id="who-title" className="glance__title">
              Contact
            </h2>
            <div className="glance__acts">
              {row.phone ? (
                <a className="obtn" href={`tel:${row.phone}`}>
                  <Phone size={18} />
                  {row.phone}
                </a>
              ) : null}
              {wa ? (
                <a className="obtn" href={wa} target="_blank" rel="noopener">
                  <WhatsApp size={18} />
                  WhatsApp
                </a>
              ) : null}
              <a className="obtn obtn--wrap" href={`mailto:${row.email}`}>
                <Mail size={18} />
                {row.email}
              </a>
              <EmailHistory emails={c.emails} />
            </div>
            {Object.values(c.also).some((v) => v.length) ? (
              <dl className="calso">
                <Also label="Also ordered as" values={c.also.names} />
                <Also label="Other mobiles" values={c.also.phones} mono />
                <Also label="Other emails" values={c.also.emails} mono />
              </dl>
            ) : null}
          </section>

          <section className="glance__part" aria-labelledby="money-title">
            <h2 id="money-title" className="glance__title">
              Orders and spend
            </h2>
            <dl className="glance__sums">
              <div>
                <dt>Paid orders</dt>
                <dd>{row.orders}</dd>
              </div>
              {row.orders ? (
                <>
                  <div>
                    <dt>Average order</dt>
                    <dd>{rands(Math.round(gross / row.orders))}</dd>
                  </div>
                  <div>
                    <dt>Collected · couriered</dt>
                    <dd>
                      {c.collected} · {row.orders - c.collected}
                    </dd>
                  </div>
                  <div>
                    <dt>First order</dt>
                    <dd>{day(row.first!, now)}</dd>
                  </div>
                  <div>
                    <dt>Latest order</dt>
                    <dd>{day(row.last!, now)}</dd>
                  </div>
                  {row.refunded ? (
                    <div>
                      <dt>Refunded</dt>
                      <dd>{rands(row.refunded)}</dd>
                    </div>
                  ) : null}
                  <div className="glance__total">
                    <dt>Spent{row.refunded ? ", after refunds" : ""}</dt>
                    <dd>{rands(row.spent)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </section>

          {c.account ? (
            <section className="glance__part" aria-labelledby="account-title">
              <h2 id="account-title" className="glance__title">
                Account
              </h2>
              <dl className="glance__sums">
                <div>
                  <dt>Made</dt>
                  <dd>{day(c.account.since, now)}</dd>
                </div>
                <div>
                  <dt>Last signed in</dt>
                  <dd>{c.account.lastSignIn ? day(c.account.lastSignIn, now) : "Never"}</dd>
                </div>
              </dl>
              {c.account.saved?.address ? (
                <p className="glance__lines">
                  <span className="calso__label">Saved address</span>
                  {addressLine(c.account.saved.address)}
                </p>
              ) : (
                <p className="glance__lines calso__soft">No saved address.</p>
              )}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Also({ label, values, mono = false }: { label: string; values: string[]; mono?: boolean }) {
  if (!values.length) return null;
  return (
    <div>
      <dt className="calso__label">{label}</dt>
      {values.map((v) => (
        <dd key={v} className={mono ? "mono" : undefined}>
          {v}
        </dd>
      ))}
    </div>
  );
}

function Deliveries({ addresses, recipients }: { addresses: Tally[]; recipients: Tally[] }) {
  return (
    <section className="csec" aria-labelledby="where-title">
      <h2 id="where-title" className="csec__title">
        Where it went
      </h2>
      <div className="cpair">
        <TallyRows title="Courier addresses" rows={addresses} detail={(d) => `, ${d}`} />
        <TallyRows title="Sent as gifts to" rows={recipients} detail={(d) => ` ${d}`} mono />
      </div>
    </section>
  );
}

/** A titled list of places or people, each with how many orders went there. */
function TallyRows({ title, rows, detail, mono = false }: { title: string; rows: Tally[]; detail: (d: string) => string; mono?: boolean }) {
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="csec__sub">{title}</h3>
      <ul className="crows">
        {rows.map((t) => (
          <li key={t.key} className="crows__row">
            <span>
              {t.label}
              {t.detail ? <span className={mono ? "crows__soft mono" : "crows__soft"}>{detail(t.detail)}</span> : null}
            </span>
            <span className="crows__value crows__soft">{t.count === 1 ? "Once" : `${t.count} orders`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Marketing({ c, now }: { c: CustomerDetail; now: string }) {
  const m = c.marketing;
  return (
    <section className="csec" aria-labelledby="marketing-title">
      <h2 id="marketing-title" className="csec__title">
        Marketing email
      </h2>
      <p className="csec__lede">
        {m?.optedIn
          ? "They agreed to be sent specials and campaigns. Every change of mind is kept below."
          : m
            ? "They withdrew. Don’t send them specials or campaigns unless they agree again."
            : c.account
              ? "They haven’t agreed to marketing email. Order emails still reach them."
              : "They haven’t agreed to marketing email (a guest can, from the footer’s sign-up). Order emails still reach them."}
      </p>
      {m ? (
        <ol className="crows" aria-label="Consent history, newest first">
          {m.history.map((h, i) => (
            <li key={`${h.at}-${i}`} className="crows__row">
              <span>
                <strong className={h.optedIn ? "cconsent cconsent--on" : "cconsent"}>{h.optedIn ? "Agreed" : "Withdrew"}</strong> on {SOURCES[h.source] ?? h.source}
              </span>
              <span className="crows__value crows__soft" title={at(h.at)}>
                {when(h.at, now)}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
