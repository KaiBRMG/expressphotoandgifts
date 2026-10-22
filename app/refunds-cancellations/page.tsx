import type { Metadata } from "next";
import Link from "next/link";

import { EmailLink, Facts, LegalPage, Notice, PhoneLink, type LegalSection } from "@/app/site/Legal";
import { SHOP } from "@/app/site/data";
import { policyTitle } from "@/lib/legal";

export const metadata: Metadata = {
  title: policyTitle("/refunds-cancellations"),
  description: `How to cancel an order with ${SHOP.name}, what can be returned, what happens when something arrives faulty, and how refunds are paid.`,
  alternates: { canonical: "/refunds-cancellations" },
};

/**
 * Returns, cancellations and refunds. The law it follows: ECTA s44's seven
 * day cooling-off for goods bought online, which s42(2) does not extend to
 * goods made to the customer's specification or clearly personalised; the
 * CPA's six-month guarantee on quality (s55, s56), the customer's choice of
 * repair, replacement or refund; and CPA s17's reasonable charge for
 * cancelling an order already in hand. Refunds are made in PayFast's
 * dashboard and recorded on the order, and booking a return through The
 * Courier Guy is the admin's `returnShipment`. Change a promise here, move
 * `POLICIES_VERSION` on.
 */
export default function ReturnsPage() {
  return <LegalPage path="/refunds-cancellations" lede={LEDE} sections={SECTIONS} />;
}

const LEDE = (
  <>
    Most of what we sell is made for you, with your photos and words, so it can&rsquo;t be sold to anyone else. That shapes what can be returned. Anything that
    arrives faulty, damaged or not as you ordered, we always put right.
  </>
);

const contact = (
  <>
    email <EmailLink /> or WhatsApp <PhoneLink />
  </>
);

