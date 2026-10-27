import type { Metadata } from "next";
import Link from "next/link";

import { Clause, EmailLink, Facts, LegalPage, Notice, PhoneLink, WhoWeAre, type LegalSection } from "@/app/site/Legal";
import { HOURS, SHOP } from "@/app/site/data";
import { policyTitle } from "@/lib/legal";

export const metadata: Metadata = {
  title: policyTitle("/terms"),
  description: `The terms on which ${SHOP.name} runs this website and sells photo prints, personalised gifts and other products, including delivery, cancellations, returns and refunds.`,
  alternates: { canonical: "/terms" },
};

/**
 * The shop's one set of terms, in the usual order of a South African online
 * shop's (website terms, general terms of sale and delivery terms), with
 * the returns, cancellations and refunds that used to be a page of their own
 * folded in. Three parts: the website terms, the terms of sale and the delivery terms.
 * Every operational fact here is what the code does: prices checked again at
 * Pay (`placeOrder`), the R5 floor (`MIN_PAYMENT`), an order paid only on
 * PayFast's verified notice, the courier's free cover and the full-value option
 * (`lib/checkout/courier.ts`), photos placed whole unless the customer edits
 * them, refunds through PayFast to what was paid with as `lib/checkout/refunds.ts` works them out (clauses 9 to 11), and a
 * return booked through The Courier Guy (`returnShipment`). The law it follows:
 * ECTA s44's seven day cooling-off for goods bought online, which s42(2) does
 * not extend to goods made to the customer's specification or clearly
 * personalised; ECTA s46 on an order not performed in 30 days; the CPA's six
 * month guarantee on quality (s55, s56), the customer's choice of repair,
 * replacement or refund; and CPA s17's reasonable charge for cancelling an
 * order already in hand. Change the code, change this page, and move
 * `POLICIES_VERSION` on. `#photos` and `#returns` are linked from elsewhere.
 */
export default function TermsPage() {
  return <LegalPage path="/terms" lede={LEDE} intro={INTRO} sections={SECTIONS} />;
}

const LEDE = (
  <>
    The agreement between you and {SHOP.name} when you use this website or order from us, online or at the counter: the website terms, the terms of sale, with
    cancellations, returns and refunds, and the delivery terms. Please read it, especially the parts marked with a gold dot: they limit what we&rsquo;re responsible
    for.
  </>
);

const contact = (
  <>
    email <EmailLink /> or WhatsApp <PhoneLink />
  </>
);

const INTRO = (
  <>
    <p>
      <strong>Between:</strong> {SHOP.name} (&ldquo;{SHOP.name}&rdquo;) and you (the &ldquo;User&rdquo;).
    </p>
    <Notice title="Important notice">
      <p>
        When you access, browse or use our website, you agree to these terms and conditions. If you do not agree to these terms and conditions, or to any changes we may
        subsequently make, you must immediately stop accessing our website.
      </p>
    </Notice>
    <p>
      These terms and conditions of use regulate access to and use of this website, and the sale of goods through it and in our shop. Please note that these terms and
      conditions are valid, binding and enforceable against all persons that access and/or use the {SHOP.name} website, web pages or any part hereof. The User is
      automatically bound by these terms and conditions by virtue of accessing this website.
    </p>
    <p>
      Our terms and conditions contain specific provisions to limit our liability. These have been set apart in the boxes marked with a gold dot. The User should pay
      particular attention to these terms and conditions since they limit the User&rsquo;s ability to recover losses which the User may incur in connection with the use
      of this website. If the User is not yet 18, the User must obtain his/her parents&rsquo; or legal guardians&rsquo; prior authorization, permission and consent to
      be bound by these terms and conditions of use prior to accessing our website, using any of the services on our website or participating in any of the activities
      offered. If the User is under 18 and fails to obtain such consent, the User may not access our website, use the services or participate in the activities
      available via our website.
    </p>
  </>
);

