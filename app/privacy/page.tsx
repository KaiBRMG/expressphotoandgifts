import type { Metadata } from "next";
import Link from "next/link";

import { EmailLink, Facts, LegalPage, Missing, Notice, PhoneLink, type LegalSection } from "@/app/site/Legal";
import { LEGAL, SHOP } from "@/app/site/data";
import { policyTitle } from "@/lib/legal";

export const metadata: Metadata = {
  title: policyTitle("/privacy"),
  description: `How ${SHOP.name} collects, uses, shares and protects your personal information, and your rights under POPIA.`,
  alternates: { canonical: "/privacy" },
};

/**
 * The privacy policy (POPIA). Written from what the code keeps and sends:
 * the order (`orders/{ref}`), saved details (`customers/{uid}`), marketing
 * consent (`marketing/{uid}`), campaign uses by email hash, photos in
 * Cloudinary swept after `SWEEP_AFTER_DAYS` when unpaid, the device's
 * storage (`epg:cart`, `epg:photos`, `epg:details`, `track:*`), the customer
 * cookie, Vercel's cookie-free analytics with query strings stripped, and
 * the shop's day counters, which hold counts only. Change what is collected
 * or who receives it, change this page, and move `POLICIES_VERSION` on.
 */
export default function PrivacyPage() {
  return <LegalPage path="/privacy" lede={LEDE} sections={SECTIONS} />;
}

const LEDE = (
  <>
    What we collect when you shop with us, why, who else sees it, how long we keep it, and the rights the Protection of Personal Information Act (POPIA) gives you.
    In short: we use your details and photos to make and deliver your order, and we never sell them.
  </>
);

const PROVIDERS: { who: string; why: string; what: string; where: string }[] = [
  {
    who: "PayFast",
    why: "Taking your payment",
    what: "Your name, email, mobile, order number and amount. Your card or bank details go to PayFast directly, never to us.",
    where: "South Africa",
  },
  {
    who: "The Courier Guy (on its Shiplogic platform)",
    why: "Pricing, delivering and tracking courier orders",
    what: "The delivery address and notes when you ask for a delivery price; once booked, the name, mobile and (for your own delivery) email of the person receiving it, and the order number.",
    where: "South Africa",
  },
  {
    who: "Google Firebase",
    why: "Storing orders, accounts and saved details; signing in",
    what: "Your order and account details. Your password is held by Firebase in a form we can’t read.",
    where: "Google’s servers, which may be outside South Africa",
  },
  {
    who: "Cloudinary",
    why: "Storing the photos you upload, so we can print them",
    what: "Your photos and any edited versions made at checkout.",
    where: "Outside South Africa",
  },
  {
    who: "Resend",
    why: "Sending order, delivery, refund and account emails",
    what: "Your email address, name and the details of your order.",
    where: "Outside South Africa",
  },
  {
    who: "Vercel",
    why: "Hosting the website, and cookie-free visit statistics",
    what: "What every website receives with a visit: your IP address, browser and device type, the page and where you came from.",
    where: "Outside South Africa",
  },
  {
    who: "WhatsApp (Meta)",
    why: "Only if you message us on WhatsApp",
    what: "Your number and the messages and photos you send us there.",
    where: "Outside South Africa",
  },
];

