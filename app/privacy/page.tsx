import type { Metadata } from "next";
import Link from "next/link";

import { EmailLink, Facts, LegalPage, Notice, Phones, type LegalSection } from "@/app/site/Legal";
import { LEGAL, SHOP } from "@/app/site/data";
import { policyTitle } from "@/lib/legal";
import { share } from "@/lib/share";

const DESCRIPTION = `How ${SHOP.name} collects, uses, shares and protects your personal information, and your rights under POPIA.`;

export const metadata: Metadata = {
  title: policyTitle("/privacy"),
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  ...share({ title: policyTitle("/privacy"), description: DESCRIPTION }),
};

/**
 * The privacy policy (POPIA), as the shop's own legal document of 20 November
 * 2026 words it (`ExpressPhoto_Privacy_Policy_Redline.docx`), checked against
 * what the code keeps and sends: the order (`orders/{ref}`), saved details
 * (`customers/{uid}`), marketing consent (`marketing/{uid}`, and
 * `subscribers/{emailHash}` for an email-only sign-up), one-time deal codes
 * (`campaignCodes/{code}`, the recipient as an email hash), photos in
 * Cloudinary swept after `SWEEP_AFTER_DAYS` when unpaid, `GUEST_PHOTO_DAYS`
 * after payment on no account and `ACCOUNT_PHOTO_DAYS` on an account (sooner
 * when its customer deletes them), the device's storage (`epg:cart`,
 * `epg:code`, `epg:photos`, `epg:details`, `track:*`), the customer cookie
 * (14 days) and the shop's day counters, which hold counts only. There is no
 * third-party analytics script. Firestore is in `africa-south1`
 * (Johannesburg); Cloudinary in the United States. Change what is collected,
 * how long it is kept or who receives it, change this page, and move
 * `POLICIES_VERSION` on. `#keeping` and `#complaints` are linked from the
 * terms; `#rights` links to the PAIA manual, its only link.
 */
export default function PrivacyPage() {
  return <LegalPage path="/privacy" lede={LEDE} sections={SECTIONS} />;
}

const LEDE = <>We respect your privacy. Please read the full privacy policy because it applies to you.</>;

const COMPANY = LEGAL.registeredName ? `${LEGAL.registeredName} (trading as ${SHOP.name})` : SHOP.name;
const ADDRESS = `${SHOP.street}, ${SHOP.town}, ${SHOP.province}, ${SHOP.postcode}, ${SHOP.country}`;

const SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: (
      <>
        <p>
          {COMPANY} is the responsible party for the personal information described in this policy. Our shop is at {ADDRESS}.
          {LEGAL.registrationNumber ? ` Company registration number is ${LEGAL.registrationNumber}.` : ""} We respect your privacy and take the protection of personal
          information seriously.
        </p>
        <p>
          This policy explains what personal information we collect, why we process it, with whom we share it, how long we keep it and how you can exercise your rights
          under the Protection of Personal Information Act 4 of 2013 (POPIA).
        </p>
        <p>
          For privacy enquiries or requests, contact our Information Officer{LEGAL.informationOfficer ? `, ${LEGAL.informationOfficer},` : ""} at <EmailLink />,{" "}
          <Phones /> or the shop address above.
        </p>
      </>
    ),
  },
  {
    id: "audience",
    title: "Audience",
    body: (
      <>
        <p>This policy applies to you if you are:</p>
        <ul>
          <li>a visitor to our website; or</li>
          <li>a customer who orders or requests our products or services; or</li>
          <li>a person whose details are supplied for delivery or whose image appears in customer-submitted photographs.</li>
        </ul>
      </>
    ),
  },
  {
    id: "personal-information",
    title: "Personal information",
    body: (
      <>
        <p>
          Personal information includes details that identify or relate to a person, including website and account information, contact and delivery details, order
          information and identifiable photographs that customers submit. We only process such information for lawful, relevant purposes.
        </p>
        <p>
          Information published publicly, including social media comments or reviews, may still be personal information under POPIA. We process it only where lawful and
          relevant. Properly de-identified information that cannot reasonably identify a person is not personal information.
        </p>
      </>
    ),
  },
  {
    id: "examples",
    title: "Common examples",
    body: (
      <ul>
        <li>identifying information, such as your first name and surname;</li>
        <li>contact information, such as your mobile number or email address;</li>
        <li>address information, such as your delivery address;</li>
        <li>your photos: pictures uploaded for printing that may depict people, children and places.</li>
      </ul>
    ),
  },
  {
    id: "sensitive",
    title: "Sensitive personal information",
    body: (
      <>
        <p>
          We do not generally request identity numbers, birth dates, health details, beliefs or other special personal information. Uploaded photographs may nevertheless
          reveal special personal information or show children. We handle such photographs only as necessary for the requested order, related support and any other
          lawful purpose. We apply additional care and access restrictions where appropriate, and process children’s personal information only where a lawful basis under
          POPIA applies, including, where required, competent-person consent.
        </p>
        <p>
          We do not receive or store customers’ full payment-card credentials through our checkout. Payments are handled by PayFast; we receive payment status, amount and
          transaction references to administer orders and refunds. PayFast separately processes payment data under its own notices.
        </p>
      </>
    ),
  },
  {
    id: "acceptance",
    title: "Acceptance and lawful grounds",
    body: (
      <>
        <h3>What this policy is</h3>
        <p>
          This policy is a notice explaining our processing practices; it is not a contract and reading or using the website does not itself constitute consent to all
          processing. We process information where permitted by POPIA, including where needed to perform a contract, comply with law, pursue a legitimate interest where
          permitted, or on the basis of valid consent where required (such as optional electronic marketing).
        </p>
        <h3>Legal capacity</h3>
        <p>
          Purchases by minors are subject to our{" "}
          <Link className="inline-link" href="/terms">
            Terms &amp; Conditions
          </Link>{" "}
          and applicable law. Photographs containing children may be submitted where the customer has the necessary rights or lawful authority to request the service. We
          do not use such images for promotional purposes without a separate lawful basis.
        </p>
        <h3>Consent and withdrawal</h3>
        <p>
          Where consent is required for a particular activity, we will request it separately and you may withdraw it as permitted by law. Withdrawal does not affect
          processing already lawfully carried out.
        </p>
        <h3>Your obligations</h3>
        <p>
          When supplying a recipient’s contact details or photographs of others, please ensure you have the rights, permissions or other lawful authority needed for us to
          fulfil your order. We do not require you to obtain express consent from every person in a photograph in every circumstance; the applicable lawful basis depends
          on the facts.
        </p>
      </>
    ),
  },
  {
    id: "collection",
    title: "Collection",
    body: (
      <>
        <h3>On registration</h3>
        <p>If you create an account, including by choosing “Save my details for next time”, we collect the details needed to provide that account:</p>
        <ul>
          <li>first name and surname;</li>
          <li>email address and mobile number;</li>
          <li>saved delivery address, where provided;</li>
          <li>authentication credentials managed by Firebase (the shop cannot read your password).</li>
        </ul>

        <h3>On order or request</h3>
        <p>For purchases and service requests, we may collect the information needed to produce, communicate about and deliver the order, including:</p>
        <ul>
          <li>your name, email and mobile number;</li>
          <li>delivery address, instructions and recipient details where relevant;</li>
          <li>uploaded photographs, custom text and order notes;</li>
          <li>communications by email, phone, WhatsApp or in person;</li>
          <li>products ordered, discounts, payment confirmations, refunds, courier events and the version of terms accepted;</li>
          <li>one-time promotion records, including hashed email identifiers used to prevent duplicate redemption.</li>
        </ul>

        <h3>From your browser</h3>
        <p>
          Our website and hosting services receive technical information such as IP address, browser/device type, page requests and referral information. We use it for
          site operation, security and abuse prevention. We do not ordinarily attach raw IP addresses to customer orders. Hosting-service logs may be retained under the
          provider’s applicable arrangements.
        </p>
        <p>
          We do not use third-party website analytics services. Internal product, cart, checkout and unsuccessful-search counters are used for business statistics. They
          are daily totals that hold counts only, and genuinely anonymised totals are not treated as identifiable customer records.
        </p>

        <h3>Cookies and browser storage</h3>
        <p>
          We use cookies and local browser storage to operate our shop and remember your choices. We do not currently use advertising cookies or targeted-advertising
          pixels.
        </p>
        <ul>
          <li>sign-in cookies for account sessions, which may last up to two weeks or until sign-out;</li>
          <li>cart items and discount-code selections;</li>
          <li>checkout state, including order token, images and edits, normally cleared after 10 days;</li>
          <li>checkout name, contact and address details until payment or sign-out;</li>
          <li>session counters that prevent counting the same step repeatedly.</li>
        </ul>
        <p>
          Blocking or deleting necessary site storage may affect sign-in, cart, checkout progress or saved details. You may control storage in your browser settings.
        </p>

        <h3>Third-party tools</h3>
        <p>
          PayFast or other third-party services reached from our site may set their own cookies and process information under their respective privacy notices. Their
          activities are not automatically controlled by this policy, but our own disclosures and legal obligations continue to apply where relevant.
        </p>

        <h3>Optional details and purpose</h3>
        <p>
          You may voluntarily provide notes, saved account details, promotional responses or a marketing subscription. We use data to fulfil orders, support customers,
          secure the shop, maintain appropriate accounts and records, meet legal obligations and send optional marketing only where permitted.
        </p>

        <h3>Consent to collection</h3>
        <p>
          We do not rely on blanket checkout consent for all collection or use. We identify an appropriate lawful ground for each processing purpose and obtain consent
          where POPIA requires it.
        </p>

        <h3>Updating or removing</h3>
        <p>You may update eligible saved details in your account or contact us to request access, correction or deletion where permitted by law.</p>
        <p>
          Account closure removes the account and associated saved details and photos in accordance with the functionality described on the website. Order, payment and
          related records may continue to be retained when required or permitted by law, even though they are no longer linked to an active account. We retain opt-out
          information as needed to respect marketing preferences. An account cannot be closed, nor an order’s photos deleted, while an order is still on its way.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "Use",
    body: (
      <>
        <p>
          We process your information to take and produce orders, deliver or make goods available for collection, communicate about orders, resolve complaints, maintain
          our accounts, prevent fraud and meet applicable legal duties.
        </p>

        <h3>Messages and marketing</h3>
        <p>
          We send transactional messages about orders, deliveries, refunds and accounts as necessary to provide our services. These are separate from optional promotions.
        </p>
        <p>
          We send promotional email only where permitted by POPIA, currently using email confirmation for subscriptions. We record subscriptions and opt-outs and provide a
          free unsubscribe method in promotional messages. You can also opt out through your account or by contacting us.
        </p>

        <h3>Targeted content</h3>
        <p>
          We do not currently use personal information for targeted advertising or solely automated decisions with legal or similarly significant effects, and do not
          disclose identifiable customer information to advertisers.
        </p>
      </>
    ),
  },
  {
    id: "disclosure",
    title: "Disclosure",
    body: (
      <>
        <p>
          Authorised staff and service providers may access only the personal information reasonably needed for their duties. Providers handling information for us
          should be subject to appropriate confidentiality, security and contractual arrangements, while some (such as payment providers) may also process data as
          separate responsible parties for their own legal obligations.
        </p>
        <ul>
          <li>
            <strong>PayFast</strong> (South Africa): payment processing, receiving name, contact details, order number and amount; we receive payment confirmation rather
            than full card credentials.
          </li>
          <li>
            <strong>The Courier Guy via Shiplogic</strong> (South Africa): quotations, dispatch and tracking, using delivery details and recipient contact information.
          </li>
          <li>
            <strong>Google Firebase</strong> (database in South Africa): orders, accounts and saved customer information are stored in Google Cloud’s Johannesburg region.
            Sign-in is handled by Firebase Authentication, a Google service that may process sign-in details outside South Africa.
          </li>
          <li>
            <strong>Cloudinary</strong> (United States): uploaded photographs and edited files for production, plus product-image delivery that may involve visitor IP
            addresses.
          </li>
          <li>
            <strong>Resend</strong> (outside South Africa): delivery of order, refund, account and related emails.
          </li>
          <li>
            <strong>Vercel</strong> (outside South Africa): website hosting and the technical requests every visit makes.
          </li>
          <li>
            <strong>WhatsApp/Meta</strong> (potentially outside South Africa): messages or photographs if you contact us there.
          </li>
        </ul>
        <p>We may use additional providers only where reasonably needed and lawful. We will update this notice for material changes to recipients or purposes.</p>

        <h3>Artificial intelligence</h3>
        <p>
          We do not currently use AI to analyse submitted customer photos or make automated decisions about customers. We will review and update this policy before
          introducing materially different processing.
        </p>

        <h3>Legal disclosures and ownership changes</h3>
        <p>
          We may disclose information to SARS, regulators, law-enforcement authorities or other persons when required or authorised by law, or where necessary for lawful
          claims or protection of rights, subject to POPIA.
        </p>
        <p>We do not sell or rent identifiable customer information to advertisers or data brokers.</p>
        <p>
          If our business is sold, merged or reorganised, personal information may be transferred where a lawful ground exists, with appropriate safeguards and notice
          where required. Customers may exercise applicable rights, but records cannot always be deleted if legal retention duties apply.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <p>
          We maintain reasonable technical and organisational safeguards appropriate to the nature of the information, including restricted staff access, protected
          service accounts, secure connections and access logging where implemented. Security controls are reviewed as appropriate to risk, and no internet service can
          guarantee absolute security.
        </p>
        <Notice title="Keep your order link private">
          <p>
            Keep order-tracking links and checkout access tokens private: a person with the link may be able to view order and delivery details. On shared devices, sign
            out and clear saved checkout information.
          </p>
        </Notice>
      </>
    ),
  },
  {
    id: "accurate",
    title: "Accuracy",
    body: (
      <>
        <p>
          We take reasonable steps to keep personal information accurate and up to date for the purposes for which it is used. Please notify us if contact or delivery
          details change.
        </p>
        <p>We may verify identity before disclosing, correcting or deleting records, to avoid making changes for the wrong person.</p>
      </>
    ),
  },
  {
    id: "keeping",
    title: "Retention",
    body: (
      <>
        <p>
          We keep identifiable information only while reasonably necessary for the stated purposes or where a lawful ground permits or requires longer retention,
          including recordkeeping, complaints, claims and customer-requested account features. We periodically review retention and delete, destroy or de-identify
          information when appropriate.
        </p>
        <ul>
          <li>
            <strong>Unpaid checkouts:</strong> photos are currently scheduled for deletion 14 days after the last upload, while browser checkout state normally expires after 10 days. Where a payment was started, deletion waits until our daily check of PayFast’s records has confirmed it was not paid.
          </li>
          <li>
            <strong>Paid orders without an account:</strong> photographs are retained for up to 6 months after payment to support production, delivery issues and any
            legally required remedies, and are then deleted automatically, unless earlier deletion is requested and can lawfully be completed. This period is not an
            additional product guarantee. Because it runs from payment, it can end shortly before the six months from delivery in{" "}
            <Link className="inline-link" href="/terms#returns">
              Terms of sale clause 9.1
            </Link>
            , so a fault reported after that may need you to send the photo again. If you make an account within those 6 months, the order joins it and its photos are kept
            as below.
          </li>
          <li>
            <strong>Orders on an account:</strong> photos are available for convenient reordering for 12 months after payment and are then deleted automatically. You can
            delete them sooner in your account, on any order once it has arrived, or all together by closing your account. We will not retain identifiable images
            indefinitely merely because an account has not been closed.
          </li>
          <li>
            <strong>Transaction records:</strong> we retain relevant transaction and accounting records for the period required by applicable tax, company and other
            recordkeeping laws, which may be at least five years depending on the record and applicable starting date. Closing an account does not automatically delete
            records that must legally be kept.
          </li>
          <li>
            <strong>Accounts:</strong> account and saved details are ordinarily held while the account remains active, subject to periodic review, deletion requests and
            other lawful retention considerations.
          </li>
          <li>
            <strong>Marketing choices:</strong> we maintain records of marketing choices and, where appropriate, minimal suppression records to prevent contact after an
            opt-out. We retain them only as long as reasonably needed for lawful compliance. A request to subscribe whose confirmation link is never followed is deleted once the link expires, after 3 days.
          </li>
          <li>
            <strong>Statistics:</strong> truly anonymised aggregate daily usage statistics may be retained for business analysis.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "transfer",
    title: "International transfers",
    body: (
      <>
        <p>
          Our order and account database is stored in South Africa. Some named providers process or store information outside South Africa: uploaded photographs are
          stored by Cloudinary in the United States, and email delivery (Resend), website hosting (Vercel), sign-in (Firebase Authentication) and WhatsApp may involve
          processing in other countries.
        </p>
        <p>
          We seek to ensure that each international transfer meets an applicable condition under section 72 of POPIA, such as adequate protection under binding legal or
          contractual safeguards, a transfer necessary to perform the relevant contract, or valid consent where relied upon. This notice does not itself create blanket
          consent for all transfers.
        </p>
      </>
    ),
  },
  {
    id: "measures",
    title: "Data security measures",
    body: (
      <>
        <p>
          We use reasonable safeguards to protect data against loss, unauthorised access, disclosure and misuse. Controls described below must be kept accurate as our
          systems change:
        </p>
        <ul>
          <li>HTTPS connections for website traffic;</li>
          <li>PayFast-hosted payment handling rather than storing full card details;</li>
          <li>Firebase-managed password authentication;</li>
          <li>restricted database and administrative access;</li>
          <li>named staff accounts and relevant activity logs;</li>
          <li>signed upload authorisations and difficult-to-guess order links.</li>
        </ul>
        <p>
          Where we have reasonable grounds to believe that personal information has been accessed or acquired by an unauthorised person, we will investigate and notify the
          Information Regulator and affected persons as required by section 22 of POPIA, subject to lawful exceptions and permitted delays.
        </p>
        <p>
          Please keep passwords and tracking links secure and sign out on shared devices. These precautions do not remove our statutory security responsibilities.
        </p>
      </>
    ),
  },
  {
    id: "limitation",
    title: "Third-party websites",
    body: (
      <p>
        Third-party websites and payment interfaces may have their own privacy notices. Please review them where relevant. This statement does not exclude
        responsibilities imposed on us by law for our own processing or service-provider arrangements.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Subject to applicable statutory conditions, you may ask us whether we hold your personal information, request access to records, request correction or
          deletion, object to certain processing, withdraw consent where processing relies on it, and complain to the Information Regulator. You may object to direct
          marketing at any time.
        </p>
        <p>
          Submit a request to <EmailLink /> or at the shop. We may take reasonable steps to verify your identity and respond within the time required by applicable law.
          Confirmation whether records are held is free; copies or access may be subject to lawful PAIA fees and procedures. We will explain any lawful refusal, limitation
          or continuing retention requirement.
        </p>
        <p>
          Requests for access to records under the Promotion of Access to Information Act (PAIA) may be subject to the applicable request procedures and our{" "}
          <Link className="inline-link" href="/paia-manual">
            PAIA manual
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "complaints",
    title: "Complaints to the Information Regulator",
    body: (
      <>
        <p>
          You may contact us first to resolve a concern, but this is not a condition of your right to approach the Information Regulator. Current contact information
          should be checked at www.inforegulator.org.za.
        </p>
        <Facts
          rows={[
            [
              "Complaints",
              <a key="c" className="inline-link" href="mailto:POPIAComplaints@inforegulator.org.za">
                POPIAComplaints@inforegulator.org.za
              </a>,
            ],
            [
              "General enquiries",
              <a key="e" className="inline-link" href="mailto:enquiries@inforegulator.org.za">
                enquiries@inforegulator.org.za
              </a>,
            ],
            ["Phone", "010 023 5200 · toll-free 0800 017 160"],
            ["Address", "Woodmead North Office Park, 54 Maxwell Drive, Woodmead, Johannesburg, 2191"],
            ["Website", "inforegulator.org.za"],
          ]}
        />
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy when our processing practices, service providers or legal obligations change. We will publish the updated version and date. Where a
        change requires additional notice or consent under law, we will provide that notice or seek consent before the relevant processing.
      </p>
    ),
  },
  {
    id: "enquiries",
    title: "Enquiries",
    body: (
      <p>
        Privacy queries: {COMPANY}, {ADDRESS}; <EmailLink />; <Phones />.{LEGAL.registrationNumber ? ` Company registration number is ${LEGAL.registrationNumber}.` : ""}
      </p>
    ),
  },
];
