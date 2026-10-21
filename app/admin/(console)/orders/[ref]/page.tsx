import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getOrderForAdmin } from "@/lib/admin/orders";
import { shippingBoxes } from "@/lib/settings";
import { rands } from "@/lib/catalog/listing";
import { addressLine, deliveryLabel, deliveryPrice } from "@/lib/checkout/details";
import { EMAIL_NAMES, type OrderEmail } from "@/lib/checkout/emails";
import { lineWhat, SWEEP_AFTER_DAYS } from "@/lib/checkout/order";
import { fittedUrl, rawUrl, THUMB } from "@/lib/checkout/photoUrls";
import { Alert, ArrowLeft, External } from "@/app/site/icons";
import { at } from "../../../when";
import { PaymentPanel } from "./PaymentPanel";
import { Courier } from "./Courier";
import { NextStep } from "./NextStep";
import { ResendEmail, ResolveIssues, StageControl } from "./OrderActions";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[ref]">): Promise<Metadata> {
  return { title: `Order ${(await params).ref}` };
}

/**
 * One order, everything the shop needs to make it and hand it over: the
 * photos to print, who it's for and how it reaches them, and the payment as
 * PayFast reported it. The shop's own side (stage, refunds, issues) is
 * changed here; what was bought and paid is not.
 */