const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "Who is responsible for your information",
    body: (
      <>
        <p>
          {SHOP.name}
          {LEGAL.registeredName ? ` (${LEGAL.registeredName})` : ""}, {SHOP.street}, {SHOP.town}, {SHOP.province}, {SHOP.postcode}, is the responsible party for the
          personal information described here.
        </p>
        <p>
          Our Information Officer is {LEGAL.informationOfficer ?? <Missing what="Information Officer’s name" />}. You can reach them at{" "}
          <EmailLink /> or on <PhoneLink /> about anything in this policy.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <h3>What you give us</h3>
        <ul>
          <li>
            <strong>Your contact details:</strong> first name, surname, email address and mobile number, for every order.
          </li>
          <li>
            <strong>Delivery details,</strong> when you choose courier delivery: the street address, suburb, town, province, postal code and any delivery notes.
          </li>
          <li>
            <strong>A gift recipient&rsquo;s name and mobile number,</strong> when you send an order straight to someone else. Please only give us these if the person
            would expect it; we use them only to deliver to them.
          </li>
          <li>
            <strong>Your photos, and any words or notes</strong> you add to be printed or to tell us about an item. Photos can show people, including children, and
            places. We look at them only to print them and check the print.
          </li>
          <li>
            <strong>Account details,</strong> if you make an account: your email, a password (held by Firebase, never readable by us) and the contact and delivery
            details you saved.
          </li>
          <li>
            <strong>What you tell us</strong> when you email, phone, WhatsApp or visit the shop.
          </li>
        </ul>
        <h3>What we keep about your order</h3>
        <ul>
          <li>
            What you ordered and paid, any deals that applied, delivery and tracking events, refunds, and the emails we sent you. We get PayFast&rsquo;s confirmation of
            the payment (its reference, amount and status), never your card details.
          </li>
          <li>
            For deals limited to once per customer, a one-way scrambled code made from your email (a hash), so we can tell the deal was used without keeping a list of
            emails.
          </li>
          <li>Which version of our terms you agreed to when you paid, and when.</li>
        </ul>
        <h3>What your visit tells us</h3>
        <ul>
          <li>
            <strong>Visit statistics</strong> from Vercel Web Analytics, which uses no cookies: pages viewed, where visitors came from, device type and country, as
            totals. We strip order numbers and links from page addresses before they&rsquo;re counted, and pages inside your account aren&rsquo;t counted at all.
          </li>
          <li>
            <strong>Our own counters</strong> of how many visits looked at a product, added to the cart and reached each step of checkout, and the words of searches that
            found nothing. These are daily totals with nothing that identifies you.
          </li>
          <li>
            <strong>Your IP address,</strong> which our server sees with every request and uses briefly to stop abuse (limits on uploads and payments). We don&rsquo;t
            store it with your order.
          </li>
        </ul>
        <p>
          We don&rsquo;t ask for your ID number, and we don&rsquo;t knowingly collect special personal information (such as health or religious beliefs). If a photo you
          send happens to show something like that, we use it only to print it.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "Why we use it",
    body: (
      <>
        <p>POPIA allows us to use personal information for a lawful reason. Ours are:</p>
        <ul>
          <li>
            <strong>To carry out your order:</strong> to price it, take payment, print it, tell you when it&rsquo;s ready, deliver it, give you its tracking, and handle
            any return, refund or complaint.
          </li>
          <li>
            <strong>Because the law requires it:</strong> keeping sales and payment records for tax, and reporting crime where we must.
          </li>
          <li>
            <strong>Our legitimate interests:</strong> keeping the site and payments secure, preventing fraud and abuse, and understanding which products and pages work,
            from totals rather than from individuals.
          </li>
          <li>
            <strong>Your consent:</strong> for an account, and for marketing email. You can withdraw consent at any time; that doesn&rsquo;t affect what was done before.
          </li>
        </ul>
        <p>
          We don&rsquo;t make decisions about you by automated means alone, we don&rsquo;t build profiles of you for advertising, and{" "}
          <strong>we never sell or rent your personal information.</strong>
        </p>
      </>
    ),
  },
  {
    id: "marketing",
    title: "Marketing email",
    body: (
      <>
        <p>
          We send marketing email only to people who have agreed to it, for example by signing up at the foot of our pages, and we record when and where you agreed. Order,
          delivery and account emails aren&rsquo;t marketing; we send those because you placed an order or made an account.
        </p>
        <p>
          You can stop marketing email at any time, free of charge, by replying &ldquo;unsubscribe&rdquo;, emailing{" "}
          <EmailLink subject="Unsubscribe" /> or telling us at the shop. We&rsquo;ll keep a note that you
          opted out, so we don&rsquo;t email you again by mistake.
        </p>
      </>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <p>
          We share only what each service needs to do its job for us. Each acts on our instructions and must keep your information secure and confidential, as POPIA
          requires of an operator.
        </p>
        <table className="legal__table">
          <thead>
            <tr>
              <th scope="col">Who</th>
              <th scope="col">Why</th>
              <th scope="col">What they receive</th>
              <th scope="col">Where</th>
            </tr>
          </thead>
          <tbody>
            {PROVIDERS.map((p) => (
              <tr key={p.who}>
                <th scope="row">{p.who}</th>
                <td data-label="Why">{p.why}</td>
                <td data-label="What">{p.what}</td>
                <td data-label="Where">{p.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Apart from these, we share personal information only when the law requires us to (for example with SARS or the police, under a lawful request), to protect our
          rights or someone&rsquo;s safety, or with a buyer of the business, who would have to keep to this policy.
        </p>
        <h3>Information sent outside South Africa</h3>
        <p>
          Some of these services store information on servers outside South Africa. We use only established providers bound by agreements and laws that give your
          information protection substantially similar to POPIA&rsquo;s, as section 72 of POPIA requires. By using the site you consent to that transfer for the reasons
          set out here.
        </p>
      </>
    ),
  },
  {
    id: "keeping",
    title: "How long we keep it",
    body: (
      <>
        <ul>
          <li>
            <strong>Photos from a checkout that was never paid</strong> are deleted automatically 14 days after the last upload. Your browser forgets that checkout
            after 10 days.
          </li>
          <li>
            <strong>Photos of a paid order</strong> are kept with the order so we can remake it if something goes wrong in delivery or under its guarantee. Once your
            order is complete, ask us and we&rsquo;ll delete them.
          </li>
          <li>
            <strong>Order and payment records</strong> are kept for at least five years after the order, because tax law requires us to keep them.
          </li>
          <li>
            <strong>Your account and saved details</strong> are kept until you ask us to close the account.
          </li>
          <li>
            <strong>A record that you agreed to, or opted out of, marketing</strong> is kept for as long as we might email you, and to show we respected your choice.
          </li>
          <li>
            <strong>Daily visit totals</strong> contain nothing personal and may be kept indefinitely.
          </li>
        </ul>
        <p>When we no longer need information, we delete it or remove anything that identifies you.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <>
        <p>We take reasonable technical and organisational steps to keep your information safe, including:</p>
        <ul>
          <li>an encrypted (HTTPS) connection for every page;</li>
          <li>payments handled by PayFast, so card details never reach us;</li>
          <li>passwords held by Firebase in a form nobody at the shop can read;</li>
          <li>a database closed to browsers, reachable only through our own server;</li>
          <li>staff access through named accounts only, with changes to orders logged against the person who made them;</li>
          <li>photo uploads that each need a one-time signature from our server, and order links that can&rsquo;t be guessed.</li>
        </ul>
        <Notice title="Keep your order link private">
          <p>
            The &ldquo;Track my order&rdquo; link in your emails shows the order, its delivery address and progress to whoever holds it, so treat it like a password and
            don&rsquo;t post it publicly. On a shared device, finish or empty your checkout and sign out when you&rsquo;re done: until then the device remembers the
            details you typed (see below).
          </p>
        </Notice>
        <p>
          No system is completely secure. If we believe your personal information has been accessed by someone without authority, we&rsquo;ll tell you and the
          Information Regulator as soon as reasonably possible, as POPIA requires.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and what your device remembers",
    body: (
      <>
        <p>
          We use no advertising or tracking cookies, and no third-party cookies. What our site stores on your device is there to make the shop work for you:
        </p>
        <ul>
          <li>
            <strong>A sign-in cookie</strong>, only once you sign in to an account, which keeps you signed in for up to two weeks or until you sign out.
          </li>
          <li>
            <strong>Your cart</strong>, so it survives a reload or a closed tab.
          </li>
          <li>
            <strong>Your checkout in progress:</strong> the order number, which photo goes where and your edits, cleared after 10 days.
          </li>
          <li>
            <strong>The details you typed at checkout</strong> (name, email, mobile and address), so you don&rsquo;t retype them if you leave and come back. They&rsquo;re
            cleared once your order is paid or you sign out.
          </li>
          <li>
            <strong>A note, for this visit only,</strong> of which steps our counters have already counted, so each is counted once.
          </li>
        </ul>
        <p>You can clear all of this in your browser&rsquo;s settings at any time. The shop still works without it; you&rsquo;ll just need to fill things in again.</p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>Under POPIA you have the right to:</p>
        <ul>
          <li>ask whether we hold personal information about you, and for a copy of it;</li>
          <li>ask us to correct information that&rsquo;s wrong, out of date or incomplete;</li>
          <li>ask us to delete information we no longer have a lawful reason to keep;</li>
          <li>object to our use of your information, including for marketing at any time;</li>
          <li>withdraw a consent you gave;</li>
          <li>complain to the Information Regulator.</li>
        </ul>
        <p>
          To use any of these, email <EmailLink /> or come to the shop. We may ask you to prove who you are
          before we act, so we don&rsquo;t hand your information to someone else, and we&rsquo;ll respond within a reasonable time, normally 30 days. Asking for your
          information costs nothing. Some records, like orders we must keep for tax, can&rsquo;t be deleted before their time, and we&rsquo;ll tell you if that applies.
          Requests for records under the Promotion of Access to Information Act (PAIA) can be made the same way.
        </p>
      </>
    ),
  },
  {
    id: "complaints",
    title: "Complaints to the Information Regulator",
    body: (
      <>
        <p>Please talk to us first, so we can put it right. If you&rsquo;re not satisfied, you may complain to the Information Regulator:</p>
        <Facts
          rows={[
            ["Complaints", <a key="c" className="inline-link" href="mailto:POPIAComplaints@inforegulator.org.za">POPIAComplaints@inforegulator.org.za</a>],
            ["General enquiries", <a key="e" className="inline-link" href="mailto:enquiries@inforegulator.org.za">enquiries@inforegulator.org.za</a>],
            ["Phone", "010 023 5200 · toll-free 0800 017 160"],
            ["Address", "Woodmead North Office Park, 54 Maxwell Drive, Woodmead, Johannesburg, 2191"],
            ["Website", "inforegulator.org.za"],
          ]}
        />
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Our shop is for adults: you must be 18 or older, or have a parent&rsquo;s or guardian&rsquo;s consent, to order or make an account. Photos of children are welcome
        on our products when they come from a parent or guardian, or with their consent, as our{" "}
        <Link className="inline-link" href="/terms#photos">Terms</Link> ask, and we use them only to make the order.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We&rsquo;ll update this policy when what we collect or who we share it with changes, and change the date at the top. If a change materially affects how we use
        information you&rsquo;ve already given us, we&rsquo;ll tell you by email before it applies.
      </p>
    ),
  },
];
