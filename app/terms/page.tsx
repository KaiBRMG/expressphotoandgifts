import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, Notice, WhoWeAre, type LegalSection } from "@/app/site/Legal";
import { SHOP } from "@/app/site/data";
import { policyTitle } from "@/lib/legal";

export const metadata: Metadata = {
  title: policyTitle("/terms"),
  description: `The terms on which ${SHOP.name} sells photo prints, personalised gifts and other products online and in store.`,
  alternates: { canonical: "/terms" },
};

/**
 * The terms of sale. Every operational fact here is what the code does:
 * prices checked again at Pay (`placeOrder`), the R5 floor (`MIN_PAYMENT`),
 * an order paid only on PayFast's verified notice, the courier's free cover
 * and the full-value option (`lib/checkout/courier.ts`), the sharpness note
 * that warns and never blocks (`lib/catalog/checkout.ts`), photos placed
 * whole unless the customer edits them. Change the code, change this page,
 * and move `POLICIES_VERSION` on.
 */
export default function TermsPage() {
  return <LegalPage path="/terms" lede={LEDE} sections={SECTIONS} />;
}

const LEDE = (
  <>
    The agreement between you and {SHOP.name} when you order from us, online or at the counter. It&rsquo;s written to be read, so please read it, especially the
    parts marked with a gold dot: they limit what we&rsquo;re responsible for.
  </>
);

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "Who we are and what this covers",
    body: (
      <>
        <p>
          These terms apply to every order placed with {SHOP.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) through this website, and to orders we take by WhatsApp, phone,
          email or at the shop. By placing an order or creating an account you agree to them, together with our{" "}
          <Link className="inline-link" href="/refunds-cancellations">Returns &amp; Cancellation Policy</Link> and our{" "}
          <Link className="inline-link" href="/privacy">Privacy Policy</Link>, which form part of these terms.
        </p>
        <WhoWeAre />
        <p>
          Nothing in these terms takes away any right you have under the Consumer Protection Act 68 of 2008 (the CPA), the Electronic Communications and Transactions
          Act 25 of 2002 (ECTA) or the Protection of Personal Information Act 4 of 2013 (POPIA). Where a term would do so, it applies only as far as the law allows.
        </p>
      </>
    ),
  },
  {
    id: "ordering",
    title: "Ordering and when we accept",
    body: (
      <>
        <p>
          You must be 18 or older to order, or have the consent of a parent or guardian. You agree that the details you give us are true and that you&rsquo;re allowed
          to give them, including the name and number of anyone you send a gift to.
        </p>
        <p>
          Before you pay, checkout shows everything you&rsquo;re ordering, your photos as they&rsquo;ll be printed, your details and the full total. You can go back and
          correct anything until you press Pay.
        </p>
        <p>
          Pressing Pay is your offer to buy. <strong>We accept your order, and a contract is made, only once PayFast confirms your payment to us</strong> and we email you
          an order confirmation. Until then we may decline an order, for example if something has sold out, a price was shown in error, or we can&rsquo;t print what was
          sent. If we decline or cancel an order after you&rsquo;ve paid, we refund everything you paid.
        </p>
        <p>Orders paid online start at R5. Orders we take by WhatsApp, phone or at the counter are confirmed when we tell you they are and you&rsquo;ve paid.</p>
      </>
    ),
  },
  {
    id: "prices",
    title: "Prices, deals and payment",
    body: (
      <>
        <p>
          Prices are in South African rand and are the full price of the item. Delivery, when you choose it, is priced at checkout for your address and shown before you
          pay. There are no other charges. The total on the Pay button is what you pay.
        </p>
        <p>
          We check every price again on our server when you press Pay. If anything changed since you filled your cart (a price, a deal that ended or filled up, stock,
          or the courier&rsquo;s rate), checkout shows you the new total first, and nothing is charged until you pay that total.
        </p>
        <p>
          If a price on the site is plainly wrong because of an obvious, unintended error, we aren&rsquo;t bound to sell at that price. We&rsquo;ll tell you and offer you
          the item at the right price or a full refund.
        </p>
        <h3>Deals and specials</h3>
        <p>
          Deals apply as shown on the site while they run, between their stated dates (South African time), and while any stated limit on orders, units or uses lasts.
          A deal marked once per customer is counted against your email address. A deal&rsquo;s value isn&rsquo;t paid out in cash, and it&rsquo;s worked out for the
          order as paid. If you return part of an order, the refund for that part is what you actually paid for it after the deal.
        </p>
        <h3>Payment</h3>
        <p>
          Payment is made through PayFast, a South African payment provider, using the methods PayFast offers you. Your card or bank details go to PayFast, never to us.
          An order counts as paid only when PayFast confirms the payment to us directly and it matches the order to the cent.
        </p>
      </>
    ),
  },
  {
    id: "photos",
    title: "Your photos and your words",
    body: (
      <>
        <p>
          Many of our products are made with photos and words you supply. You keep the copyright in them. You give us permission to store, copy, crop, resize and print
          them, and to share them with the services that help us do so, only to make, deliver and support your order. We don&rsquo;t use them for anything else, such as
          advertising, without asking you first.
        </p>
        <Notice title="Your promise about what you send us">
          <p>When you upload a photo or give us words to print, you promise that:</p>
          <ul>
            <li>you took the photo, own it, or have the owner&rsquo;s permission to have it printed;</li>
            <li>
              everyone recognisable in it has agreed to it being printed, and for any child in it, you are their parent or guardian or have that person&rsquo;s consent;
            </li>
            <li>
              it isn&rsquo;t unlawful, defamatory, indecent, hateful or a breach of anyone&rsquo;s copyright, trade mark or privacy, and doesn&rsquo;t show a minor in any
              harmful or sexualised way.
            </li>
          </ul>
          <p>
            You agree to compensate us for any loss, claim or cost (including reasonable legal costs) that we suffer because a photo or words you supplied broke this
            promise. We may refuse or stop any order we reasonably believe breaks it, and refund you. We will report material that appears to be illegal, including any
            sexualised image of a child, to the South African Police Service as the law requires.
          </p>
        </Notice>
        <p>
          Keep your own copies of every photo you send. Uploading to us is not a backup, and we may delete your photos once we no longer need them for your order (see
          our <Link className="inline-link" href="/privacy#keeping">Privacy Policy</Link>).
        </p>
      </>
    ),
  },
  {
    id: "printing",
    title: "How your order is printed",
    body: (
      <>
        <p>
          <strong>What you approve at checkout is what we print.</strong> Unless you crop or edit it, each photo is placed whole, as you uploaded it. When you crop,
          zoom, turn, flip to black and white or otherwise edit a photo, we print your edited version, and any words exactly as you typed them, spelling included.
          Please check everything on the review before you pay: we don&rsquo;t send separate proofs.
        </p>
        <p>
          The photo step tells you when a photo may look soft at the size it will be printed, because it has too few pixels for that size. That note is advice: you may
          still order, and if you do, we print the photo as supplied. We can only print as sharp as the photo you send.
        </p>
        <Notice title="Colour, size and handmade differences">
          <p>
            Screens show colour differently from printed and sublimated products, and every material takes ink in its own way. Small differences in colour, brightness,
            contrast and placement between what you see on screen and the finished product are normal and aren&rsquo;t a defect. Sizes and weights given on the site are
            close measurements, not exact ones, and many products are finished by hand, so small variations from one item to the next are part of the product.
          </p>
        </Notice>
        <p>
          A frame is sold without a print unless your order includes one. Where the site offers the matching print beside a frame, you can add it.
        </p>
      </>
    ),
  },
  {
    id: "timing",
    title: "How long it takes",
    body: (
      <>
        <p>
          We start making your order once it&rsquo;s paid. How long it takes depends on the product and how busy we are, so if you need it by a date, ask us before you
          order (the product page has a button for it). <strong>A date is only promised if we confirm it to you in writing</strong>, by email or WhatsApp.
        </p>
        <p>
          If we haven&rsquo;t made your order ready to collect or handed it to the courier within 30 days of payment, you may cancel it and we&rsquo;ll refund
          everything you paid. If we find we can&rsquo;t make it at all, we&rsquo;ll tell you and refund you within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "collection",
    title: "Collecting from the shop",
    body: (
      <>
        <p>
          Collection is free. We email you when your order is ready. Please bring your order number, and collect during trading hours at {SHOP.street}, {SHOP.town}. You
          can send someone else to collect for you with your order number; if they show us the number, we may hand the order over to them.
        </p>
        <p>
          Please collect within 90 days of the day we tell you your order is ready. If it hasn&rsquo;t been collected by then, we&rsquo;ll contact you once more and give
          you at least 14 days&rsquo; notice. If it&rsquo;s still not collected after that, we may dispose of it without a refund, since it was made for you.
        </p>
      </>
    ),
  },
  {
    id: "delivery",
    title: "Courier delivery",
    body: (
      <>
        <p>
          We deliver within South Africa by The Courier Guy, to your door or straight to the person a gift is for. The services, prices and times shown at checkout come
          from The Courier Guy for your address and parcel. Delivery times are the courier&rsquo;s estimates, counted from when it collects the parcel from us once your
          order is made, and aren&rsquo;t guaranteed by us.
        </p>
        <p>
          Please make sure the delivery address and the recipient&rsquo;s name and mobile number are right: the courier contacts them directly. If a parcel can&rsquo;t be
          delivered because the details were wrong or nobody was available after the courier&rsquo;s attempts, any cost of returning it to us or sending it again is
          yours.
        </p>
        <h3>Cover while it travels</h3>
        <p>
          Every courier delivery is declared to the courier at the value of the goods, up to R1,000, at no extra cost. For orders worth more, checkout offers to cover
          the full value (up to R30,000) for the extra amount shown.
        </p>
        <p>
          Your order is our responsibility until it&rsquo;s delivered to the address you gave, or collected. If it arrives damaged or doesn&rsquo;t arrive, tell us as
          soon as you can, ideally within 48 hours of delivery, with photos of the parcel and the item and keeping the packaging, so we can claim from the courier. This
          is to help us help you: it doesn&rsquo;t shorten your rights under the CPA, and we will put it right as our{" "}
          <Link className="inline-link" href="/refunds-cancellations#faulty">Returns policy</Link> sets out.
        </p>
      </>
    ),
  },
  {
    id: "returns",
    title: "Cancellations, returns and refunds",
    body: (
      <p>
        How to cancel an order, what can be returned and how refunds are paid are set out in our{" "}
        <Link className="inline-link" href="/refunds-cancellations">Returns &amp; Cancellation Policy</Link>. In short: products made with your photos or words can&rsquo;t be
        returned because you changed your mind, but anything faulty, damaged or not what you ordered is always put right.
      </p>
    ),
  },
  {
    id: "account",
    title: "Your account and receipt link",
    body: (
      <>
        <p>
          An account is optional. If you make one, keep your password to yourself; you&rsquo;re responsible for what is done with your account until you tell us
          it&rsquo;s been misused. We may switch an account off if it&rsquo;s used to break these terms or the law. You can ask us to close your account at any time.
        </p>
        <p>
          Every order email has a &ldquo;Track my order&rdquo; link. Anyone holding that link can see the order, its delivery address and its progress, so don&rsquo;t
          share it publicly.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Our responsibility to you",
    body: (
      <>
        <p>
          We make every order with care and stand behind it as our Returns policy and the CPA require. Beyond that, and only as far as the law allows:
        </p>
        <Notice title="Limits on our liability">
          <ul>
            <li>
              We&rsquo;re not liable for any indirect or consequential loss, such as a missed occasion or event, lost profit, or the sentimental value of a photo or
              item, whether it arises from a contract, from negligence or otherwise.
            </li>
            <li>We&rsquo;re not liable for the loss of a photo or file you sent us. Keep your own copies.</li>
            <li>
              We&rsquo;re not liable for anything caused by what you supplied: the quality, content or rights of your photos and words, or details you gave us that were
              wrong.
            </li>
            <li>
              We&rsquo;re not liable for delay or failure caused by things outside our reasonable control, such as load-shedding, strikes, unrest, floods, the
              courier&rsquo;s or a payment provider&rsquo;s systems, or a supplier failing us. If that happens we&rsquo;ll tell you, and you may cancel for a refund of
              anything not yet supplied.
            </li>
            <li>Our total liability for any order is limited to the amount you paid for that order.</li>
          </ul>
          <p>
            None of this limits our liability for death or injury, for our gross negligence or wilful wrongdoing, or under section 61 of the CPA, or any other right
            that the law doesn&rsquo;t allow us to exclude.
          </p>
        </Notice>
        <h3>Business customers</h3>
        <p>
          If you buy for a business that the CPA doesn&rsquo;t protect (such as a company with an annual turnover or asset value of R2 million or more), the limits above
          apply in full, and any warranty not set out in these terms is excluded as far as the law allows.
        </p>
      </>
    ),
  },
  {
    id: "website",
    title: "Using this website",
    body: (
      <>
        <p>
          We keep the website running as well as we can, but we can&rsquo;t promise it will always be available, free of errors or free of harmful code, and we may
          change or withdraw any part of it. Don&rsquo;t misuse it: no automated scraping, overloading, uploading of harmful files or attempts to get at anything that
          isn&rsquo;t meant for you.
        </p>
        <p>
          The website&rsquo;s text, design, logo and our own product photographs belong to us or our licensors. You may not copy them for commercial use without our
          written permission.
        </p>
        <p>
          Emails, WhatsApp messages and the records our website keeps of your order count as writing between us, and our records of an order and its payment are proof of
          what was ordered and paid, unless shown to be wrong.
        </p>
      </>
    ),
  },
  {
    id: "disputes",
    title: "Complaints and the law that applies",
    body: (
      <>
        <p>
          If something isn&rsquo;t right, talk to us first: most things are sorted out at the counter or with one message. If we can&rsquo;t resolve a complaint between
          us, you may refer it to the Consumer Goods and Services Ombud (cgso.org.za) or the National Consumer Commission (thencc.org.za), or, for a privacy complaint, to
          the Information Regulator (see our <Link className="inline-link" href="/privacy#complaints">Privacy Policy</Link>).
        </p>
        <p>
          These terms are governed by the law of the Republic of South Africa. You and we agree that a Magistrate&rsquo;s Court with jurisdiction may hear any dispute,
          even where the amount would otherwise exceed its limit.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <>
        <p>
          We may update these terms. The version in force when you press Pay applies to that order, and we keep a record of which version it was. The date at the top
          of this page shows when the terms last changed.
        </p>
        <p>
          If any part of these terms is found to be unenforceable, the rest still applies. If we don&rsquo;t enforce a right straight away, we haven&rsquo;t given it up.
        </p>
      </>
    ),
  },
];
