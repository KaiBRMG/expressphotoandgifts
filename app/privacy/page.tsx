import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmailLink, Facts, LegalPage, Notice, PhoneLink, type LegalSection } from "@/app/site/Legal";
import { LEGAL, SHOP } from "@/app/site/data";
import { policyTitle } from "@/lib/legal";

export const metadata: Metadata = {
  title: policyTitle("/privacy"),
  description: `How ${SHOP.name} collects, uses, shares and protects your personal information, and your rights under POPIA.`,
  alternates: { canonical: "/privacy" },
};

/**
 * The privacy policy (POPIA), in the usual order of a South African online
 * shop's. Written from what the code keeps and sends: the order
 * (`orders/{ref}`), saved details (`customers/{uid}`), marketing consent
 * (`marketing/{uid}`, and `subscribers/{emailHash}` for an email-only sign-up), one-time deal codes (`campaignCodes/{code}`, the recipient as an email hash), photos in Cloudinary swept
 * after `SWEEP_AFTER_DAYS` when unpaid, and after `GUEST_PHOTO_DAYS` when paid on
 * no account (an account's are kept until its customer deletes them), the device's storage (`epg:cart`,
 * `epg:code`, `epg:photos`, `epg:details`, `track:*`), the customer cookie, Vercel's
 * cookie-free analytics with query strings stripped, and the shop's day
 * counters, which hold counts only. Nothing here claims call recording,
 * advertising, AI or a group of companies, because the shop has none. Change
 * what is collected or who receives it, change this page, and move
 * `POLICIES_VERSION` on. `#keeping` and `#complaints` are linked from the terms.
 */
export default function PrivacyPage() {
  return <LegalPage path="/privacy" lede={LEDE} sections={SECTIONS} />;
}

const LEDE = <>We respect your privacy. Please read the full privacy policy because it applies to you.</>;

/** A clause's plain-language gist, set after the clause in the way the template does. */
const Gist = ({ children }: { children: ReactNode }) => <p className="legal__gist">{children}</p>;

const SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: (
      <>
        <p>
          Welcome to our privacy policy. We are {SHOP.name}
          {LEGAL.registeredName ? ` (${LEGAL.registeredName})` : ""}
          {LEGAL.registrationNumber ? ` (Registration number: ${LEGAL.registrationNumber})` : ""}, {SHOP.street}, {SHOP.town}, {SHOP.province}, {SHOP.postcode}, and this is
          our plan of action when it comes to protecting your privacy. We respect your privacy and take the protection of personal information very seriously. The
          purpose of this policy is to describe the way that we collect, store, use and protect information that can be associated with you or another specific natural
          or juristic person and can be used to identify you or that person (personal information). We are the responsible party for it under the Protection of
          Personal Information Act (POPIA).
        </p>
        <p>
          {LEGAL.informationOfficer ? <>Our Information Officer is {LEGAL.informationOfficer}. You can reach them</> : <>You can reach our Information Officer</>} at <EmailLink /> or on <PhoneLink />{" "}
          about anything in this policy.
        </p>
        <Gist>The purpose of this policy is to describe the way that we handle your personal information.</Gist>
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
          <li>a customer who has ordered or requested the goods or services that we provide.</li>
        </ul>
        <Gist>This policy applies to you under certain circumstances.</Gist>
      </>
    ),
  },
  {
    id: "personal-information",
    title: "Personal information",
    body: (
      <>
        <p>Personal information includes:</p>
        <ul>
          <li>certain information that we collect automatically when you visit our website;</li>
          <li>certain information collected on registration (see below);</li>
          <li>certain information collected on submission, when you place an order or send us a request; and</li>
          <li>optional information that you provide to us voluntarily (see below);</li>
        </ul>
        <p>but excludes:</p>
        <ul>
          <li>information that has been made anonymous so that it does not identify a specific person;</li>
          <li>permanently de-identified information that does not relate or cannot be traced back to you specifically;</li>
          <li>non-personal statistical information collected and compiled by us; and</li>
          <li>
            information that you have provided voluntarily in an open public environment or forum, including any social media post, comment or review (because the
            information has been disclosed in a public forum it is no longer confidential and does not constitute personal information subject to protection under this
            policy).
          </li>
        </ul>
        <Gist>
          Personal information includes information we collect (i) automatically when you visit our website, (ii) on registration, (iii) on submission and (iv) from you
          voluntarily. It excludes (i) anonymous, (ii) de-identified, (iii) non-personal statistical and (iv) public information.
        </Gist>
      </>
    ),
  },
  {
    id: "examples",
    title: "Common examples",
    body: (
      <>
        <p>Common examples of the types of personal information which we may collect and process include your:</p>
        <ul>
          <li>identifying information – such as your first name and surname;</li>
          <li>contact information – such as your mobile number or email address;</li>
          <li>address information – such as your delivery address; or</li>
          <li>
            your photos – the pictures you upload to be printed, which can show people, including children, and places.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "sensitive",
    title: "Sensitive personal information",
    body: (
      <>
        <p>
          We do not ask for your identity number, date of birth, race or ethnicity, health, beliefs or any other sensitive personal information, and we don&rsquo;t
          knowingly collect it. Depending on the goods you order, though, the photos you send us may happen to show something of that kind. If they do, we use them only
          to print them and to check the print.
        </p>
        <p>
          Payment information is NOT stored by {SHOP.name}. Your card or bank details are entered with, and held by, our payment provider PayFast, and never reach us.
        </p>
      </>
    ),
  },
  {
    id: "acceptance",
    title: "Acceptance",
    body: (
      <>
        <h3>Acceptance required</h3>
        <p>
          You must accept all the terms of this policy when you order our goods or request our services. If you do not agree with anything in this policy, then you may
          not order our goods or request our services.
        </p>
        <Gist>You may not order our goods or request our services if you do not accept this policy.</Gist>
        <h3>Legal capacity</h3>
        <p>
          You may not order our goods or request our services if you are younger than 18 years old or do not have legal capacity to conclude legally binding contracts,
          unless a parent or guardian consents, as our <Link className="inline-link" href="/terms">Terms</Link> allow. Photos of children are welcome on our products when
          they come from a parent or guardian, or with their consent, as our <Link className="inline-link" href="/terms#photos">Terms</Link> ask, and we use them only to
          make the order.
        </p>
        <h3>Deemed acceptance</h3>
        <p>By accepting this policy, you are deemed to have read, understood, accepted, and agreed to be bound by all of its terms.</p>
        <h3>Your obligations</h3>
        <p>
          You may only send us your own personal information or the information of another data subject where you have their permission to do so. That includes a gift
          recipient&rsquo;s name and mobile number, and anyone who appears in a photo you upload.
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
        <p>
          Once you make an account (by ticking &ldquo;Save my details for next time&rdquo; at checkout or by signing up on our website), you will no longer be anonymous to us. You
          will provide us with certain personal information when you do. This personal information will include:
        </p>
        <ul>
          <li>your first name and surname;</li>
          <li>your email address;</li>
          <li>your mobile number;</li>
          <li>your street address, suburb, town, province and postal code, if you save them; and</li>
          <li>your password, which is held by Firebase in a form nobody at the shop can read.</li>
        </ul>
        <p>
          We will use this personal information to fulfil your account, provide additional services and information to you as we reasonably think appropriate, and for any
          other purposes set out in this policy.
        </p>
        <Gist>We collect certain information on registration when you register on our website.</Gist>

        <h3>On order or request</h3>
        <p>
          When you order our goods or request our services from us, you will be asked to provide us with additional information (goods or services information). Some of it
          is needed to make and deliver your order, and some you give on a voluntary basis:
        </p>
        <ul>
          <li>your contact details: first name, surname, email address and mobile number, for every order;</li>
          <li>delivery details, when you choose courier delivery: the street address, suburb, town, province, postal code and any delivery notes;</li>
          <li>
            a gift recipient&rsquo;s name and mobile number, when you send an order straight to someone else. Please only give us these if the person would expect it; we
            use them only to deliver to them;
          </li>
          <li>your photos, and any words or notes you add to be printed or to tell us about an item; and</li>
          <li>what you tell us when you email, phone, WhatsApp or visit the shop.</li>
        </ul>
        <p>
          We also keep what you ordered and paid, any deals that applied, delivery and tracking events, refunds and the emails we sent you. We get PayFast&rsquo;s
          confirmation of the payment (its reference, amount and status), never your card details. We keep which version of our terms you agreed to when you paid, and
          when. When we email you a deal with a one-time code, we keep that code against a one-way scrambled version of your email (a hash), and, once you use it, the
          order it was used on, so a code works only once.
        </p>
        <Gist>We collect certain information when you order goods or request our services from us.</Gist>

        <h3>From browser</h3>
        <p>
          Our server automatically receives your Internet Protocol address (IP address) with every request, as every website does, along with your browser and device
          type and the page you asked for and where you came from. We use your IP address briefly to stop abuse (limits on uploads and payments), and we don&rsquo;t store
          it with your order. Our hosting company, Vercel, also gives us visit statistics (Vercel Web Analytics) as totals: pages viewed, where visitors came from, device
          type and country. We strip order numbers and links from page addresses before they&rsquo;re counted, and pages inside your account aren&rsquo;t counted at all.
          Please note that other websites visited before entering our website might place personal information within your URL during a visit to it, and we have no control
          over such websites. Accordingly, a subsequent website that collects URL information may log some personal information.
        </p>
        <p>
          We also keep our own counters of how many visits looked at a product, added to the cart and reached each step of checkout, and the words of searches that found
          nothing. These are daily totals with nothing that identifies you.
        </p>
        <Gist>We collect certain information from your web browser, including your Internet usage information when you visit our website.</Gist>

        <h3>Cookies</h3>
        <p>
          We may place small text files called &lsquo;cookies&rsquo;, and keep small notes in your browser&rsquo;s storage, on your device when you visit our website. We
          use no advertising or tracking cookies. What our site stores on your device is there to make the shop work for you, and serves a number of useful purposes:
        </p>
        <ul>
          <li>a sign-in cookie, only once you sign in to an account, which keeps you signed in for up to two weeks or until you sign out;</li>
          <li>your cart, and a discount code you entered at checkout, so they survive a reload or a closed tab (the code is cleared once your order is paid);</li>
          <li>your checkout in progress: the order number and a secret key that proves it is yours, which photo goes where and your edits, cleared after 10 days;</li>
          <li>
            the details you typed at checkout (name, email, mobile and address), so you don&rsquo;t retype them if you leave and come back. They&rsquo;re cleared once your
            order is paid or you sign out; and
          </li>
          <li>a note, for this visit only, of which steps our counters have already counted, so each is counted once.</li>
        </ul>
        <p>
          Your internet browser generally accepts cookies automatically, but you can often change this setting to stop accepting them. You can also delete cookies and
          stored site data manually. The shop still works without them, but no longer accepting cookies or deleting them means you&rsquo;ll need to fill things in again and
          will prevent you from signing in. Many websites use cookies and you can find out more about them at www.allaboutcookies.org.
        </p>
        <Gist>We collect certain information from cookies that we may send to your computer to try and give you a personalised experience.</Gist>

        <h3>Third party cookies</h3>
        <p>
          We add no third-party cookies ourselves. Some of our business partners, such as PayFast whose payment window opens from our checkout, may use their own cookies
          or widgets while you use them. We have no access to or control over them. Information collected by any of those cookies or widgets is governed by the privacy
          policy of the company that created it and not by us.
        </p>

        <h3>Web beacons</h3>
        <p>
          Our website does not use advertising pixels or web beacons, and no advertiser receives anything from it. Any electronic image viewed as part of a web page can act
          as a web beacon; the only counting we do is Vercel&rsquo;s cookie-free page counts and our own daily totals above, which do not collect, gather, monitor or share
          any of your personal information. We merely use them to compile anonymous information about our website.
        </p>
        <Gist>We collect certain information from our visit counters to compile anonymous information about our website.</Gist>

        <h3>Optional details</h3>
        <p>
          You may also provide additional information to us on a voluntary basis (optional information). This includes the notes you add to an order, the details you
          choose to save to your account, your agreement to receive marketing email, and anything you send us when you respond to a promotion or otherwise use the optional
          features and functionality of our website.
        </p>
        <Gist>We collect certain optional information that you provide when you save details to your account, add notes or sign up to our marketing email.</Gist>

        <h3>Purpose for collection</h3>
        <p>
          We may use or process any goods or services information, or optional information that you provide to us, for the purposes that you indicated when you agreed to
          provide it to us. Processing includes gathering your personal information, disclosing it, and combining it with other personal information. We generally collect
          and process your personal information for various purposes, including:
        </p>
        <ul>
          <li>
            goods or services purposes – such as collecting orders or requests for and providing our goods or services: to price an order, take payment, print it, tell you
            when it&rsquo;s ready, deliver it, give you its tracking, and handle any return, refund or complaint;
          </li>
          <li>marketing purposes – such as pursuing lawful related marketing activities, if you agreed to marketing email;</li>
          <li>
            business purposes – such as internal audit, accounting, business planning, keeping the site and payments secure, preventing fraud and abuse, and disposals of
            the business, or other proposed and actual transactions; and
          </li>
          <li>legal purposes – such as handling claims, keeping sales and payment records for tax, complying with regulations, or pursuing good governance.</li>
        </ul>
        <p>We may use your usage information for the purposes described above and to:</p>
        <ul>
          <li>remember your information so that you will not have to re-enter it during your visit or the next time you access the website;</li>
          <li>monitor website usage metrics such as total number of visitors and pages accessed, and which products and pages work, from totals rather than from individuals; and</li>
          <li>make sure a one-time deal code we emailed you is used only once, through the record described above.</li>
        </ul>
        <Gist>We may use any of your personal information that you provide to us for the purposes that you indicated when you agreed to provide it to us.</Gist>

        <h3>Consent to collection</h3>
        <p>We will obtain your consent to collect personal information:</p>
        <ul>
          <li>in accordance with applicable law;</li>
          <li>when you tick the box at checkout, make an account or provide us with any registration information or optional information.</li>
        </ul>
        <Gist>We will get your consent to collect your personal information in accordance with applicable law when you provide us with it.</Gist>

        <h3>Updating or removing</h3>
        <p>
          You may choose to correct or update the personal information you have submitted to us by signing in to your account, where your saved details are edited in
          place, or by contacting us by phone or email. You may delete the photos kept for any of your orders there too, once the order has arrived. You may also close your account yourself on the same page, with your password to confirm; that deletes your
          sign-in, your saved details, your marketing record (including an email-only subscription to the same address) and the photos of your orders. The orders themselves are kept as our sales records, no longer linked to an
          account, and still carry the name, contact and delivery details you gave when you ordered; tax law requires us to keep them (see Retention). (An order that
          is still on its way has to arrive first.)
        </p>
        <Gist>You may choose to update or remove the personal information you have submitted to us.</Gist>
      </>
    ),
  },
  {
    id: "use",
    title: "Use",
    body: (
      <>
        <h3>Our obligations</h3>
        <p>We may use your personal information to fulfil our obligations to you.</p>

        <h3>Messages and updates</h3>
        <p>
          We may send administrative messages and email updates to you about the website: your order, its delivery, a refund or your account. Those aren&rsquo;t marketing;
          we send them because you placed an order or made an account. In some cases, we may also send you primarily promotional messages, but only if you have agreed to
          them. At the foot of our pages you can give us your email address; we send a link to it, and you are only on the list once you tap it, so nobody can sign you up
          without your knowing. We record when and where you agreed. You can choose to opt out of promotional messages at any time, free of charge, with the unsubscribe link in
          every one of them, by replying &ldquo;unsubscribe&rdquo;, emailing <EmailLink subject="Unsubscribe" />, switching marketing off in your account or telling us at the
          shop. We&rsquo;ll keep a note that you opted out, so we don&rsquo;t email you again by mistake.
        </p>
        <Gist>We may use your information to send you administrative messages and email updates regarding the website, and for marketing purposes where lawful.</Gist>

        <h3>Targeted content</h3>
        <p>
          We do not display targeted adverts based on your personal information, we don&rsquo;t build profiles of you for advertising, and we don&rsquo;t make decisions
          about you by automated means alone. We never share personal information with any advertiser.
        </p>
        <Gist>We do not use your information for targeted content.</Gist>
      </>
    ),
  },
  {
    id: "disclosure",
    title: "Disclosure",
    body: (
      <>
        <h3>Sharing</h3>
        <p>We may share your personal information with:</p>
        <ul>
          <li>our employees, as set out below;</li>
          <li>
            our goods or services providers under contract who help provide certain goods or services or help with parts of our business operations, including payment,
            delivery, storage, email and technology services (our contracts dictate that these goods or services providers only use your information in connection with
            the goods or services they supply or services they perform for us and not for their own benefit). Each acts on our instructions and must keep your information
            secure and confidential, as POPIA requires of an operator. They are:
            <ul>
              <li>
                <strong>PayFast</strong>, South Africa, to take your payment: your name, email, mobile, order number and amount;
              </li>
              <li>
                <strong>The Courier Guy</strong> (on its Shiplogic platform), South Africa, to price, deliver and track courier orders: the delivery address and notes when
                you ask for a delivery price, and, once booked, the name, mobile and (for your own delivery) email of the person receiving it, and the order number;
              </li>
              <li>
                <strong>Google Firebase</strong>, which may be outside South Africa, to store orders, accounts and saved details, and to sign you in: your order and
                account details;
              </li>
              <li>
                <strong>Cloudinary</strong>, outside South Africa, to store the photos you upload so we can print them (your photos and any edited versions made at
                checkout), and to deliver the product pictures on our pages, which every visitor&rsquo;s browser fetches from it (so it receives the IP address);
              </li>
              <li>
                <strong>Resend</strong>, outside South Africa, to send order, delivery, refund and account emails: your email address, name and the details of your order;
              </li>
              <li>
                <strong>Vercel</strong>, outside South Africa, to host the website and count visits without cookies: what every website receives with a visit, such as your
                IP address, browser and device type, the page and where you came from;
              </li>
              <li>
                <strong>WhatsApp (Meta)</strong>, outside South Africa, only if you message us on WhatsApp: your number and the messages and photos you send us there.
              </li>
            </ul>
          </li>
          <li>other third parties who provide us with relevant services where appropriate.</li>
        </ul>
        <Gist>We may share your personal information with third parties for the purposes of fulfilling our obligations to you among other purposes.</Gist>

        <h3>Use of AI</h3>
        <p>
          We do not use artificial intelligence (AI) to process your photos, your order information or your account, to personalise what you see on our platform, or to make
          decisions about you. If that changes, we will update this policy before it does.
        </p>

        <h3>Regulators</h3>
        <p>We may disclose your personal information as required by law or governmental audit, for example to SARS.</p>

        <h3>Law enforcement</h3>
        <p>We may disclose personal information if required:</p>
        <ul>
          <li>by a subpoena or court order;</li>
          <li>to comply with any law;</li>
          <li>to protect the safety of any individual or the general public; and</li>
          <li>to prevent violation of our customer relationship terms.</li>
        </ul>
        <Gist>We may disclose personal information to third parties if required for legal reasons.</Gist>

        <h3>No selling</h3>
        <p>
          We will not sell or rent personal information. No personal information will be disclosed to anyone except as provided in this privacy policy.
        </p>

        <h3>Marketing purposes</h3>
        <p>
          We use aggregate statistics (information about the customer population in general terms) ourselves, to see which products and pages work. We do not give
          advertisers or anyone else information about individual customers.
        </p>

        <h3>Employees</h3>
        <p>
          We may need to disclose personal information to our employees that require the personal information to do their jobs. These include the people who take, print,
          pack and deliver orders, handle payments and refunds, keep our accounts, and look after our website. Staff sign in to our admin only through named accounts, and
          changes to an order are logged against the person who made them.
        </p>

        <h3>Change of ownership</h3>
        <p>
          If we undergo a change in ownership, or a merger with, acquisition by, or sale of assets to, another entity, we may assign our rights to the personal information
          we process to a successor, purchaser, or separate entity, who would have to keep to this policy. We will disclose the transfer on the website. If you are
          concerned about your personal information migrating to a new owner, you may request us to delete your personal information.
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
          We take the security of personal information very seriously and always do our best to comply with applicable data protection laws. Our hosting company will host
          our website in a secure server environment that uses a firewall and other advanced security measures to prevent interference or access from outside intruders. We
          authorize access to personal information only for those employees who require it to fulfil their job responsibilities.
        </p>
        <Notice title="Keep your order link private">
          <p>
            The &ldquo;Track my order&rdquo; link in your emails shows the order, its delivery address and progress to whoever holds it, so treat it like a password and
            don&rsquo;t post it publicly. On a shared device, finish or empty your checkout and sign out when you&rsquo;re done: until then the device remembers the details
            you typed.
          </p>
        </Notice>
        <Gist>Our website is hosted on a secure server and uses security measures to prevent interference by intruders.</Gist>
      </>
    ),
  },
  {
    id: "accurate",
    title: "Accurate and up to date",
    body: (
      <>
        <p>
          We will try to keep the personal information we collect as accurate, complete and up to date as is necessary for the purposes defined in this policy. From time to
          time we may request you to update your personal information on the website. You are able to review or update any personal information that we hold on you by
          accessing your account online, emailing us, or phoning us. Please note that in order to better protect you and safeguard your personal information, we take steps
          to verify your identity before granting you access to your account or making any corrections to your personal information.
        </p>
        <Gist>Please keep your personal information accurate and up to date by accessing your account online, emailing us or phoning us.</Gist>
      </>
    ),
  },
  {
    id: "keeping",
    title: "Retention",
    body: (
      <>
        <p>We will only retain your personal information for as long as it is necessary to fulfil the purposes explicitly set out in this policy, unless:</p>
        <ul>
          <li>retention of the record is required or authorised by law; or</li>
          <li>you have consented to the retention of the record.</li>
        </ul>
        <p>In practice:</p>
        <ul>
          <li>
            photos from a checkout that was never paid are deleted automatically 14 days after the last upload, and your browser forgets that checkout after 10 days;
          </li>
          <li>
            photos of a paid order made without an account are kept with the order so we can remake it if something goes wrong in delivery or under its
            guarantee (6 months from delivery), and are deleted automatically one year after you paid. If you ask us sooner, we delete them sooner. The order record
            itself stays (see below). If you make an account within that year, the order joins it and its photos are kept as below;
          </li>
          <li>
            photos on an order that belongs to your account are kept until you delete them: in your account, on any order, whenever you like (once the order has
            arrived), or all together when you close your account. We don&rsquo;t delete them for you;
          </li>
          <li>
            order and payment records, which include your name, contact and delivery details, are kept for at least five years after the order, because tax law requires
            us to keep them, even if you close your account;
          </li>
          <li>your account and saved details are kept until you ask us to close the account;</li>
          <li>a record that you agreed to, or opted out of, marketing is kept for as long as we might email you, and to show we respected your choice (closing your account deletes it, and we stop emailing you). An address that asked for a confirmation link and never tapped it is not on the list, and the request is deleted once the link has expired; and</li>
          <li>daily visit totals contain nothing personal and may be kept indefinitely.</li>
        </ul>
        <p>
          During the period of retention, we will continue to abide by our non-disclosure obligations and will not share or sell your personal information. We may retain
          your personal information in physical or electronic records at our discretion. When we no longer need information, we delete it or remove anything that identifies
          you.
        </p>
        <Gist>We will only retain your personal information for as long as is necessary.</Gist>
      </>
    ),
  },
  {
    id: "transfer",
    title: "Transfer to another country",
    body: (
      <>
        <p>
          We may transmit or transfer personal information outside of the country in which it was collected to a foreign country and process it in that country. Personal
          information may be stored on servers located outside the country in which it was collected, as the providers listed above do. We use only established providers
          bound by agreements and laws that give your information protection substantially similar to POPIA&rsquo;s, as section 72 of POPIA requires, but the laws of that
          country regarding processing of personal information may be less stringent than ours. You consent to us processing your personal information in a foreign country
          for the reasons set out here.
        </p>
        <Gist>We may transfer your personal information outside the country in which it was collected to a foreign country.</Gist>
      </>
    ),
  },
  {
    id: "measures",
    title: "Data security measures",
    body: (
      <>
        <p>
          We take the security of your personal information very seriously. We have implemented technical and organisational measures to protect your personal information
          from unauthorized access, disclosure, alteration, or destruction. These measures include:
        </p>
        <ul>
          <li>Secure connection: an encrypted (HTTPS) connection for every page;</li>
          <li>Payments: handled by PayFast, so card details never reach us;</li>
          <li>Passwords: held by Firebase in a form nobody at the shop can read;</li>
          <li>Secure storage: a database closed to browsers, reachable only through our own server;</li>
          <li>Access controls: staff access through named accounts only, with changes to orders logged against the person who made them;</li>
          <li>Photo uploads: each needs a one-time signature from our server, and order links can&rsquo;t be guessed.</li>
        </ul>
        <p>
          <strong>Please note:</strong> while we strive to protect your personal information, no security measures are perfect, and we cannot guarantee the complete
          security of any information you provide to us. If we believe your personal information has been accessed by someone without authority, we&rsquo;ll tell you and
          the Information Regulator as soon as reasonably possible, as POPIA requires.
        </p>
        <p>Additionally, you can play a role in protecting your information by:</p>
        <ul>
          <li>choosing a strong password and keeping it confidential;</li>
          <li>signing out of your account when you are finished using it, especially on a shared device;</li>
          <li>being cautious about the information you share online, and keeping your order link to yourself.</li>
        </ul>
        <Gist>By using our website, you agree to these data security measures.</Gist>
      </>
    ),
  },
  {
    id: "limitation",
    title: "Limitation",
    body: (
      <p>
        We are not responsible for, give no warranties, nor make any representations in respect of the privacy policies or practices of linked or any third-party websites.
      </p>
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
          <li>withdraw a consent you gave, which doesn&rsquo;t affect what was done before; and</li>
          <li>complain to the Information Regulator.</li>
        </ul>
        <p>
          To use any of these, email <EmailLink /> or come to the shop. We may ask you to prove who you are before we act, so we don&rsquo;t hand your information to
          someone else, and we&rsquo;ll respond within a reasonable time, normally 30 days. Asking for your information costs nothing. Some records, like orders we must
          keep for tax, can&rsquo;t be deleted before their time, and we&rsquo;ll tell you if that applies. Requests for records under the Promotion of Access to
          Information Act (PAIA) can be made the same way.
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
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We&rsquo;ll update this policy when what we collect or who we share it with changes, and change the date at the top. If a change materially affects how we use
        information you&rsquo;ve already given us, we&rsquo;ll tell you by email before it applies.
      </p>
    ),
  },
  {
    id: "enquiries",
    title: "Enquiries",
    body: (
      <p>
        If you have any questions or concerns arising from this privacy policy or the way in which we handle personal information, please contact us at <EmailLink />, on{" "}
        <PhoneLink />, or at the shop, {SHOP.street}, {SHOP.town}.
      </p>
    ),
  },
];
