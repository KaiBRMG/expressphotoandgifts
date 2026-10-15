import type { Metadata } from "next";

import { currentCustomer, savedDetails } from "@/lib/account/auth";
import { addressLine } from "@/lib/checkout/details";
import { CheckoutHead } from "@/app/checkout/Head";
import { SignInForm, SignOutButton } from "./AccountForms";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

/**
 * The customer's account: what it keeps (the details that fill checkout) and
 * the way out; signed out, the way in. Accounts are made after a paid order,
 * from its receipt, so there is no sign-up here.
 */
export default async function AccountPage() {
  const customer = await currentCustomer();
  const saved = customer ? await savedDetails(customer.uid) : null;

  return (
    <>
      <CheckoutHead
        title={customer ? "Your account" : "Sign in"}
        lede={
          customer
            ? "The details below fill themselves in at checkout. They update each time you order."
            : "Signed in, checkout fills in your name, number and delivery address for you."
        }
      />

      <div className="shell account">
        {customer ? (
          <section className="costep" aria-labelledby="acct-saved">
            <h2 id="acct-saved" className="costep__title">
              Saved for checkout
            </h2>
            <dl className="account__list">
              <div>
                <dt>Email</dt>
                <dd>{customer.email}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{saved ? `${saved.contact.firstName} ${saved.contact.lastName}` : "—"}</dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>{saved?.contact.phone || "—"}</dd>
              </div>
              <div>
                <dt>Delivery address</dt>
                <dd>{saved?.address ? `${addressLine(saved.address)}, ${saved.address.province}` : "None yet: you’ve collected from the shop."}</dd>
              </div>
            </dl>
            <SignOutButton />
          </section>
        ) : (
          <section className="costep" aria-label="Sign in">
            <SignInForm />
            <p className="receipt__soft">
              No account yet? After your first order, the receipt offers to save your details.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