export default async function OrderPage({ params }: PageProps<"/admin/orders/[ref]">) {
  const { ref } = await params;
  const [found, boxes] = await Promise.all([getOrderForAdmin(ref), shippingBoxes()]);
  if (!found) notFound();
  const { order: o, notices } = found;
  const paid = o.status === "paid";
  const f = o.fulfilment;

  return (
    <div className="page order">
      <Link href="/admin/orders" className="back">
        <ArrowLeft size={18} />
        Orders
      </Link>

      <header className="page__head">
        <div>
          <h1 className="page__title">
            {o.contact.firstName} {o.contact.lastName}
          </h1>
          <p className="page__lede">
            <span className="mono">{o.ref}</span> · {paid && o.paidAt ? `Paid ${at(o.paidAt)}` : "Not paid"} · {rands(o.total)} ·{" "}
            {f.method === "collect" ? "Collect from the shop" : "Courier"}
          </p>
        </div>
        {paid ? <StageControl ref_={o.ref} stage={o.stage ?? "new"} method={f.method} /> : null}
      </header>

      <NextStep order={o} />

      {o.issues?.length ? (
        <section className={`osec${o.flagged ? " issues" : ""}`} aria-labelledby="issues-title">
          <h2 id="issues-title" className="osec__title">
            {o.flagged ? (
              <>
                <Alert size={20} /> Needs a look
              </>
            ) : (
              "Issues, looked at"
            )}
          </h2>
          <ul className="issues__list">
            {o.issues.map((i) => (
              <li key={i.at + i.text}>
                <span className="osec__soft">{at(i.at)}</span> {i.text}
              </li>
            ))}
          </ul>
          {o.flagged ? <ResolveIssues ref_={o.ref} /> : null}
        </section>
      ) : null}

      {!paid ? (
        <p className="osec osec__soft">
          This order isn&rsquo;t paid, so there&rsquo;s nothing to make. Its photos are deleted {SWEEP_AFTER_DAYS} days after it was last changed, unless something on it still needs a look.
        </p>
      ) : null}

      <div className="order__grid">
        <section className="osec" aria-labelledby="items-title">
          <h2 id="items-title" className="osec__title">
            What to make
          </h2>
          <ul className="oitems">
            {o.lines.map((l) => (
              <li key={l.sku} className="oitem">
                <div className="oitem__head">
                  <span className="oitem__name">{lineWhat(l)}</span>
                  <span className="plist__num">{rands(l.price * l.quantity)}</span>
                </div>
                <span className="plist__code">{l.sku}</span>
                {l.frame?.empty ? <p className="oitem__note">Frame only, no print.</p> : null}
                {l.frame?.quote ? <p className="oitem__note">The customer wants the print quoted.</p> : null}
                {l.note ? <p className="oitem__note">Their note: &ldquo;{l.note}&rdquo;</p> : null}
                {l.sets.map((s, i) => (
                  <div key={i} className="oset">
                    {l.sets.length > 1 ? <p className="oset__title">Unit {i + 1}</p> : l.quantity > 1 ? <p className="oset__title">The same on all {l.quantity}</p> : null}
                    <ul className="ophotos">
                      {s.files.map((p) => (
                        <li key={p.slot} className="ophoto">
                          <a href={rawUrl(p.publicId, p.version)} target="_blank" rel="noopener" className="ophoto__link">
                            {/* eslint-disable-next-line @next/next/no-img-element -- the shared Cloudinary thumbnail, already sized */}
                            <img src={fittedUrl(p.publicId, p.version, THUMB)} alt={`${p.label || `Photo ${p.slot + 1}`}`} loading="lazy" />
                          </a>
                          <span className="ophoto__label">
                            {p.label || `Photo ${p.slot + 1}`}
                            {p.edited ? " · edited" : ""}
                          </span>
                          <a href={rawUrl(p.publicId, p.version)} target="_blank" rel="noopener" className="admin-link ophoto__open">
                            Full size
                            <External size={14} />
                          </a>
                        </li>
                      ))}
                    </ul>
                    {s.words ? <p className="oitem__words">Words: &ldquo;{s.words}&rdquo;</p> : null}
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <dl className="osums">
            <div>
              <dt>Subtotal</dt>
              <dd>{rands(o.subtotal)}</dd>
            </div>
            <div>
              <dt>{deliveryLabel(f)}</dt>
              <dd>{deliveryPrice(o.delivery)}</dd>
            </div>
            <div className="osums__total">
              <dt>{paid ? "Paid" : "Total"}</dt>
              <dd>{rands(o.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="order__side">
          <section className="osec" aria-labelledby="who-title">
            <h2 id="who-title" className="osec__title">
              Customer
            </h2>
            <p className="osec__lines">
              {o.contact.firstName} {o.contact.lastName}
              <br />
              <a className="admin-link" href={`tel:${o.contact.phone}`}>
                {o.contact.phone}
              </a>
              <br />
              <a className="admin-link" href={`mailto:${o.contact.email}?subject=${encodeURIComponent(`Your order ${o.ref}`)}`}>
                {o.contact.email}
              </a>
              {o.uid ? (
                <>
                  <br />
                  <span className="osec__soft">Has an account</span>
                </>
              ) : null}
            </p>
          </section>

          <section className="osec" aria-labelledby="how-title">
            <h2 id="how-title" className="osec__title">
              {f.method === "collect" ? "Collecting" : "Delivering"}
            </h2>
            {f.method === "collect" ? (
              <p className="osec__lines">From the counter.</p>
            ) : (
              <p className="osec__lines">
                The Courier Guy, {f.service.name}
                {f.service.cover ? <span className="osec__soft">, insured to {rands(f.service.cover)}</span> : null}
                <br />
                {f.recipient ? (
                  <>
                    To {f.recipient.name},{" "}
                    <a className="admin-link" href={`tel:${f.recipient.phone}`}>
                      {f.recipient.phone}
                    </a>
                    <br />
                  </>
                ) : null}
                {addressLine(f.address)}
                <br />
                {f.address.province}
                {f.address.notes ? (
                  <>
                    <br />
                    <span className="osec__soft">{f.address.notes}</span>
                  </>
                ) : null}
              </p>
            )}
          </section>

          {paid && f.method === "courier" ? <Courier order={o} boxes={boxes} /> : null}

          {/* PayFast is asked as the panel renders; the rest of the order doesn't wait for it. */}
          <Suspense fallback={<section className="osec"><h2 className="osec__title">Payment</h2><p className="osec__soft">Asking PayFast…</p></section>}>
            <PaymentPanel order={o} notices={notices} />
          </Suspense>

          {paid ? (
            <section className="osec" aria-labelledby="mail-title">
              <h2 id="mail-title" className="osec__title">
                Emails
              </h2>
              <ul className="olog">
                {(Object.keys(EMAIL_NAMES) as OrderEmail[])
                  .filter((who) => (who !== "shipped" || o.shipment?.tracking) && (who !== "ready" || o.fulfilment.method === "collect") && (who !== "refund" || o.refunds?.length))
                  .map((who) => {
                  const sent = o.emails?.[who];
                  return (
                    <li key={who}>
                      <strong>{EMAIL_NAMES[who]}</strong> ·{" "}
                      {sent ? (sent.ok ? `Sent ${at(sent.at)}` : `Didn’t go: ${sent.error ?? "unknown"}`) : "Not sent yet"}
                      <ResendEmail ref_={o.ref} who={who} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {o.log?.length ? (
            <section className="osec" aria-labelledby="log-title">
              <h2 id="log-title" className="osec__title">
                History
              </h2>
              <ul className="olog">
                {[...o.log].reverse().map((e) => (
                  <li key={e.at + e.text}>
                    {e.text}
                    <span className="osec__soft">
                      {at(e.at)}, {e.by}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