const SECTIONS: LegalSection[] = [
  {
    id: "glance",
    title: "At a glance",
    body: (
      <Facts
        rows={[
          ["Made with your photo or words", "Cancel free until we start making it. Can’t be returned because you changed your mind."],
          ["Everything else bought online", "Cancel free until it’s sent. Changed your mind? Return it within 7 days of receiving it."],
          ["Faulty, damaged or not what you ordered", "Tell us within 6 months. You choose a repair, a replacement or a refund, and we cover the return."],
          ["Refunds", "Back to the card or account you paid with, within 30 days and usually much sooner."],
        ]}
      />
    ),
  },
  {
    id: "cancel",
    title: "Cancelling an order",
    body: (
      <>
        <p>To cancel, {contact} with your order number as soon as you can. Cancelling by phone is fine too, but we&rsquo;ll confirm it in writing.</p>
        <h3>Products made with your photos or words</h3>
        <p>
          <strong>Until we start making it, you can cancel for a full refund.</strong> Once we&rsquo;ve started printing or making it, you can still cancel, but because
          the item can&rsquo;t be sold to anyone else, we may keep a reasonable charge for the work and materials already used, up to the price of the items already made.
          Anything not yet started, and any delivery not yet booked, is refunded in full.
        </p>
        <h3>Products not made for you</h3>
        <p>
          Frames, albums, easels, jewellery and other ready-made stock can be cancelled for a full refund at any time before we hand the order to the courier or you
          collect it. After that, see <a className="inline-link" href="#mind">changing your mind</a>.
        </p>
        <h3>If we cancel</h3>
        <p>
          We may cancel an order if something has sold out, a price was shown in obvious error, or we can&rsquo;t print what was sent (see our{" "}
          <Link className="inline-link" href="/terms#photos">Terms</Link>). If we do, we&rsquo;ll tell you why and refund everything you paid for what we can&rsquo;t
          supply. If we haven&rsquo;t made your order ready or sent it within 30 days of payment, you may cancel it for a full refund.
        </p>
      </>
    ),
  },
  {
    id: "mind",
    title: "Changing your mind after it arrives",
    body: (
      <>
        <p>
          For products bought on this website that weren&rsquo;t made for you, the Electronic Communications and Transactions Act gives you a cooling-off period:{" "}
          <strong>you may cancel within 7 days of receiving the goods, without giving a reason.</strong>
        </p>
        <ul>
          <li>Tell us within the 7 days, then return the item within a reasonable time, unused and complete, in its packaging if you still have it.</li>
          <li>
            The only cost to you is the direct cost of returning it. You can bring it to the shop for free, or we can book The Courier Guy to collect it and take the
            courier&rsquo;s charge off your refund.
          </li>
          <li>We refund everything else you paid, including the original delivery, within 30 days of your cancellation.</li>
        </ul>
        <Notice title="What can&rsquo;t be returned for a change of mind">
          <ul>
            <li>
              Anything made to your specification or personalised: printed with your photos or words, cut, framed or finished to your choices. The law excludes these
              from the cooling-off period.
            </li>
            <li>Pierced earrings once they&rsquo;ve been taken off their backing card or out of sealed packaging, for hygiene reasons.</li>
            <li>Anything that has been used, damaged after delivery or isn&rsquo;t complete.</li>
          </ul>
          <p>None of this affects your rights when something is faulty or not what you ordered.</p>
        </Notice>
        <h3>Bought at the counter</h3>
        <p>
          The cooling-off period applies to online orders. For things bought in the shop, you&rsquo;re welcome to ask about swapping an unused item that wasn&rsquo;t
          made for you; we&rsquo;ll help where we can, but it&rsquo;s our choice rather than a right.
        </p>
      </>
    ),
  },
  {
    id: "faulty",
    title: "Faulty, damaged or not what you ordered",
    body: (
      <>
        <p>
          Everything we sell, personalised or not, comes with the Consumer Protection Act&rsquo;s guarantee that it&rsquo;s of good quality, works as it should and
          matches what was ordered. <strong>If it isn&rsquo;t, tell us within 6 months of delivery</strong>, and you choose whether we repair it, replace it (for a
          personalised product, remake it) or refund you. We cover the cost and risk of getting a faulty item back to us.
        </p>
        <p>This includes:</p>
        <ul>
          <li>a fault in the materials or the making, such as a print that peels, a cracked mug or a frame that falls apart;</li>
          <li>our mistake: the wrong photo, the wrong product or size, a crop or edit other than the one you approved, or words different from the ones you typed;</li>
          <li>damage on the way to you.</li>
        </ul>
        <h3>How to tell us</h3>
        <p>
          {contact} with your order number, what&rsquo;s wrong and a photo or two of the item (and of the parcel, if it was damaged in delivery). For delivery damage,
          please tell us as soon as you can, ideally within 48 hours, and keep the packaging, so we can claim from the courier; this doesn&rsquo;t shorten your 6 months.
          We may need to see the item before we decide what went wrong, and we&rsquo;ll arrange for it to reach us at our cost.
        </p>
        <Notice title="What isn&rsquo;t a fault">
          <p>These aren&rsquo;t defects, and aren&rsquo;t grounds for a refund or a remake:</p>
          <ul>
            <li>a print that matches what you approved at checkout: the photo, crop, edit and words as you placed them;</li>
            <li>softness in a photo the photo step warned you about, or that comes from the photo you supplied;</li>
            <li>the small differences in colour, brightness and placement between a screen and a printed product, and between handmade items;</li>
            <li>normal wear and tear, or damage from an accident, misuse or not following the product&rsquo;s care instructions;</li>
            <li>an item that has been altered or repaired by someone other than us.</li>
          </ul>
        </Notice>
        <p>
          If a repaired item fails again within 3 months of the repair, we&rsquo;ll replace it or refund you. After the 6 months, you still have the rights the common law
          gives you for hidden defects.
        </p>
      </>
    ),
  },
  {
    id: "send",
    title: "Sending something back",
    body: (
      <>
        <p>
          Please talk to us before you send anything, so we can tell you where it goes and give you a reference. You can bring it to the shop at {SHOP.street},{" "}
          {SHOP.town} during trading hours, or we can book The Courier Guy to collect it from you.
        </p>
        <p>
          For a change-of-mind return you send yourself, use a tracked service and keep the proof of posting: until it reaches us, it&rsquo;s your responsibility. For a
          faulty item, it&rsquo;s ours.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    title: "How refunds are paid",
    body: (
      <>
        <ul>
          <li>
            <strong>Online orders</strong> are refunded through PayFast to the card or account you paid with. We can&rsquo;t refund to a different card or account, or in
            cash.
          </li>
          <li>
            <strong>Counter purchases</strong> are refunded the way you paid.
          </li>
          <li>
            We refund within 30 days of a cancellation, or of receiving a returned item, and usually much sooner. We email you when the refund is made; how soon it shows
            on your statement then depends on your bank.
          </li>
          <li>
            When part of an order is refunded and a deal applied to the order, the refund for that part is what you actually paid for it after the deal.
          </li>
          <li>
            Delivery is refunded when the whole order is cancelled before it&rsquo;s sent, when you return it in the cooling-off period, and whenever the fault was ours.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights under the law",
    body: (
      <p>
        This policy gives you at least the rights the Consumer Protection Act and the Electronic Communications and Transactions Act give you, and nothing in it limits
        them. If we can&rsquo;t agree on a return or refund, you may refer it to the Consumer Goods and Services Ombud (cgso.org.za). The rest of our agreement with you is
        in our <Link className="inline-link" href="/terms">Terms &amp; Conditions</Link>.
      </p>
    ),
  },
];
