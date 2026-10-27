import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";

import { currentCustomer } from "@/lib/account/auth";
import { cartSavings } from "@/lib/catalog/campaigns";
import { photoCount, rands, signedRands } from "@/lib/catalog/listing";
import { addressLine, deliveryLabel, deliveryPrice } from "@/lib/checkout/details";
import { fileCount, lineWhat, orderPhotos, reportedAt, type OrderLine } from "@/lib/checkout/order";
import { fittedUrl, THUMB } from "@/lib/checkout/photoUrls";
import { orderForReceipt, reportPaid } from "@/lib/checkout/orders";
import { refreshIfStale } from "@/lib/checkout/shipments";
import { trackOrder } from "@/lib/checkout/tracking";
import { HOURS, SHOP } from "@/app/site/data";
import { shopContact } from "@/lib/settings";
import { ArrowRight } from "@/app/site/icons";
import { CheckoutHead } from "../Head";
import { Finish, LiveTracking, SaveAccount, Waiting } from "./Receipt";
import { OrderTracking } from "./Tracking";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false },
};

/**
 * Where PayFast returns the customer, and where the Onsite window sends them
 * once they have paid; then where they track it, from every email's "Track
 * my order". The order is shown only to the holder of its link (ref and
 * token). Paid when PayFast's notice has been checked; until then it says so
 * and listens for it. Once paid it shows the shop's stages and The Courier
 * Guy's tracking as one line, and redraws while the customer watches.
 */
