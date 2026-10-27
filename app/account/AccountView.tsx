import Link from "next/link";

import type { SavedDetails } from "@/lib/account/auth";
import type { AccountOrder } from "@/lib/account/orders";
import { SHOP_TZ } from "@/lib/shopTime";
import { CheckoutHead } from "@/app/checkout/Head";
import { Note } from "@/app/checkout/Field";
import { LiveTracking } from "@/app/checkout/done/Receipt";
import { OrderTracking } from "@/app/checkout/done/Tracking";
import { SignOutButton } from "./AccountForms";
import { OrderList } from "./Orders";
import { DeletePanel, FindOrders, MarketingSwitch, PasswordPanel, SavedPanel } from "./Panels";

/** "20 Oct 2026", in the shop's time zone. */
const dateText = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: SHOP_TZ, day: "numeric", month: "short", year: "numeric" });

type Props = { email: string; saved: SavedDetails | null; orders: AccountOrder[]; marketing: boolean; proved: boolean; said: { error: boolean; text: string } | null };

/** The signed-in account, from what the page read: drawn here, read in `page.tsx`. */
export function AccountView({ email, saved, orders, marketing, proved, said }: Props) {
  const live = orders.filter((o) => o.live);
  const first = saved?.contact.firstName.trim();

  return (
    <>
      <CheckoutHead
        title={first ? `Hello, ${first}` : "Your account"}
        lede={
          live.length > 0
            ? live.length === 1
              ? "Your order is with us. Follow it below; this page keeps itself up to date while it’s open."
              : `You have ${live.length} orders on the go. Follow them below; this page keeps itself up to date while it’s open.`
            : "Your orders and receipts, and the details that fill in checkout for you."
        }
        aside={
          <div className="ckhead__who">
            <span>Signed in as</span>
            <strong>{email}</strong>
            <SignOutButton />
          </div>
        }
      />

      <div className="shell account">
        {said ? <Banner {...said} /> : null}

        <div className="account__main">
          {live.map((o) =>
            o.tracking ? (
              <div key={o.ref}>
                <OrderTracking
                  t={o.tracking}
                  id={`track-${o.ref}`}
                  title={
                    <>
                      Order <span className="account__ref">{o.ref}</span>
                    </>
                  }
                  foot={
                    <>
                      <span className="receipt__soft">Placed {dateText(o.at)}</span>
                      <Link className="inline-link" href={o.receipt}>
                        Receipt and full details
                      </Link>
                    </>
                  }
                />
                <LiveTracking ref_={o.ref} token={o.token} stamp={o.updatedAt} />
              </div>
            ) : null,
          )}

          <section className="aorders__wrap" aria-labelledby="acct-orders">
            <h2 id="acct-orders" className="costep__title">
              Your orders
              {orders.length > 0 ? <span className="aorders__count">{orders.length}</span> : null}
            </h2>
            <OrderList
              orders={orders.map((o) => ({ ref: o.ref, receipt: o.receipt, when: dateText(o.at), total: o.total, standing: o.standing, items: o.items, prints: o.prints, kept: o.kept, deleted: o.deleted, product: o.product }))}
            />
            {proved ? null : <FindOrders email={email} />}
          </section>
        </div>

        <div className="account__side">
          <section className="costep" aria-labelledby="acct-saved">
            <h2 id="acct-saved" className="costep__title">
              Saved for checkout
            </h2>
            <SavedPanel email={email} saved={saved} />
          </section>

          <section className="costep" aria-labelledby="acct-email">
            <h2 id="acct-email" className="costep__title">
              Emails from the shop
            </h2>
            <MarketingSwitch on={marketing} />
          </section>

          <section className="costep account__rows" aria-labelledby="acct-sign">
            <h2 id="acct-sign" className="costep__title">
              Sign-in and account
            </h2>
            <PasswordPanel email={email} />
            <DeletePanel email={email} waiting={live.map((o) => o.ref)} />
          </section>
        </div>
      </div>
    </>
  );
}

export const Banner = ({ error, text }: { error: boolean; text: string }) => (
  <Note error={error} className="anote account__banner">
    {text}
  </Note>
);
