import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutHead } from "@/app/checkout/Head";
import { ArrowRight } from "@/app/site/icons";
import { unsubscribeQuery, validUnsubscribe } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Email from the shop",
  robots: { index: false },
  // The address is in the link; keep it out of any referrer the page sends.
  referrer: "no-referrer",
};

/** What each landing says. `e` and `t` (a signed unsubscribe link) ask the question instead. */
const SAID: Record<string, { title: string; text: string; error?: boolean }> = {
  on: { title: "You’re on the list", text: "Thank you. We’ll email you when there’s a special or a campaign worth knowing about, and every email has a link to stop them." },
  expired: { title: "That link has expired", text: "Links to confirm an email work for 3 days. Ask for a new one from the sign-up at the foot of any page.", error: true },
  invalid: { title: "That link has been used already, or isn’t complete", text: "If you haven’t had your confirmation, ask for a new one from the sign-up at the foot of any page.", error: true },
  off: { title: "You’re off the list", text: "We won’t email you specials or campaigns any more. Emails about an order you place always come. You can come back any time from the sign-up at the foot of any page." },
  failed: { title: "That didn’t work", text: "Try the link in the email again in a minute, or switch it off under your account if you have one.", error: true },
};

/**
 * Where the links in the footer sign-up's emails land. Confirming a sign-up
 * redirects here with the result; an unsubscribe link opens here and asks,
 * with a button that posts to `/subscription/off`, because a link that stopped
 * the emails on a plain visit would be undone by any mail scanner that opens
 * every link in a message.
 */
export default async function SubscriptionPage({ searchParams }: PageProps<"/subscription">) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const email = one(q.e).trim().toLowerCase();
  const token = one(q.t);
  const asking = validUnsubscribe(email, token);
  const said = SAID[one(q.s)] ?? null;

  return (
    <>
      <CheckoutHead title={asking ? "Stop these emails?" : (said?.title ?? "Email from the shop")} />
      <div className="shell account account--out">
        <section className="costep" aria-label="Email from the shop">
          {asking ? (
            <>
              <p className="receipt__soft">
                Stop specials and campaigns going to <strong>{email}</strong>? Emails about an order you place will still come.
              </p>
              <form method="post" action={`/subscription/off?${unsubscribeQuery(email)}`}>
                <button type="submit" className="btn btn--blue">
                  Stop these emails
                </button>
              </form>
            </>
          ) : said ? (
            <>
              <p className={said.error ? "ck__none" : "receipt__soft"} role="status">
                {said.text}
              </p>
              <Link className="btn btn--gold on-gold account__shop" href="/shop">
                Back to the shop
                <ArrowRight size={17} />
              </Link>
            </>
          ) : (
            <>
              <p className="receipt__soft">This page opens from the links in our emails. To get specials, use the sign-up at the foot of any page.</p>
              <Link className="btn btn--gold on-gold account__shop" href="/shop">
                Back to the shop
                <ArrowRight size={17} />
              </Link>
            </>
          )}
        </section>
      </div>
    </>
  );
}