export default async function DonePage({ searchParams }: PageProps<"/checkout/done">) {
  const { ref, t } = await searchParams;
  const order = typeof ref === "string" && typeof t === "string" ? await orderForReceipt(ref, t) : null;

  if (!order) {
    return (
      <>
        <CheckoutHead step="done" title="We can’t find that order" />
        <div className="shell ck__empty">
          <p>This receipt link isn&rsquo;t complete. If you&rsquo;ve paid, PayFast has emailed you a receipt with your order number.</p>
          <Link className="btn btn--gold on-gold" href="/shop">
            Back to the shop
            <ArrowRight size={17} />
          </Link>
        </div>
      </>
    );
  }

  const paid = order.status === "paid";
  // The offer to save details is for a paid order not yet on an account, from someone not signed in.
  const offerAccount = paid && !order.uid && !(await currentCustomer());
  const photos = orderPhotos(order);
  const tracking = trackOrder(order);
  const contact = await shopContact();
  refreshIfStale(order);
  // Reached unpaid only from PayFast's return (it sends the customer back once the payment is taken) or the Onsite window: hold Pay until the notice.
  if (reportedAt(order) === null && !paid) after(() => reportPaid(order.ref, order.token).catch((e) => console.error("Payment return not noted", order.ref, e)));

  return (
    <>
      <CheckoutHead
        step="done"
        title={paid ? `Thank you, ${order.contact.firstName}` : "Confirming your payment"}
        orderRef={order.ref}
        lede={paid ? (tracking?.finished ? undefined : "Here’s where your order is. This page keeps itself up to date while it’s open.") : "PayFast is confirming your payment with the shop. This usually takes a few seconds."}
        aside={
          <p className="ckhead__ref">
            Order <strong>{order.ref}</strong>
          </p>
        }
      />

      <div className="shell receipt">
        {paid ? <Finish ref_={order.ref} /> : <Waiting ref_={order.ref} token={order.token} />}
        {tracking ? <OrderTracking t={tracking} /> : null}
        {tracking && !tracking.finished ? <LiveTracking ref_={order.ref} token={order.token} stamp={order.updatedAt} /> : null}

        <section className="receipt__slip" aria-labelledby="receipt-what">
          <h2 id="receipt-what" className="costep__title">
            Your order
          </h2>
          <ul className="receipt__lines">
            {order.lines.map((l) => (
              <li key={l.sku}>
                <span>
                  {lineWhat(l)}
                  {l.sets.length > 0 ? (
                    <small>
                      {photoCount(fileCount(l))}
                      {l.sets.some((s) => s.words) ? ", with your words" : ""}
                    </small>
                  ) : null}
                  {l.frame?.empty ? <small>Frame only, no print</small> : null}
                  {l.frame?.quote ? <small>We&rsquo;ll quote you for the print</small> : null}
                  {l.note ? <small>Your note: &ldquo;{l.note}&rdquo;</small> : null}
                  {l.base ? <small>On special, was {rands(l.base * l.quantity)}</small> : null}
                  {order.photosDeletedAt ? null : <Proofs line={l} />}
                </span>
                <span>{rands(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="coslip__sums receipt__sums">
            <div>
              <dt>Subtotal</dt>
              <dd>{rands(order.subtotal)}</dd>
            </div>
            {cartSavings(order).map((s) => (
              <div key={`${s.campaign}/${s.rule}`}>
                <dt>{s.label}</dt>
                <dd>{signedRands(-s.amount)}</dd>
              </div>
            ))}
            <div>
              <dt>{deliveryLabel(order.fulfilment)}</dt>
              <dd>{deliveryPrice(order.delivery)}</dd>
            </div>
          </dl>
          <p className="slip__total receipt__total">
            <span>{paid ? "Paid" : "Total"}</span>
            <strong>{rands(order.total)}</strong>
          </p>
        </section>

        <section className="receipt__where" aria-labelledby="receipt-where">
          <h2 id="receipt-where" className="costep__title">
            {order.fulfilment.method === "collect" ? "Where to collect" : "Where it’s going"}
          </h2>
          {order.fulfilment.method === "collect" ? (
            <>
              <p className="receipt__address">
                {SHOP.name}
                <br />
                {SHOP.street}, {SHOP.town}, {SHOP.postcode}
              </p>
              <ul className="receipt__hours">
                {HOURS.map((h) => (
                  <li key={h.days}>
                    <span>{h.days}</span>
                    <span>{h.time}</span>
                  </li>
                ))}
              </ul>
              <a className="inline-link" href={SHOP.mapsUrl} target="_blank" rel="noreferrer">
                Directions
              </a>
            </>
          ) : (
            <p className="receipt__address">
              {order.fulfilment.recipient ? order.fulfilment.recipient.name : `${order.contact.firstName} ${order.contact.lastName}`}
              <br />
              {addressLine(order.fulfilment.address)}
              <br />
              {order.fulfilment.address.province}
              {order.fulfilment.address.notes ? (
                <>
                  <br />
                  <span className="receipt__soft">{order.fulfilment.address.notes}</span>
                </>
              ) : null}
            </p>
          )}
          <p className="receipt__soft">
            {photos > 0 ? `Your ${photoCount(photos)} ${photos === 1 ? "is" : "are"} with the shop. ` : ""}
            Questions? Call {contact.phoneDisplay} or email {contact.email}, and give your order number.
          </p>
        </section>

        {offerAccount ? <SaveAccount ref_={order.ref} token={order.token} email={order.contact.email} /> : null}
      </div>
    </>
  );
}

/** Proofs shown on a line before the rest are counted. */
const PROOFS = 8;

/**
 * The line's own photos, as the shop will print them: each file once, the
 * customer's edit where they made one and the whole photo where they didn't.
 * The receipt is the page every email leads back to, so it ends on their pictures.
 */
function Proofs({ line }: { line: OrderLine }) {
  const seen = new Set<string>();
  const files = line.sets.flatMap((s) => s.files).filter((f) => !seen.has(f.publicId) && seen.add(f.publicId));
  if (files.length === 0) return null;
  const more = files.length - PROOFS;
  return (
    <span className="receipt__proofs" aria-hidden="true">
      {files.slice(0, PROOFS).map((f) => (
        // eslint-disable-next-line @next/next/no-img-element -- a customer photo at the step's one thumbnail size, from Cloudinary as is
        <img key={f.publicId} src={fittedUrl(f.publicId, f.version, THUMB)} alt="" loading="lazy" decoding="async" />
      ))}
      {more > 0 ? <span className="receipt__more">+{more}</span> : null}
    </span>
  );
}
