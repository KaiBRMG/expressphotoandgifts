import type { Metadata } from "next";
import Link from "next/link";

import { currentCustomer } from "@/lib/account/auth";
import { photoCount, rands } from "@/lib/catalog/listing";
import { addressLine, deliveryLabel, deliveryPrice } from "@/lib/checkout/details";
import { fileCount, lineWhat, orderPhotos } from "@/lib/checkout/order";
import { orderForReceipt } from "@/lib/checkout/orders";
import { refreshIfStale } from "@/lib/checkout/shipments";
import { trackOrder } from "@/lib/checkout/tracking";
import { HOURS, SHOP } from "@/app/site/data";
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
  refreshIfStale(order);

  return (
    <>
      <CheckoutHead
        step="done"
        title={paid ? `Thank you, ${order.contact.firstName}` : "Confirming your payment"}
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
            Questions? Call {SHOP.phoneDisplay} or email {SHOP.email}, and give your order number.
          </p>
        </section>

        {offerAccount ? <SaveAccount ref_={order.ref} token={order.token} email={order.contact.email} /> : null}
      </div>
    </>
  );
}
