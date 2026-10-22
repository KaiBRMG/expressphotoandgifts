import type { Metadata } from "next";
import Link from "next/link";

import { accountRecord, currentCustomer, marketingOn } from "@/lib/account/auth";
import { accountOrders, claimGuestOrders } from "@/lib/account/orders";
import { CheckoutHead } from "@/app/checkout/Head";
import { SHOP } from "@/app/site/data";
import { ArrowRight } from "@/app/site/icons";
import { SignInForm } from "./AccountForms";
import { AccountView, Banner } from "./AccountView";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

/** What the email link's landing says, from `/account/verify`. */
function checked(claimed: string | undefined, check: string | undefined) {
  if (check === "expired") return { error: true, text: "That link has expired. Ask for a new one under Your orders." };
  if (check) return { error: true, text: "That link has been used already, or isn’t complete. Ask for a new one under Your orders." };
  if (claimed === undefined) return null;
  const n = Number(claimed) || 0;
  return { error: false, text: n > 0 ? `Your email is confirmed, and ${n === 1 ? "1 earlier order has" : `${n} earlier orders have`} joined your account.` : "Your email is confirmed. There were no other orders placed with it." };
}

/**
 * The customer's account: an order still on its way first, tracked live as
 * the receipt does; then every order, each shown by the customer's own
 * photos, with its receipt and Order again; beside them on a wide screen,
 * what checkout fills in, the one marketing choice, the password and the way
 * out. Signed out, the way in. Accounts are made at checkout, from a
 * receipt, or by the sign-up at the foot of every page, so there is none here.
 */
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const q = await searchParams;
  const customer = await currentCustomer();
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  if (!customer) {
    const deleted = one(q.deleted) === "1";
    const said = checked(one(q.claimed), one(q.check));
    return (
      <>
        <CheckoutHead
          title={deleted ? "Your account is deleted" : "Sign in"}
          lede={deleted ? "Your sign-in, saved details and photos are gone. Your orders stay with the shop as its sales records." : "Signed in, you can follow your orders, order them again, and checkout fills in your details for you."}
        />
        <div className="shell account account--out">
          {deleted ? (
            <section className="costep" aria-label="Goodbye">
              <p className="ck__none">Thank you for ordering from {SHOP.name}.</p>
              <p className="receipt__soft">You&rsquo;re welcome back any time, online or at the counter.</p>
              <Link className="btn btn--gold on-gold account__shop" href="/shop">
                Back to the shop
                <ArrowRight size={17} />
              </Link>
            </section>
          ) : (
            <section className="costep" aria-label="Sign in">
              {said ? <Banner {...said} /> : null}
              {said && !said.error ? <p className="receipt__soft">Sign in to see them.</p> : null}
              <SignInForm />
              <p className="receipt__soft">No account yet? Sign up at the foot of this page, or tick &ldquo;Save my details&rdquo; at checkout.</p>
            </section>
          )}
        </div>
      </>
    );
  }

  // Once the email is proved, an order placed with it signed out joins the account the next time it's opened.
  const [{ saved, proved }, marketing] = await Promise.all([accountRecord(customer), marketingOn(customer.uid)]);
  if (proved) await claimGuestOrders(customer).catch((e) => console.error("Guest orders not claimed", customer.uid, e));
  const orders = await accountOrders(customer.uid);
  return <AccountView email={customer.email} saved={saved} orders={orders} marketing={marketing} proved={proved} said={checked(one(q.claimed), one(q.check))} />;
}
