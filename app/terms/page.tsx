import type { Metadata } from "next";
import Link from "next/link";

import { Clause, EmailLink, Facts, LegalPage, Notice, PhoneLink, Phones, WhoWeAre, type LegalSection } from "@/app/site/Legal";
import { HOURS, LEGAL, SHOP } from "@/app/site/data";
import { policyTitle } from "@/lib/legal";
import { share } from "@/lib/share";

const DESCRIPTION = `The terms on which ${SHOP.name} runs this website and sells photo prints, personalised gifts and other products, including delivery, cancellations, returns and refunds.`;

export const metadata: Metadata = {
  title: policyTitle("/terms"),
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  ...share({ title: policyTitle("/terms"), description: DESCRIPTION }),
};

/**
 * The shop's one set of terms, as the shop's own legal document of 20 November
 * 2026 words them (`ExpressPhoto_Terms_Redline.docx`), in three parts: the
 * website terms, the terms of sale and the delivery terms. Clause numbers are
 * the document's own, gaps included (11.2 and 11.4 are not used), because the
 * code cites them: 2.8, 9.1, 9.6, 10.1 to 10.5, 11.1 and 11.3 in
 * `lib/checkout/refunds.ts` and `lib/admin/refunds.ts`.
 *
 * Where the document and the code differ, this page says what the code does:
 * collection is by the code the ready email carries (`collectCode`), not the
 * order number. Every other operational fact here is what the code does:
 * prices checked again at Pay (`placeOrder`), the R5 floor (`MIN_PAYMENT`), an
 * order paid only on PayFast's verified notice, the courier's cover
 * (`lib/checkout/courier.ts`), and refunds through PayFast to what was paid
 * with. Change the code, change this page, and move `POLICIES_VERSION` on.
 * `#photos`, `#returns`, `#refunds`, `#price-payment`, `#delivery-options` and
 * `#complaints` are linked from elsewhere.
 */
export default function TermsPage() {
  return <LegalPage path="/terms" lede={LEDE} intro={INTRO} sections={SECTIONS} />;
}

const LEDE = <>These terms cover using our website, ordering online or at our shop, cancelling or returning an order, and collecting or receiving delivery.</>;

const contact = (
  <>
    <EmailLink /> or WhatsApp <PhoneLink />
  </>
);

const INTRO = (
  <Notice title="Important notice">
    <p>
      Provisions limiting liability are brought to your attention below, in the boxes marked with a gold dot. Nothing excludes a right that applicable South African law
      does not permit us to exclude.
    </p>
  </Notice>
);

const COMPANY = LEGAL.registeredName ? `${LEGAL.registeredName} (trading as ${SHOP.name})` : SHOP.name;