const SECTIONS: LegalSection[] = [
  // ---- Part 1: the website terms ------------------------------------------
  {
    id: "general",
    part: "Website terms",
    title: "General",
    body: (
      <>
        <p>
          {SHOP.name} is a photo printing and gift shop which conducts business within the Republic of South Africa, online and from its shop in {SHOP.town}. Further
          information regarding the business conducted by {SHOP.name} is to be found on {SHOP.name}&rsquo;s home page, expressphotoandgifts.com. These are the
          business&rsquo;s details:
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
    id: "ownership",
    title: "Ownership",
    body: (
      <>
        <p>
          This website, the content hereof and the online services are the property of, and all proprietary rights therein vest in, {SHOP.name}, alternatively are
          licensed to {SHOP.name}. The User acknowledges that ownership of all intellectual property rights, including the trade marks indicated on the website (whether
          registered or not), vest in {SHOP.name} or its licensors, and that it is not authorized to use, amend or exploit any of the intellectual property rights,
          including the trade marks, in any manner whatsoever, without the prior written consent of {SHOP.name}. The User furthermore acknowledges that the information
          and documentation contained in this website is the proprietary information and copyrighted material of {SHOP.name} or is licensed to {SHOP.name} and that no
          party is entitled to use or exploit in any manner whatsoever, any of the proprietary information or copyrighted material of {SHOP.name} without the prior
          written consent of {SHOP.name}. The User shall not, other than for his personal and non-commercial use:
        </p>
        <Clause n="(a)" sub>
          store on his computer, or print copies of extracts from this website;
        </Clause>
        <Clause n="(b)" sub>
          mirror or cache information provided via this website on his own server or other computer or other storage facility of whatsoever nature; or
        </Clause>
        <Clause n="(c)" sub>
          copy, adapt, modify or re-use the text or graphics from this website, without the prior written consent of {SHOP.name}.
        </Clause>
        <p>The photos and words you give us for your own order stay yours; the Terms of sale say what we may do with them.</p>
      </>
    ),
  },
  {
    id: "improper-use",
    title: "No improper use or unlawful conduct",
    body: (
      <p>
        The User hereby agrees not to use this website and services for any purpose that is unlawful, improper or prohibited by these terms and conditions. Improper
        actions include, but are not limited to: activities designed to defame, embarrass, harm, abuse, threaten, slander or harass third parties; activities prohibited
        by the laws of the Republic of South Africa and/or foreign territories in which the User resides or conducts business; activities designed to encourage unlawful
        behaviour by others; the invasion of the privacy of a third party; racially, ethnically, or otherwise objectionable behaviour; and activities designed to
        impersonate the identity of a third party. Should the User commit an improper action and/or breach these terms and conditions, {SHOP.name} reserves the right to
        recover damages from such action and further claim any costs in recovering these damages, on the attorney-client scale.
      </p>
    ),
  },
  {
    id: "use-of-services",
    title: "Use of services",
    body: (
      <>
        <p>
          The User agrees that it will only use this website, the information contained herein and the online services in respect of the specific purposes for which it
          is created. In using the website, information or online services, the User will not:
        </p>
        <Clause n="(a)" sub>
          disrupt or interfere with any other user&rsquo;s enjoyment of such services or materials or any affiliated or linked sites;
        </Clause>
        <Clause n="(b)" sub>
          upload, post or otherwise transmit any viruses or other harmful, disruptive or destructive files;
        </Clause>
        <Clause n="(c)" sub>
          create a false identity;
        </Clause>
        <Clause n="(d)" sub>
          use or attempt to use another&rsquo;s account, password, service or system without authorization from {SHOP.name};
        </Clause>
        <Clause n="(e)" sub>
          access or attempt to access any service or content which the User is not authorized to access;
        </Clause>
        <Clause n="(f)" sub>
          disrupt or interfere with the security of, or otherwise cause harm to, any system resources, accounts, passwords, servers or networks connected to or
          accessible through such feature or any affiliated or linked sites, including by automated scraping or overloading;
        </Clause>
        <Clause n="(g)" sub>
          conduct any surveys, contests, pyramid schemes, chain letters, junk email, spamming or any duplicative or unsolicited messages (commercial or otherwise);
        </Clause>
        <Clause n="(h)" sub>
          threaten, defame, abuse, harass, stalk or otherwise violate the legal rights (including the rights of privacy and publicity) of others;
        </Clause>
        <Clause n="(i)" sub>
          publish, post, upload, distribute or disseminate any defamatory, obscene, or unlawful topic, name, material or information;
        </Clause>
        <Clause n="(j)" sub>
          upload or otherwise make available files that contain images, photographs, software or other material protected by intellectual property laws, including,
          without limitation, copyright, trademark, patents, designs, privacy and publicity laws unless the User owns or controls the rights thereto or has received all
          necessary authority to do the same;
        </Clause>
        <Clause n="(k)" sub>
          advertise or offer to sell or buy any goods or services for any purpose;
        </Clause>
        <Clause n="(l)" sub>
          violate any laws or regulations of the Republic of South Africa or any other country applicable.
        </Clause>
      </>
    ),
  },
  {
    id: "site-liability",
    title: "Limitation of liability",
    body: (
      <>
        <Notice title="Limits on our liability for the website">
          <p>
            The use of this website and online services is at the User&rsquo;s own risk. In no event, including without limitation, negligence, will {SHOP.name}, its
            subsidiaries, affiliates, agents, officers, directors, employees, partners or suppliers be liable to the User or any third party for any damages whatsoever,
            including, without limitation, special, punitive, incidental, indirect or consequential damages of any kind, or those resulting from loss of use, data or
            profits, viruses, worms, spam, whether or not {SHOP.name} has been advised of the possibility of such damages, arising out of or in connection with the use
            of or the inability to use the online services, materials or information, the statements or actions of any third party on or through the online services,
            materials or information or any dealings with vendors or other third parties, any unauthorized access to or alteration of the User&rsquo;s transmissions or
            data, any information that is sent or received or not sent or received, any failure to store or loss of data, files or other content, any services available
            through the online services or website that are delayed or interrupted, or any website referenced or linked to from the online services feature.
          </p>
        </Notice>
        <p>
          This applies only as far as the law allows. It does not limit our liability for death or injury, for our gross negligence or wilful wrongdoing, or under
          section 61 of the CPA, or any other right that the law doesn&rsquo;t allow us to exclude. Our responsibility for an order you place is set out in the Terms of
          sale below.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <>
        <Notice title="You make us whole for these">
          <p>
            The User hereby indemnifies and holds {SHOP.name}, and its subsidiaries, affiliates, officers, agents, partners, employees and suppliers harmless from any
            claim or demand, including reasonable attorneys&rsquo; fees, made by any third party due to or arising out of:
          </p>
          <Clause n="(a)" sub>
            the User&rsquo;s unlawful or improper use of the website and online services;
          </Clause>
          <Clause n="(b)" sub>
            the User&rsquo;s violation of these terms and conditions; or
          </Clause>
          <Clause n="(c)" sub>
            the User&rsquo;s violation of any law, rule or regulation or the rights of any other person or entity.
          </Clause>
        </Notice>
      </>
    ),
  },
  {
    id: "registration",
    title: "Online registration",
    body: (
      <p>
        Registration on this website is optional: you can order without it. If you tick &ldquo;Save my details for next time&rdquo; at checkout, or create an account
        afterwards, the User will be required to provide certain information, including personal information, to {SHOP.name}. This personal information will be treated
        in accordance with our <Link className="inline-link" href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "restricted-access",
    title: "Limited or restricted access",
    body: (
      <>
        <p>
          Access to certain areas of this website is restricted. {SHOP.name} reserves the right at its absolute and sole discretion to restrict access to any area of
          the website, or even the whole website. The User is responsible to maintain the confidentiality of his / her password and account information, and is
          responsible for all activities that occur under his / her password or account. The User agrees to immediately notify {SHOP.name} of any unauthorized use of
          his / her password or account, or any other breach of security. {SHOP.name} may disable the User&rsquo;s password and account at any time in its sole
          discretion with or without notice or explanation. You can ask us to close your account at any time.
        </p>
        <p>
          Every order email has a &ldquo;Track my order&rdquo; link. Anyone holding that link can see the order, its delivery address and its progress, so don&rsquo;t
          share it publicly.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third party sites and services",
    body: (
      <p>
        This website and online services may also make available other services, service providers, dealings, web sites and/or web pages operated by third parties
        offering material, information and online services (the &ldquo;third party service&rdquo;), such as PayFast, which takes your payment, and The Courier Guy, which
        delivers your order. The use of the third party services and the use of information collected by the operators of such services / sites are governed by the terms
        of use and privacy policies found at such sites (if any). Third party services are made available only as a convenience, and the inclusion within the online
        services of any link to a third party service does not imply endorsement by {SHOP.name} of the operator of such site or any association between {SHOP.name} and
        such operator. Any direct dealings between the User and any third party in connection with a third party service, and any other terms, conditions, warranties or
        representations associated with such dealings, are solely between the User and such third party or the operator of such site. {SHOP.name} will not be
        responsible or liable for any part of any such dealings. This does not change our responsibility for your order, including its delivery by the courier we
        appoint, which the Terms of sale set out.
      </p>
    ),
  },
  {
    id: "no-warranty",
    title: "No warranty",
    body: (
      <>
        <p>
          Except as expressly provided otherwise in a written agreement between the User and {SHOP.name}, and except for any warranty, condition, representation or term
          to the extent to which the same cannot or may not be excluded or limited by law applicable to the User in its jurisdiction; this website, online services, and
          all materials and services offered through or in association with such features, are provided &ldquo;as is&rdquo; without warranty of any kind, either
          express or implied, including, but not limited to, the implied warranties of merchantability or fitness for a particular purpose, or the warranty of
          non-infringement. Without limiting the foregoing, {SHOP.name} and its suppliers make no warranty that:
        </p>
        <Clause n="(a)" sub>
          the website, online service, other services or materials will meet the User&rsquo;s requirements;
        </Clause>
        <Clause n="(b)" sub>
          the website, online service, other services or materials will be uninterrupted, timely, secure, virus-free or error-free; or will be compatible with other
          software or applications to be used with or applied to;
        </Clause>
        <Clause n="(c)" sub>
          the results that may be obtained from the use of the website, online service or other services and materials will be effective, accurate or reliable;
        </Clause>
        <Clause n="(d)" sub>
          the quality of the website, online service, or any materials or other services will meet the User&rsquo;s expectations;
        </Clause>
        <Clause n="(e)" sub>
          any errors in any software obtained from or used through the website, online services, and materials, or any defects in the services or materials, will be
          corrected; or that
        </Clause>
        <Clause n="(f)" sub>
          the information provided will be accurate.
        </Clause>
        <p>This clause is about the website. The goods you buy come with the guarantees in the Terms of sale and the law.</p>
      </>
    ),
  },
  {
    id: "accuracy",
    title: "Accuracy of information",
    body: (
      <p>
        The User understands that when using this website and online services, the User will be exposed to content from a variety of sources. The website and online
        services and other services and materials could include technical or other mistakes, inaccuracies or typographical errors or offensive, indecent, or
        objectionable content. If the User does so object, the User should not use this website and/or the online services. {SHOP.name} may make changes to the website,
        online services, other services, information and materials at any time without notice. The information, services and materials may be out of date, and{" "}
        {SHOP.name} gives no undertaking of any manner whatsoever to update such information, services or materials. Any information contained on our website is
        intended for general information purposes only, and is not meant to be an endorsement or representation by {SHOP.name} or any other party, and should in no way
        be construed as professional advice. Any reliance the User places on any content is strictly at the User&rsquo;s own risk.
      </p>
    ),
  },
  {
    id: "modification",
    title: "Modification",
    body: (
      <>
        <p>{SHOP.name} reserves the right, in its sole discretion, to:</p>
        <Clause n="(a)" sub>
          change these terms and conditions without notice to the User;
        </Clause>
        <Clause n="(b)" sub>
          change the content and/or services available on or through the website;
        </Clause>
        <Clause n="(c)" sub>
          discontinue any aspect of the website or service(s) available from the website; and/or
        </Clause>
        <Clause n="(d)" sub>
          delete the website.
        </Clause>
        <p>
          The User is responsible for reviewing these terms and conditions each time it uses the website and online services. The User&rsquo;s continued use of the
          website and online services constitutes the User&rsquo;s agreement to the then current terms and conditions. A change does not reach back to an order you have
          already paid for: the version in force when you press Pay applies to that order, and we keep a record of which version it was. The date at the top of this page
          shows when the terms last changed.
        </p>
      </>
    ),
  },
  {
    id: "content-disputes",
    title: "Disputes regarding the content of the website",
    body: (
      <p>
        In the event of a dispute as to the content of these terms and conditions at any time, a certificate signed by the administrator responsible for maintaining the
        website shall be prima facie proof of the date of publication and content of the current version and all previous versions of these terms and conditions.
      </p>
    ),
  },
  {
    id: "agreement",
    title: "General terms",
    body: (
      <>
        <p>
          These Website Terms and Conditions, together with the Terms of sale and the Delivery terms below and our{" "}
          <Link className="inline-link" href="/privacy">Privacy Policy</Link>, set out the general rules and policies governing the User&rsquo;s use of our website.
          Depending on the User&rsquo;s activities when visiting our website, the User may be required to agree to additional terms and conditions. This agreement
          constitutes the entire agreement between the parties in respect of the subject matter hereof. In the event of the invalidity of any part or portion of this
          agreement for any reason whatsoever, such invalidity shall not affect the validity or enforceability of any other part or provision of this agreement and such
          invalid part or portion shall be deemed to have been struck out of the agreement. No waiver by {SHOP.name} in respect of the User&rsquo;s actions or omissions
          with regard to any breach, failure or default in performance by the User, and no failure, refusal or neglect by {SHOP.name} to exercise any right hereunder or
          to insist upon strict compliance with or performance of the User&rsquo;s obligations under this agreement, shall constitute a waiver of the provisions of this
          agreement, and {SHOP.name} may at any time require strict compliance with the provisions hereof.
        </p>
        <p>
          Emails, WhatsApp messages and the records our website keeps of your order count as writing between us, and our records of an order and its payment are proof
          of what was ordered and paid, unless shown to be wrong.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and jurisdiction",
    body: <p>These terms and conditions will be governed by and construed in accordance with the laws in force in the Republic of South Africa.</p>,
  },

  // ---- Part 2: the terms of sale ------------------------------------------
  {
    id: "definitions",
    part: "Terms of sale",
    title: "Definitions",
    body: (
      <>
        <p>
          <strong>General terms and conditions of sale between the Company and the Customer.</strong> These apply to every order placed with {SHOP.name} through this
          website, and to orders we take by WhatsApp, phone, email or at the shop.
        </p>
        <p>In these terms and conditions:</p>
        <Clause n="1.1">
          &ldquo;the/this Agreement&rdquo; means these General Terms and Conditions of Sale, incorporating, amongst other things, all quotes, Orders and Order
          Confirmations, and any terms and conditions applicable to any promotional offers of the Company, from time to time;
        </Clause>
        <Clause n="1.2">
          &ldquo;Business Day&rdquo; means any day other than a Saturday, Sunday or official public holiday in the Republic of South Africa;
        </Clause>
        <Clause n="1.3">
          &ldquo;CPA&rdquo; means the Consumer Protection Act No. 68 of 2008, and &ldquo;ECTA&rdquo; means the Electronic Communications and Transactions Act No. 25 of
          2002;
        </Clause>
        <Clause n="1.4">
          &ldquo;Company&rdquo; means {SHOP.name}, as identified in the table under General in the Website terms above; in these terms of sale &ldquo;we&rdquo;,
          &ldquo;us&rdquo; and &ldquo;our&rdquo; mean the Company;
        </Clause>
        <Clause n="1.5">
          &ldquo;Customer&rdquo; means any person who purchases or offers to purchase the Goods from the Company; in these terms of sale &ldquo;you&rdquo; and
          &ldquo;your&rdquo; mean the Customer;
        </Clause>
        <Clause n="1.6">
          &ldquo;Defective&rdquo; in relation to any Goods means:
        </Clause>
        <Clause n="1.6.1" sub>
          that such Goods are unsafe (as this term is defined in the CPA);
        </Clause>
        <Clause n="1.6.2" sub>
          that there is a Goods failure, defect or hazard in any such Goods (as these terms are defined in the CPA);
        </Clause>
        <Clause n="1.6.3" sub>
          that inadequate instructions or warnings have been provided to the Customer pertaining to any hazard arising from or associated with the use of such Goods; or
        </Clause>
        <Clause n="1.6.4" sub>
          that such Goods are not of good quality, do not work as they should, or are not what the Customer ordered;
        </Clause>
        <Clause n="1.7">
          &ldquo;Delivery&rdquo; means the delivery of the Goods by the Company to the Customer pursuant to the provisions of clause 6, or their collection by the
          Customer from the Company&rsquo;s shop;
        </Clause>
        <Clause n="1.8">
          &ldquo;Delivery Date&rdquo; means a date for Delivery which the Company has confirmed to the Customer in writing, by email or WhatsApp; where no date has
          been confirmed, none is promised;
        </Clause>
        <Clause n="1.9">
          &ldquo;Delivery Place&rdquo; means the place for Delivery of the Goods, which place shall be the address specified in the Order, or the Company&rsquo;s shop
          where the Customer chooses to collect;
        </Clause>
        <Clause n="1.10">
          &ldquo;Goods&rdquo; means any goods supplied by the Company to the Customer in terms of this Agreement and indicated on any of the Company&rsquo;s forms, price
          lists, quotations, Orders or Order Confirmations, including without limitation, any of the goods listed on the Company&rsquo;s website
          expressphotoandgifts.com;
        </Clause>
        <Clause n="1.11">
          &ldquo;Order&rdquo; means any order as contemplated in clause 3.1, placed by a Customer with the Company for the supply of the Goods;
        </Clause>
        <Clause n="1.12">
          &ldquo;Order Confirmation&rdquo; means the email sent by the Company to the Customer confirming an Order once it has been paid;
        </Clause>
        <Clause n="1.13">
          &ldquo;Parties&rdquo; means the Company and the Customer, collectively, and &ldquo;Party&rdquo; shall mean either one of them as the context may indicate;
        </Clause>
        <Clause n="1.14">
          &ldquo;Personalised Goods&rdquo; means Goods made to the Customer&rsquo;s specification or clearly personalised: printed with the Customer&rsquo;s photos or
          words, or cut, framed or finished to the Customer&rsquo;s choices;
        </Clause>
        <Clause n="1.15">
          &ldquo;Price&rdquo; means the price of the Goods and Delivery costs (if any) shown at checkout in South African rand, which includes VAT where VAT applies,
          and any other amounts which have been mutually agreed to by both Parties;
        </Clause>
        <Clause n="1.16">
          &ldquo;VAT&rdquo; means Value Added Tax levied in accordance with the provisions of the Value Added Tax Act No. 89 of 1991, as amended.
        </Clause>
      </>
    ),
  },
  {
    id: "price-payment",
    title: "Price and payment",
    body: (
      <>
        <Clause n="2.1">The Customer shall pay the Company the Price in respect of any Goods ordered. There are no other charges. The total on the Pay button is what you pay.</Clause>
        <Clause n="2.2">
          Payment is made through PayFast, a South African payment provider, using the methods PayFast offers you. Your card or bank details go to PayFast, never to us.
          An Order counts as paid only when PayFast confirms the payment to us directly and it matches the Order to the cent. Orders paid online start at R5.
        </Clause>
        <Clause n="2.3">
          The Customer undertakes to ensure that the card or account used has sufficient funds to cover the amount due, and that it is the Customer&rsquo;s own or the
          Customer is authorised to use it. The Customer further agrees that he/she will be liable for any claims, losses or damages of whatsoever nature in the event
          that the card or account
        </Clause>
        <Clause n="(i)" sub>
          has reached its maximum limit;
        </Clause>
        <Clause n="(ii)" sub>
          details provided are incorrect;
        </Clause>
        <Clause n="(iii)" sub>
          is held in the name of any other person without that person&rsquo;s authority; and/or
        </Clause>
        <Clause n="(iv)" sub>
          has expired.
        </Clause>
        <Clause n="2.4">
          Except as the law allows, such as where a payment was made fraudulently, the Customer shall not be entitled to reverse any payment made in terms of this
          clause 2, for any reason whatsoever, where such amount is legally owing by the Customer to the Company.
        </Clause>
        <Clause n="2.5">
          The Company does not start making an Order, and no Deliveries shall be made by the Company to the Customer, until it has received payment in full in respect
          of the Goods ordered by the Customer.
        </Clause>
        <Clause n="2.6">
          Prices may change from time to time. We check every price again on our server when you press Pay. If anything changed since you filled your cart (a price, a
          deal that ended or filled up, stock, or the courier&rsquo;s rate), checkout shows you the new total first, and nothing is charged until you pay that total.
        </Clause>
        <Clause n="2.7">
          If a price on the site is plainly wrong because of an obvious, unintended error, we aren&rsquo;t bound to sell at that price. We&rsquo;ll tell you and offer
          you the item at the right price or a full refund.
        </Clause>
        <Clause n="2.8">
          Deals apply as shown on the site while they run, between their stated dates (South African time), and while any stated limit on orders or units lasts. A
          deal we email you with a one-time code applies only when you enter that code at checkout. The code is made for that email, works once, on one Order, and is
          used up when that Order is paid (not when you enter it), so a payment that fails or is cancelled doesn&rsquo;t use it. It stops working when the deal ends,
          and it isn&rsquo;t given back if you later cancel or return the Order. A deal&rsquo;s value isn&rsquo;t paid out in cash, and it&rsquo;s worked out for the
          Order as paid. If you return part of an Order, the refund for that part is what you actually paid for it after the deal.
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
          Orders by the Customer for the Goods shall be made by the Customer online via our website expressphotoandgifts.com, or by WhatsApp, phone, email or at the
          shop. An account is optional. Any information the Customer provides shall be processed and stored by the Company in accordance with the Company&rsquo;s{" "}
          <Link className="inline-link" href="/privacy">Privacy Policy</Link>. Before you pay, checkout shows everything you&rsquo;re ordering, your photos as
          they&rsquo;ll be printed, your details and the full total, and you can go back and correct anything until you press Pay.
        </Clause>
        <Clause n="3.2">
          You must be 18 or older to order, or have the consent of a parent or guardian. You agree that the details you give us are true and that you&rsquo;re allowed to
          give them, including the name and number of anyone you send a gift to.
        </Clause>
        <Clause n="3.3">Subsequent to the Customer paying for an Order, the Customer will receive an Order Confirmation from the Company.</Clause>
        <Clause n="3.4">
          Subject to the Customer&rsquo;s rights in clause 9, the Company will not be responsible for any errors or misunderstandings that occur during the placing of an
          Order, or for the failure by the Customer to provide the Company with correct and accurate information when placing an Order or as set out on any quote or
          Order Confirmation.
        </Clause>
        <Clause n="3.5">
          The Customer confirms that the information given by it when placing an Order is accurate and complete. The Customer further agrees to update such information,
          failing which the Company will not be liable for any inaccuracies or lack of completeness of such information, or any consequential failure to deliver the
          Goods properly.
        </Clause>
        <Clause n="3.6">Pressing Pay is the Customer&rsquo;s offer to purchase the Goods in question at the Price shown.</Clause>
        <Clause n="3.7">
          <strong>The Company accepts an Order, and a contract is made, only once PayFast confirms the Customer&rsquo;s payment to us</strong> and the Company sends the
          Order Confirmation. Until then we may decline an Order, for example if something has sold out, a price was shown in error, or we can&rsquo;t print what was
          sent. If we decline or cancel an Order after you&rsquo;ve paid, we refund everything you paid. Orders we take by WhatsApp, phone or at the counter are
          confirmed when we tell you they are and you&rsquo;ve paid.
        </Clause>
        <Clause n="3.8">
          The Company shall be entitled to recover from the Customer any extra costs, including Delivery costs, incurred by the Company due, directly or indirectly, to
          the actions of the Customer including instances where the Customer:
        </Clause>
        <Clause n="3.8.1" sub>
          alters the Order after the Company has started making it, or upon or after Delivery; or
        </Clause>
        <Clause n="3.8.2" sub>
          refuses to accept Delivery notwithstanding that the Goods meet the specifications set out in the Order; or
        </Clause>
        <Clause n="3.8.3" sub>
          fails or delays to give full particulars needed by the Company; or
        </Clause>
        <Clause n="3.8.4" sub>
          otherwise delays the Order process.
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
          Keep your own copies of every photo you send. Uploading to us is not a backup. We keep the photos of an order made without an account for a year after you pay and then delete
          them; photos on an order that belongs to your account stay until you delete them in your account (see our{" "}
          <Link className="inline-link" href="/privacy#keeping">Privacy Policy</Link>). Once they are deleted we can&rsquo;t remake the order from them, so a
          fault reported after that may need you to send the photo again.
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
          zoom, turn, change to black and white or otherwise edit a photo, we print your edited version, and any words exactly as you typed them, spelling included.
          Please check everything on the review before you pay: we don&rsquo;t send separate proofs.
        </p>
        <p>
          We can only print as sharp as the photo you send: a photo with too few pixels for the size you chose will print soft, and that isn&rsquo;t a fault. If we
          think a photo is too small to print well we may contact you before we print, but we don&rsquo;t have to, and if you still want it printed we print it as
          supplied.
        </p>
        <Notice title="Colour, size and handmade differences">
          <p>
            Screens show colour differently from printed and sublimated products, and every material takes ink in its own way. Small differences in colour, brightness,
            contrast and placement between what you see on screen and the finished product are normal and aren&rsquo;t a defect. Sizes and weights given on the site are
            close measurements, not exact ones, and many products are finished by hand, so small variations from one item to the next are part of the product.
          </p>
        </Notice>
        <p>A frame is sold without a print unless your order includes one. Where the site offers the matching print beside a frame, you can add it.</p>
      </>
    ),
  },
  {
    id: "delivery",
    title: "Delivery",
    body: (
      <>
        <Clause n="6.1">
          Subject to clause 6.2, Delivery will be made in respect of Orders at the Delivery Place on any Delivery Date. Delivery will be made by the courier the Customer
          chooses at checkout, The Courier Guy, or by the Customer collecting the Goods from the Company&rsquo;s shop. The Delivery terms below say how each works.
        </Clause>
        <Clause n="6.2">
          Where the Delivery Place is not serviced by the courier, checkout will not offer a courier for it. In these circumstances the Customer may collect from the
          shop, or contact the Company to arrange an alternative address.
        </Clause>
        <Clause n="6.3">Collection from the shop is free. Delivery by courier is priced at checkout for the address and parcel, and shown before the Customer pays.</Clause>
        <Clause n="6.4">
          Delivery shall be deemed to have taken place when the Goods are handed over at the Delivery Place, or when the Customer, or someone the Customer sends with the
          order number, collects them.
        </Clause>
        <Clause n="6.5">
          Whilst every effort will be made to deliver the Goods in accordance with this clause, the Company shall not be liable for any loss and/or damage for failure to
          effect Delivery timeously for any reason beyond the Company&rsquo;s reasonable control, as contemplated in clause 12, and subject to the Customer&rsquo;s rights
          in clauses 9 and 10.
        </Clause>
      </>
    ),
  },
  {
    id: "risk",
    title: "Risk",
    body: (
      <>
        <Clause n="7.1">
          Subject to clause 7.2 below, risk in and to any Goods sold to the Customer shall pass to the Customer upon the Goods being delivered at the Delivery Place or
          collected, irrespective of whether ownership of the Goods still vests in the Company in terms of clause 8. Until then the Goods are the Company&rsquo;s
          responsibility.
        </Clause>
        <Clause n="7.2">
          The risk in the Goods shall immediately pass to the Customer if the Customer fails to take Delivery of the Goods ordered, or in any way delays the Delivery of
          Goods ordered, including by giving a wrong address or not collecting them.
        </Clause>
        <Clause n="7.3">
          Where Goods are returned in terms of clause 9 for a change of mind, risk remains with the Customer until the Goods reach the Company. Where Goods are
          Defective, risk in them returns to the Company when the Customer hands them to the courier or to the Company.
        </Clause>
      </>
    ),
  },
  {
    id: "title",
    title: "Ownership and retention of title",
    body: (
      <p>
        Until the Company has received payment in full of all sums owed to it on any account by the Customer, whether arising out of this Agreement or any other
        contract, legal and beneficial title in and to the Goods shall remain vested in the Company.
      </p>
    ),
  },
  {
    id: "returns",
    title: "Returns",
    body: (
      <>
        <Clause n="9.1">
          <strong>Defective goods:</strong> everything we sell, personalised or not, comes with the CPA&rsquo;s guarantee that it&rsquo;s of good quality, works as it
          should and matches what was ordered. If you find any of the Goods to be Defective, <strong>tell us within 6 months of delivery</strong>, and you choose whether
          we repair it, replace it (for Personalised Goods, remake it) or refund you. We cover the cost and risk of getting a faulty item back to us.
        </Clause>
        <Clause n="9.2">This includes:</Clause>
        <Clause n="(a)" sub>
          a fault in the materials or the making, such as a print that peels, a cracked mug or a frame that falls apart;
        </Clause>
        <Clause n="(b)" sub>
          our mistake: the wrong photo, the wrong product or size, a crop or edit other than the one you approved, or words different from the ones you typed;
        </Clause>
        <Clause n="(c)" sub>
          damage on the way to you.
        </Clause>
        <Clause n="9.3">
          <strong>How to tell us:</strong> {contact} with your order number, what&rsquo;s wrong and a photo or two of the item (and of the parcel, if it was damaged in
          delivery). For delivery damage, please tell us as soon as you can, ideally within 48 hours, and keep the packaging, so we can claim from the courier; this
          doesn&rsquo;t shorten your 6 months. We may need to see the item before we decide what went wrong, and we&rsquo;ll arrange for it to reach us at our cost.
        </Clause>
        <Clause n="9.4">
          <strong>Exclusions:</strong> please note that we cannot accept returns or offer refunds for Goods that have been subjected to abuse, misuse, improper use,
          negligence, accident, alteration, or tampering by the Customer. Customers are responsible for any damage caused under these conditions.
        </Clause>
        <Notice title="What isn’t a fault">
          <p>These aren&rsquo;t defects, and aren&rsquo;t grounds for a refund or a remake:</p>
          <ul>
            <li>a print that matches what you approved at checkout: the photo, crop, edit and words as you placed them;</li>
            <li>softness that comes from the photo you supplied;</li>
            <li>the small differences in colour, brightness and placement between a screen and a printed product, and between handmade items;</li>
            <li>normal wear and tear, or damage from an accident, misuse or not following the product&rsquo;s care instructions;</li>
            <li>an item that has been altered or repaired by someone other than us.</li>
          </ul>
        </Notice>
        <Clause n="9.5">
          If a repaired item fails again within 3 months of the repair, we&rsquo;ll replace it or refund you. After the 6 months, you still have the rights the common
          law gives you for hidden defects.
        </Clause>
        <Clause n="9.6">
          <strong>Incorrect orders placed by the Customer, or a change of mind:</strong> for Goods bought on this website that are not Personalised Goods, ECTA gives you
          a cooling-off period: <strong>you may cancel within 7 days of receiving the Goods, without giving a reason.</strong> Tell us within the 7 days, then return the
          item within a reasonable time, complete and in the condition you received it, in its packaging if you still have it. You may open it and look it over, but not use it. The only cost to you is the direct cost of returning it. You can
          bring it to the shop for free, or we can book The Courier Guy to collect it and take the courier&rsquo;s charge off your refund. We refund everything else you
          paid, including the original delivery, within 30 days of your cancellation, as clause 11 sets out.
        </Clause>
        <Notice title="What can’t be returned for a change of mind">
          <ul>
            <li>
              Personalised Goods: anything made to your specification or personalised, printed with your photos or words, cut, framed or finished to your choices. The law
              excludes these from the cooling-off period.
            </li>
            <li>Pierced earrings once they&rsquo;ve been taken off their backing card or out of sealed packaging, for hygiene reasons.</li>
            <li>Anything that has been used, damaged after delivery or isn&rsquo;t complete.</li>
          </ul>
          <p>None of this affects your rights when something is Defective or not what you ordered.</p>
        </Notice>
        <Clause n="9.7">
          <strong>Bought at the counter:</strong> the cooling-off period applies to online orders. For things bought in the shop, you&rsquo;re welcome to ask about
          swapping an unused item that wasn&rsquo;t made for you; we&rsquo;ll help where we can, but it&rsquo;s our choice rather than a right.
        </Clause>
        <Clause n="9.8">
          <strong>Sending something back:</strong> please talk to us before you send anything, so we can tell you where it goes and give you a reference. You can bring it
          to the shop at {SHOP.street}, {SHOP.town} during trading hours, or we can book The Courier Guy to collect it from you. For a change-of-mind return you send
          yourself, use a tracked service and keep the proof of posting: until it reaches us, it&rsquo;s your responsibility. For a faulty item, it&rsquo;s ours.
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
          To cancel an Order, {contact} with your order number as soon as you can. Cancelling by phone is fine too, but we&rsquo;ll confirm it in writing.
        </Clause>
        <Clause n="10.2">
          <strong>Personalised Goods:</strong> until we start making it, you can cancel for a full refund. Once we&rsquo;ve started printing or making it, you can still
          cancel, but because the item can&rsquo;t be sold to anyone else, we may keep a reasonable charge for the work and materials already used, up to the price of
          the items already made. Anything not yet started, and any delivery not yet booked, is refunded in full.
        </Clause>
        <Clause n="10.3">
          <strong>Products not made for you:</strong> frames, albums, easels, jewellery and other ready-made stock can be cancelled for a full refund at any time before
          we hand the order to the courier or you collect it. After that, see clause 9.6.
        </Clause>
        <Clause n="10.4">
          <strong>If we cancel:</strong> we may cancel an Order if something has sold out, a price was shown in obvious error, or we can&rsquo;t print what was sent (see
          clause 4). If we do, we&rsquo;ll tell you why and refund everything you paid for what we can&rsquo;t supply.
        </Clause>
        <Clause n="10.5">
          <strong>If it is late:</strong> ECTA entitles you to cancel your purchase on 7 days&rsquo; written notice if the Goods have not been delivered within 30 days
          of your order, or by the Delivery Date we confirmed to you in writing. If we haven&rsquo;t made your order ready to collect or handed it to the courier within
          30 days of payment, you may cancel it and we&rsquo;ll refund everything you paid. Should you choose to cancel an Order which has not been received within our
          delivery times, the Goods either need to be:
        </Clause>
        <Clause n="(a)" sub>
          not accepted, and returned with the courier upon delivery; or
        </Clause>
        <Clause n="(b)" sub>
          if already received, returned to the Company in their original state.
        </Clause>
        <Clause n="10.6">
          Email <EmailLink subject="Order cancellation" /> if you can, so there is a written record; a cancellation by WhatsApp or phone is confirmed back to you in
          writing. We will then refund you as set out in clause 11.
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
          <strong>Online orders</strong> are refunded through PayFast to the card or account you paid with. We can&rsquo;t refund to a different card or account, or in
          cash.
        </Clause>
        <Clause n="11.2">
          <strong>Counter purchases</strong> are refunded the way you paid.
        </Clause>
        <Clause n="11.3">
          We refund within 30 days of your cancellation (for a faulty item you send back, within 30 days of our receiving it), and usually much sooner. We email you when the refund is made; how soon it shows
          on your statement then depends on your bank.
        </Clause>
        <Clause n="11.4">
          When part of an Order is refunded and a deal applied to the Order, the refund for that part is what you actually paid for it after the deal.
        </Clause>
        <Clause n="11.5">
          Delivery is refunded when the whole Order is cancelled before it&rsquo;s sent, when you return it in the cooling-off period, and whenever the fault was ours.
        </Clause>
      </>
    ),
  },
  {
    id: "responsibility",
    title: "Our responsibility to you",
    body: (
      <>
        <Clause n="12.1">
          We make every order with care and stand behind it as clause 9 and the CPA require. Beyond that, and only as far as the law allows:
        </Clause>
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
        <Clause n="12.2">
          <strong>Business customers:</strong> if you buy for a business that the CPA doesn&rsquo;t protect (such as a company with an annual turnover or asset value of
          R2 million or more), the limits above apply in full, and any warranty not set out in these terms is excluded as far as the law allows.
        </Clause>
      </>
    ),
  },
  {
    id: "complaints",
    title: "Complaints and disputes",
    body: (
      <>
        <Clause n="13.1">
          If something isn&rsquo;t right, talk to us first: most things are sorted out at the counter or with one message. If we can&rsquo;t resolve a complaint between
          us, you may refer it to the Consumer Goods and Services Ombud (cgso.org.za), the National Consumer Commission (thencc.org.za) or your provincial consumer protection office, or, for a privacy complaint, to
          the Information Regulator (see our <Link className="inline-link" href="/privacy#complaints">Privacy Policy</Link>).
        </Clause>
        <Clause n="13.2">
          You and we agree that a Magistrate&rsquo;s Court with jurisdiction may hear any dispute, even where the amount would otherwise exceed its limit.
        </Clause>
      </>
    ),
  },

  // ---- Part 3: the delivery terms -----------------------------------------
  {
    id: "delivery-options",
    part: "Delivery terms",
    title: "Our delivery options",
    body: (
      <>
        <p>
          We want getting your order to be as easy as possible. At checkout you choose between these:
        </p>
        <Facts
          rows={[
            ["Collect from the shop", `Free, at ${SHOP.street}, ${SHOP.town}, during trading hours. We email you when your order is ready.`],
            [
              "Courier",
              "The Courier Guy, to your door or straight to the person a gift is for, anywhere in South Africa it serves. Priced at checkout; the price shown is what you pay.",
            ],
          ]}
        />
        <p>
          Courier prices aren&rsquo;t a fixed list. The Courier Guy prices each parcel by where it&rsquo;s going and its size and weight, and your order is packed into
          the smallest box that holds it, or into more than one parcel when it doesn&rsquo;t fit, all priced together. Checkout shows the services available for your
          address and what each costs before you pay.
        </p>
        <p>
          For more information on delivery, {contact}.
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
          you at least 14 days&rsquo; notice. If it&rsquo;s still not collected after that, we may dispose of Personalised Goods without a refund, since they were made
          for you and can&rsquo;t be sold to anyone else. Anything else in the order we will refund, less the reasonable cost of having kept it.
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
          The services, prices and times shown at checkout come from The Courier Guy for your address and parcel. Delivery times are the courier&rsquo;s estimates,
          counted from when it collects the parcel from us once your order is made, and aren&rsquo;t guaranteed by us.
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
          is to help us help you: it doesn&rsquo;t shorten your rights under the CPA, and we will put it right as clause 9 of the Terms of sale sets out.
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
        <h3>How long will my order take to arrive?</h3>
        <p>
          We start making your order once it&rsquo;s paid. How long it takes depends on the product and how busy we are, so if you need it by a date, ask us before you
          order (the product page has a button for it). <strong>A date is only promised if we confirm it to you in writing</strong>, by email or WhatsApp. Courier
          delivery then takes the time the courier quotes at checkout for your address, and regional and outlying areas can expect a longer delivery time than main
          areas.
        </p>
        <p>
          We email you the tracking number once the courier has collected your parcel from us. Your order&rsquo;s progress, from our making it to the courier&rsquo;s delivery, can then be
          viewed at any point via the &ldquo;Track my order&rdquo; link in your order emails.
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
          From time to time stock runs short, or a supplier fails us. Should a product you have ordered be:
        </p>
        <Clause n="(a)" sub>
          <strong>Temporarily unavailable:</strong> we will notify you thereof as well as the anticipated delay in delivery (if possible) and, unless you agree to wait
          for such longer period for delivery, or accept delivery of another product instead, we will issue a refund in respect of that product to you, equal to the
          price paid for it.
        </Clause>
        <Clause n="(b)" sub>
          <strong>Discontinued or permanently unavailable:</strong> we will notify you and, unless you agree to accept another product instead, we will issue a refund
          in respect of that product to you, equal to the price paid for it.
        </Clause>
        <p>
          Delivery fees will not be refunded if the unavailable item(s) are part of an order which includes items that will still be delivered. If you have been charged
          for a parcel that is no longer needed, that charge is refunded.
        </p>
        <h3>Areas not yet served</h3>
        <p>
          If checkout offers no courier for your address, the courier may not serve your specific area yet. Please contact us and we will try our best to arrange
          delivery to you. Regrettably, this will not always be possible, and you can always collect from the shop.
        </p>
        <h3>Late orders</h3>
        <p>
          If your order is not delivered within the period agreed, you may cancel it as clause 10.5 of the Terms of sale sets out.
        </p>
      </>
    ),
  },
];