const SECTIONS: LegalSection[] = [
  // ---- Part 1: the website terms ------------------------------------------
  {
    id: "general",
    part: "Website terms",
    title: "General",
    body: (
      <>
        <p>
          These terms are between {COMPANY} (the “Company”, “we” or “us”) and each website user or customer (“you”). The Company operates a photo-printing and gift shop
          online and from {SHOP.town}, South Africa.
        </p>
        <WhoWeAre />
        <p>
          Website visitors must comply with the lawful website-use rules while using the site. For purchases, the applicable terms are presented before an order is
          submitted. You can review your order, correct mistakes and withdraw before paying. We retain a record of the terms applying to each accepted order.
        </p>
        <p>
          If you are under 18, please obtain a parent’s or guardian’s assistance or consent before placing an order. These terms do not remove rights under the Consumer
          Protection Act 68 of 2008 (CPA), Electronic Communications and Transactions Act 25 of 2002 (ECTA) or Protection of Personal Information Act 4 of 2013 (POPIA).
        </p>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Ownership",
    body: (
      <p>
        Our website design, text, logos and photographs are owned by us or used with permission. You may browse, save or print reasonable extracts for personal use, but
        may not reproduce our material commercially without permission. Customer photographs and text remain the customer’s; the limited processing licence is addressed
        in <a className="inline-link" href="#photos">Terms of sale clause 4</a>.
      </p>
    ),
  },
  {
    id: "improper-use",
    title: "No improper use or unlawful conduct",
    body: (
      <p>
        Do not use the website unlawfully, harass others, impersonate anyone, infringe rights or interfere with site security. We may pursue legally recoverable losses
        caused by unlawful conduct. Legal costs will be recoverable only to the extent awarded or permitted by law.
      </p>
    ),
  },
  {
    id: "use-of-services",
    title: "Use of services",
    body: (
      <p>
        Do not upload malware or unlawful material; scrape or overload the website; attempt unauthorised access; use someone else’s account; send spam; or upload material
        that you do not have the necessary rights to use. We may take proportionate steps to prevent misuse.
      </p>
    ),
  },
  {
    id: "site-liability",
    title: "Limitation of liability",
    body: (
      <Notice title="Important: limits on our liability for the website">
        <p>
          To the extent the law permits, our website is provided subject to occasional interruption, maintenance or technical problems. We do not accept responsibility
          for indirect losses that were not reasonably foreseeable in connection with ordinary website use. Nothing limits liability for fraud, wilful misconduct, gross
          negligence where prohibited, product harm under CPA section 61, mandatory consumer remedies or any other non-excludable liability. Our obligations for purchased
          goods are addressed separately in the Terms of sale.
        </p>
      </Notice>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <Notice title="Important: your responsibility for claims">
        <p>
          You are responsible for reasonable, evidenced third-party claims and directly related legal costs to the extent caused by your unlawful website use or
          infringement of another person’s rights. This does not require you to compensate us for losses caused by our own wrongful conduct, and applies only as permitted
          by law.
        </p>
      </Notice>
    ),
  },
  {
    id: "registration",
    title: "Online registration",
    body: (
      <p>
        An account is optional. You can check out as a guest. Account and order information is handled under our{" "}
        <Link className="inline-link" href="/privacy">
          Privacy Policy
        </Link>
        . Keep account passwords and private order-tracking links secure.
      </p>
    ),
  },
  {
    id: "restricted-access",
    title: "Limited or restricted access",
    body: (
      <p>
        We may restrict access where reasonably necessary for security, maintenance, suspected misuse or legal compliance. Tell us promptly if you suspect unauthorised
        account access. You may request account closure, subject to lawful retention obligations.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party sites and services",
    body: (
      <p>
        Payments are processed through PayFast and deliveries may be handled by The Courier Guy. Their own services may be subject to their terms. These arrangements do
        not remove our legal responsibilities to you as the supplier for orders and delivery.
      </p>
    ),
  },
  {
    id: "no-warranty",
    title: "Website availability; no extra product guarantees",
    body: (
      <p>
        We do not promise uninterrupted or error-free website availability. We provide no voluntary product warranty, satisfaction guarantee or extended guarantee unless
        expressly and separately stated in writing. Mandatory statutory quality rights and any legally binding express product description remain unaffected.
      </p>
    ),
  },
  {
    id: "accuracy",
    title: "Accuracy of information",
    body: (
      <p>
        We try to keep website descriptions, availability and prices accurate, but may correct errors. A correction will not retrospectively change an accepted order or
        override applicable rights relating to displayed prices, descriptions or misleading representations.
      </p>
    ),
  },
  {
    id: "modification",
    title: "Modification",
    body: (
      <p>
        We may amend the website terms for future visits and orders. Updated terms will display an effective date. A completed order remains governed by the terms
        accepted when it was placed, unless the law requires otherwise or you agree to a change.
      </p>
    ),
  },
  {
    id: "content-disputes",
    title: "Disputes regarding website content",
    body: <p>We retain versions of our terms and electronic order records. Those records may be used as evidence but may be challenged where inaccurate.</p>,
  },
  {
    id: "agreement",
    title: "General terms",
    body: (
      <p>
        These Website terms, Terms of sale and Delivery terms apply together; our{" "}
        <Link className="inline-link" href="/privacy">
          Privacy Policy
        </Link>{" "}
        explains personal-data processing and is not a waiver of statutory rights. Invalid provisions are severable to the extent permissible. A failure to enforce a
        right once is not necessarily a waiver. Email and WhatsApp communications may serve as written notices where the law permits.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: <p>South African law applies. Nothing restricts access to a court, ombud or statutory consumer authority with jurisdiction.</p>,
  },

  // ---- Part 2: the terms of sale ------------------------------------------
  {
    id: "definitions",
    part: "Terms of sale",
    title: "Definitions",
    body: (
      <>
        <p>
          “Business Day” excludes Saturdays, Sundays and South African public holidays. “Customer” means a purchaser or proposed purchaser. “Goods” means items we
          supply. “Order” means a request to buy Goods. “Order Confirmation” means our written acceptance of a paid order. “Personalised Goods” means goods genuinely made
          to your specifications or clearly personalised (including prints made from your photographs or words). “Delivery” means delivery to the agreed address or
          collection at the shop. “Price” means the total disclosed before payment, including any applicable VAT and delivery charge. “Defective” and statutory rights
          have the meanings applicable under the CPA.
        </p>
        <p>“Company” means {COMPANY}.</p>
      </>
    ),
  },
  {
    id: "price-payment",
    title: "Price and payment",
    body: (
      <>
        <Clause n="2.1">
          Prices appear in South African rand and the full amount payable, including delivery and VAT if applicable, is shown before payment. Any agreed extra charge
          arising later from your requested changes or avoidable failed delivery will be explained before it is incurred where practicable.
        </Clause>
        <Clause n="2.2">
          Online payments are processed by PayFast using its available methods. We begin production only after confirmation of payment. We do not generally receive your
          complete card details. The minimum online order is R5, if shown at checkout.
        </Clause>
        <Clause n="2.3">
          You must use a payment instrument that you are authorised to use and provide accurate payment details. We may pursue direct, lawful losses caused by fraudulent
          or unauthorised use; you retain chargeback and statutory remedies.
        </Clause>
        <Clause n="2.4–2.6">
          Prices and promotional availability can change before checkout, but any changed total must be displayed before you authorise payment. No order is manufactured
          or despatched before full payment.
        </Clause>
        <Clause n="2.7">
          If an obvious, inadvertent displayed pricing error occurs, we will correct it and take any steps required under the CPA to inform affected consumers. Where
          lawful, we may decline an unaccepted order and offer the correct price; if we cannot fulfil an accepted order lawfully, we will discuss the available remedies,
          including a refund where appropriate. We will not charge a higher price without your agreement.
        </Clause>
        <Clause n="2.8">
          Promotions, dates, quantity limits and single-use coupon rules apply as disclosed at checkout. A refund of part of an order reflects the amount actually paid
          for that part, without limiting a mandatory statutory refund.
        </Clause>
      </>
    ),
  },
  {
    id: "orders",
    title: "Orders",
    body: (
      <>
        <Clause n="3.1">
          Orders may be placed on the website, by WhatsApp, telephone, email or in person. An account is not required. Before online payment you can review the items,
          uploaded photos, crop, wording, address and total, and correct errors or withdraw.
        </Clause>
        <Clause n="3.2">Accurate order and recipient information is required. Under-18 customers need appropriate parental or guardian consent.</Clause>
        <Clause n="3.3–3.7">
          Clicking Pay offers to purchase the goods; we accept an online order when payment is confirmed and we send an Order Confirmation. If we lawfully reject an
          order after taking payment, we refund the amount paid. Counter and messaging orders are confirmed when accepted and paid.
        </Clause>
        <Clause n="3.8">
          You may be charged reasonable, demonstrable additional costs caused by requested post-production changes, inaccurate delivery particulars or unreasonable
          failure to accept delivery, provided they are lawful and not punitive.
        </Clause>
      </>
    ),
  },
  {
    id: "photos",
    title: "Your photos and words",
    body: (
      <>
        <p>
          You retain rights in content you provide. You authorise us and service providers acting on our behalf to store, reproduce, crop, resize and print it only to
          make, deliver and support your order. We will not use it in advertising without separate permission.
        </p>
        <Notice title="Your promise about what you send us">
          <p>
            You own the content or have the rights, permissions or other lawful authority reasonably necessary for the requested reproduction, including any rights
            relevant to images of identifiable people or children.
          </p>
          <p>
            You must not provide unlawful, sexually exploitative, defamatory or infringing content. We may decline material reasonably believed to be unlawful and make
            legally required reports. You are responsible for proven third-party claims directly caused by your infringement, subject to applicable law and excluding our
            own wrongdoing.
          </p>
        </Notice>
        <p>
          We retain order images only for periods justified by fulfilment, customer support, lawful recordkeeping and legitimate repeat-order functionality, as specified
          in the{" "}
          <Link className="inline-link" href="/privacy#keeping">
            Privacy Policy
          </Link>
          . Account images may be deleted on request subject to lawful exceptions. Please retain your original files; our service is not a backup facility.
        </p>
      </>
    ),
  },
  {
    id: "printing",
    title: "How your order is printed",
    body: (
      <p>
        We print according to the image, crop, edits and wording you approve during checkout, without separate proof unless agreed. Resolution problems inherent in your
        supplied image, minor colour differences between screens and print and reasonable handmade variations are not automatically defects; however, this does not
        excuse a product that fails a statutory quality standard or materially differs from its agreed description. Frames do not include prints unless stated.
      </p>
    ),
  },
  {
    id: "delivery",
    title: "Delivery",
    body: (
      <>
        <Clause n="6.1–6.3">
          Choose available courier delivery or free collection from our {SHOP.town} shop. Delivery charges and available services are shown before payment. If no
          courier service is available for your address, arrange collection or another delivery address.
        </Clause>
        <Clause n="6.4">
          Delivery occurs when the goods are physically delivered to the agreed address or handed to you or your authorised collection representative. We remain
          responsible for delivery obligations imposed by law.
        </Clause>
        <Clause n="6.5">
          We will inform you of material delays and comply with statutory cancellation rights. Courier estimates are not promises of a particular arrival date unless
          expressly agreed.
        </Clause>
      </>
    ),
  },
  {
    id: "risk",
    title: "Risk",
    body: (
      <>
        <p>
          Risk ordinarily passes when the goods are delivered to the agreed address or collected by you or an authorised person. If delivery fails because the address is
          incorrect or the recipient unreasonably fails to accept a proper attempted delivery, we may recover reasonable, evidenced additional costs of storage, return or
          redelivery where lawful, but risk does not automatically pass merely because delivery was delayed. Statutory rules for returned goods prevail.
        </p>
        <p>
          For valid cooling-off returns, risk and the direct return shipping cost are yours unless law requires otherwise. For qualifying defective or incorrectly
          supplied goods, statutory allocation of risk and return cost to us applies.
        </p>
      </>
    ),
  },
  {
    id: "title",
    title: "Ownership and retention of title",
    body: (
      <p>
        Ownership of the goods transfers upon payment in full for the relevant order and delivery, subject to any mandatory legal rule. We do not retain title to a
        paid-for order because of a separate unrelated debt.
      </p>
    ),
  },
  {
    id: "returns",
    title: "Returns",
    body: (
      <>
        <Clause n="9.1">
          <strong>Statutory quality rights:</strong> Where the CPA applies, goods carry the legally implied warranty of quality under sections 55 and 56. For qualifying
          unsafe, defective or non-conforming goods returned within six months after delivery, the customer may elect a repair, replacement or refund in accordance with
          section 56. This is a statutory right, not an additional voluntary guarantee. Other statutory remedies remain available as applicable.
        </Clause>
        <Clause n="9.2">
          This includes qualifying printing or manufacturing defects, goods materially different from what was ordered, and transit damage for which we are legally
          responsible. We may reasonably ask for photographs or inspect goods to identify the issue, without making evidence requests an unlawful obstacle to your rights.
        </Clause>
        <Clause n="9.3">
          Contact {contact} with the order number and a description; photographs can help us assess the claim before arranging any collection. For goods validly
          returnable as defective under CPA section 56, we bear the required return risk and expense. We may choose an economical, reasonable method (including a prepaid
          shipping label, our nominated courier or shop drop-off by agreement). You are not required to pay a return courier fee that the law makes our responsibility.
        </Clause>
        <Clause n="9.4">
          We are not required to provide a statutory defect remedy for problems solely caused after supply by misuse, accident, improper care or unauthorised alteration,
          subject to the CPA and the facts of the case. Low resolution in an uploaded image, approved spelling/cropping and minor colour or handmade differences are not
          necessarily defects, provided the goods meet the law and their agreed description.
        </Clause>
        <Clause n="9.5">
          If a repaired item or component fails again or a further defect appears within three months after repair in the circumstances covered by CPA section 56(3), we
          will replace the goods or refund the price as the law requires. Rights outside the six-month period exist only where otherwise provided by applicable law. We
          offer no additional or extended shop warranty.
        </Clause>
        <Clause n="9.6">
          For non-personalised goods ordered online where ECTA section 44 applies, <strong>you may cancel without reason within seven days after receiving them</strong>.
          Tell us within that period and arrange prompt return. You bear the direct return transport cost and may return goods to the shop without a courier fee. We do
          not provide free return collection for change-of-mind cancellations. If you ask us to arrange a courier, you must first agree to its actual direct charge, which
          may be deducted from your refund where lawful. Refund timing and amount are governed by ECTA and <a className="inline-link" href="#refunds">clause 11</a>.
        </Clause>
        <Notice title="What the cooling-off period doesn’t cover">
          <p>
            The cooling-off exclusion applies to goods genuinely made to your specification or clearly personalised and to any other category expressly excluded by
            applicable law. We do not impose a blanket hygiene exception for opened earrings where ECTA cooling-off rights apply. Goods damaged or used beyond reasonable
            inspection may be treated in accordance with applicable law, but this does not eliminate mandatory rights.
          </p>
        </Notice>
        <Clause n="9.7">
          Ordinary in-store change-of-mind returns are not automatically accepted. At our discretion we may offer an exchange or store credit, but no discretionary return
          policy creates a voluntary guarantee. Statutory remedies always remain available.
        </Clause>
        <Clause n="9.8">
          Contact us before dispatching a return for the correct address and reference. For voluntary or cooling-off returns, you arrange and pay for tracked return
          shipping unless we agree otherwise; we do not pay your courier charges. Where the law requires us to bear shipping cost for a valid defect or other statutory
          return, we will arrange or reimburse reasonable shipping as required. Do not send goods cash-on-delivery without prior agreement.
        </Clause>
      </>
    ),
  },
  {
    id: "cancellations",
    title: "Cancellations",
    body: (
      <>
        <Clause n="10.1">
          Contact us promptly by email, WhatsApp, phone or at the counter, with your order number. We may confirm a telephone cancellation in writing.
        </Clause>
        <Clause n="10.2">
          Personalised orders may be cancelled for a full refund before production starts. If you request cancellation after production has started, we may, to the
          extent permitted by law, retain reasonable, evidenced costs actually incurred for work and materials that cannot reasonably be avoided or recovered, and refund
          the balance, including unincurred delivery charges. Statutory cancellation rights take precedence.
        </Clause>
        <Clause n="10.3">
          Ready-made stock may be cancelled before dispatch or collection for a full refund unless a specific lawful exception applies. After receipt, statutory online
          cooling-off rights may apply under clause 9.6.
        </Clause>
        <Clause n="10.4">
          If we cannot lawfully fulfil an order because of stock availability, unlawful content or a qualifying obvious pricing error, we will notify you and provide the
          appropriate refund or other statutory remedy.
        </Clause>
        <Clause n="10.5">
          Unless we agree otherwise, online orders must be performed within the period required by ECTA section 46. If we fail to perform within 30 days after receiving
          the order or an agreed period, you may cancel on seven days’ written notice as provided by that section. Dispatch alone does not automatically satisfy an agreed
          delivery obligation. Any additional rights for late delivery or non-performance remain unaffected. We will give the applicable refund within the statutory time.
        </Clause>
      </>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    body: (
      <>
        <Clause n="11.1">
          We normally refund online payments through PayFast to the original payment method, where technically possible and lawful. Where this is not possible, we will
          agree a secure alternative after appropriate verification.
        </Clause>
        <Clause n="11.3">
          We process refunds within the period required by the law governing that cancellation or return (including ECTA section 44 or 46 where applicable). For other
          agreed refunds, we aim to act promptly and in any event within 30 days unless a shorter statutory period applies. Banking and payment-processor posting times may
          vary.
        </Clause>
        <Clause n="11.5">
          We refund original delivery charges where required by law or where the whole order is cancelled before dispatch and the delivery charge was not incurred. For a
          valid ECTA cooling-off cancellation, only the direct cost of return may be charged to you. We do not pay return courier fees for a change of mind. For
          qualifying statutory defective-goods returns, we pay necessary return shipping as law requires.
        </Clause>
      </>
    ),
  },
  {
    id: "responsibility",
    title: "Our responsibility to you",
    body: (
      <Notice title="Important: limits on our liability">
        <p>
          Where lawful and fair in the particular circumstances, liability for contractual claims that may legally be capped is limited to the price paid for the affected
          order. This cap does not apply to statutory refund or repair/replacement obligations, personal injury or product-harm liability under CPA section 61, fraud,
          wilful wrongdoing, any liability that cannot lawfully be limited, or any circumstance where the cap would be unfair or unenforceable.
        </p>
        <p>
          To the extent permitted by law, we exclude unforeseeable indirect losses such as missed celebrations, lost profits or sentimental value. Please keep backup copies
          of your photographs. We are not responsible for defects attributable solely to your supplied content or for events beyond our reasonable control, but we remain
          responsible for obligations and statutory remedies that still apply. Website risk and limitations are separately described above.
        </p>
      </Notice>
    ),
  },
  {
    id: "complaints",
    title: "Complaints and disputes",
    body: (
      <p>
        Please contact us first at <EmailLink /> or <Phones /> so that we can investigate. You may refer qualifying complaints to the Consumer Goods and Services Ombud
        (cgso.org.za), National Consumer Commission (thencc.org.za) or other competent authority, and a privacy complaint to the Information Regulator (see our{" "}
        <Link className="inline-link" href="/privacy#complaints">
          Privacy Policy
        </Link>
        ). The courts with jurisdiction remain available.
      </p>
    ),
  },

  // ---- Part 3: the delivery terms -----------------------------------------
  {
    id: "delivery-options",
    part: "Delivery terms",
    title: "Our delivery options",
    body: (
      <>
        <Facts
          rows={[
            ["Free collection", `${SHOP.street}, ${SHOP.town}, during trading hours, after we confirm the order is ready.`],
            ["Courier", "The Courier Guy, where its services are offered at checkout."],
          ]}
        />
        <p>Delivery charges depend on the parcel size, weight, address and service selected; the amount is shown before payment.</p>
      </>
    ),
  },
  {
    id: "collection",
    title: "Collecting from the shop",
    body: (
      <>
        <p>
          When your order is ready, we email you a collection code. Show the code when collecting. You may authorise another person to collect by giving them the code;
          safeguard it, because we may hand the order to whoever shows it.
        </p>
        <p>
          Please collect within 90 days after notice that your order is ready. If uncollected, we will make reasonable efforts to contact you and give at least a further
          14 days’ written notice. We may recover reasonable, disclosed storage or handling expenses where lawful. Uncollected goods will be dealt with only under a lawful
          process considering their nature, value and applicable ownership and consumer protections; the expiry of a collection deadline does not automatically forfeit
          ownership or refund rights.
        </p>
      </>
    ),
  },
  {
    id: "courier",
    title: "Courier delivery",
    body: (
      <>
        <p>
          Courier estimates begin after collection from our shop and are not guaranteed arrival dates unless expressly confirmed. Give a correct address, recipient name
          and phone number. Where a failed attempt is attributable to incorrect details or unreasonable non-acceptance, reasonable additional courier charges may be passed
          on where lawful.
        </p>
        <p>
          Any courier transit-cover options and charges displayed at checkout relate to claims between us and the carrier. They do not reduce statutory delivery risk or
          consumer remedies. Please confirm with us if additional carrier cover is available; no optional cover is required to preserve your statutory rights.
        </p>
        <p>
          We are responsible for the goods until delivery or authorised collection to the extent required by law. Please report damage promptly, within 48 hours, and
          photograph the parcel and packaging to assist an investigation. That request is not a deadline for statutory claims.
        </p>
      </>
    ),
  },
  {
    id: "delivery-times",
    title: "Delivery times",
    body: (
      <>
        <h3>Trading hours</h3>
        <Facts rows={HOURS.map((h) => [h.days, h.time] as [string, string])} />
        <p>
          Production timing varies by product and capacity. Before ordering, review the product-page dispatch estimate or ask for confirmation; we must disclose the time
          within which the goods will be dispatched or delivered where required by ECTA. A specific date binds us only where expressly confirmed in writing, without
          reducing statutory performance obligations.
        </p>
      </>
    ),
  },
  {
    id: "delayed",
    title: "Delayed deliveries",
    body: (
      <>
        <p>
          Where a product is temporarily unavailable, we will notify you of the expected delay where possible and offer the legally required choices, including an
          appropriate refund if you do not agree to wait or accept an alternative. If a product is discontinued, we will notify you and refund the unfulfilled product
          unless you agree to an alternative. Delivery charges for parcels that will no longer be sent will be refunded; other delivery charges will be treated in
          accordance with the law and actual order performance.
        </p>
        <p>
          Where a courier cannot serve the address, contact us to discuss another address or collection. For late orders, see{" "}
          <a className="inline-link" href="#cancellations">
            Terms of sale clause 10.5
          </a>
          . Questions: <EmailLink /> / <Phones />.
        </p>
      </>
    ),
  },
];
