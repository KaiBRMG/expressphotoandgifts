import type { Metadata } from "next";
import Link from "next/link";

import { Clause, EmailLink, Facts, LegalPage, Phones, type LegalSection } from "@/app/site/Legal";
import { LEGAL, SHOP } from "@/app/site/data";

export const metadata: Metadata = {
  title: "PAIA Manual",
  description: `${SHOP.name}’s manual under section 51 of the Promotion of Access to Information Act: the records it holds, how to request them, and how it processes personal information.`,
  alternates: { canonical: "/paia-manual" },
};

/**
 * The PAIA manual (section 51), as the shop's document of 20 November 2026
 * words it (`ExpressPhoto_PAIA_Manual.docx`, version 1.0). Not one of the
 * policies customers agree to, so it is not in `POLICY_LINKS`, the footer,
 * the sitemap or `/llms.txt`, and does not move `POLICIES_VERSION`: the
 * privacy policy's Your rights clause is its only link. 9.4 names where data
 * is held, as the privacy policy does (Firestore `africa-south1`; Cloudinary
 * in the United States). Change a particular or a provider, change this page
 * and its version line.
 */
export default function PaiaManualPage() {
  return <LegalPage title="PAIA Manual" dated={DATED} lede={LEDE} sections={SECTIONS} />;
}

const VERSION = { n: "1.0", iso: "2026-11-20", label: "20 November 2026" };

const DATED = (
  <>
    Version {VERSION.n} · Prepared <time dateTime={VERSION.iso}>{VERSION.label}</time>
  </>
);

const NAME = LEGAL.registeredName ?? SHOP.name;
const ADDRESS = `${SHOP.street}, ${SHOP.town}, ${SHOP.province}, ${SHOP.postcode}, ${SHOP.country}`;

const LEDE = (
  <>
    {NAME}, trading as {SHOP.name}. Prepared under section 51 of the Promotion of Access to Information Act 2 of 2000 (PAIA), as amended.
  </>
);

const SECTIONS: LegalSection[] = [
  {
    id: "purpose",
    title: "Purpose and scope",
    body: (
      <>
        <p>
          This manual explains which categories of records {NAME} (the Company) holds, how a person may request access to those records, and how the Company processes
          personal information. It is prepared in accordance with section 51 of PAIA, read with relevant provisions of the Protection of Personal Information Act 4 of
          2013 (POPIA).
        </p>
        <p>
          PAIA allows access to a private body’s records where required for the exercise or protection of rights, subject to the applicable procedures and lawful grounds
          for refusal. This manual does not make confidential records generally available or override privacy, commercial confidentiality or other statutory protections.
        </p>
      </>
    ),
  },
  {
    id: "particulars",
    title: "Company and Information Officer particulars",
    body: (
      <Facts
        rows={[
          ["Legal entity", LEGAL.registeredName],
          ["Trading name", SHOP.name],
          ["Company registration", LEGAL.registrationNumber],
          ["Business / street address", ADDRESS],
          ["Registered office", ADDRESS],
          ["Postal address", ADDRESS],
          ["Telephone", <Phones key="phones" />],
          ["Website", "https://www.expressphotoandgifts.com"],
          ["General / privacy email", <EmailLink key="email" />],
          ["Head of private body / Information Officer", LEGAL.informationOfficer],
          ["PAIA request email", <EmailLink key="paia" subject="PAIA request" />],
          ["Deputy Information Officer", "Not appointed"],
        ]}
      />
    ),
  },
  {
    id: "guide",
    title: "Information Regulator’s PAIA Guide",
    body: (
      <p>
        The Information Regulator publishes a Guide explaining how to use PAIA, how to lodge access requests and the available remedies. The Guide and prescribed forms
        can be obtained from the Information Regulator’s website at{" "}
        <a className="inline-link" href="https://inforegulator.org.za">
          inforegulator.org.za
        </a>{" "}
        or its eServices portal at{" "}
        <a className="inline-link" href="https://eservices.inforegulator.org.za">
          eservices.inforegulator.org.za
        </a>
        . Assistance may also be requested from the Company’s Information Officer.
      </p>
    ),
  },
  {
    id: "available",
    title: "Records available without a formal PAIA request",
    body: (
      <>
        <p>
          The Company makes the following records available through its website or on ordinary enquiry, without requiring a formal PAIA application where they are
          publicly available: product descriptions and advertised prices; published{" "}
          <Link className="inline-link" href="/terms">
            Terms and Conditions
          </Link>
          ;{" "}
          <Link className="inline-link" href="/privacy">
            Privacy Policy
          </Link>
          ; this PAIA Manual; and ordinary business contact information. This list describes ordinary public availability and is not a section 52 notice unless formally
          published as such.
        </p>
        <p>Other records are not automatically available merely because they fall within a category listed in this manual.</p>
      </>
    ),
  },
  {
    id: "legislation",
    title: "Records maintained under other legislation",
    body: (
      <>
        <p>
          Depending on the Company’s activities and applicable statutory thresholds, the Company may retain records to comply with the Companies Act 71 of 2008, Income
          Tax Act 58 of 1962, Value-Added Tax Act 89 of 1991 (if registered), Tax Administration Act 28 of 2011, Consumer Protection Act 68 of 2008, Electronic
          Communications and Transactions Act 25 of 2002, Basic Conditions of Employment Act 75 of 1997 and applicable labour legislation, PAIA and POPIA.
        </p>
        <p>
          Listing legislation does not mean that a particular category of records exists or that records must be disclosed irrespective of the exemptions and refusal
          grounds in PAIA.
        </p>
      </>
    ),
  },
  {
    id: "records",
    title: "Subjects and categories of records held",
    body: (
      <Facts
        rows={[
          ["Corporate and governance", "Company registration and statutory filings; ownership and director records; resolutions; business licences and supplier contracts, where applicable."],
          ["Finance and tax", "Invoices, transaction and payment confirmations, bookkeeping records, returns, accounting statements and correspondence with tax or financial advisers."],
          ["Customers and orders", "Customer contact and delivery details; orders and artwork instructions; invoices, refunds, customer service messages, delivery status and complaints."],
          [
            "Photographs and artwork",
            "Customer-uploaded photographs and edited files required for printing, associated production files and design specifications, subject to retention and deletion practices.",
          ],
          ["Website and IT", "Website administration and security records; account and access data; technical logs; records of service-provider arrangements and relevant system configurations."],
          ["Staff and suppliers", "Employment, payroll and recruitment files (if applicable); supplier details, service agreements, invoices and related communications."],
          ["Legal and compliance", "Terms and policies, requests under PAIA/POPIA, consumer complaints, legal correspondence and statutory compliance records."],
        ]}
      />
    ),
  },
  {
    id: "request",
    title: "How to request access to a record",
    body: (
      <>
        <Clause n="7.1">
          A requester should use the prescribed PAIA Form 2 (Request for Access to Record), available from the Information Regulator, and send it to the Information
          Officer using the contact details in <a className="inline-link" href="#particulars">section 2</a>. The form should identify the record requested, the right
          sought to be exercised or protected, why the record is required for that right, the preferred form of access and the requester’s contact details.
        </Clause>
        <Clause n="7.2">
          Where the requester acts for another person, proof of authority may be required. We may reasonably verify identity to protect personal information and prevent
          unauthorised disclosure. Requests for a person’s own personal information may also be handled under POPIA, as appropriate.
        </Clause>
        <Clause n="7.3">
          A request for a private-body record may be granted only where PAIA’s requirements are met. The Company will consider applicable grounds for mandatory or
          discretionary refusal, including protection of third-party personal information, confidential commercial information, privileged records and safety or
          security interests. Third parties will be consulted where the Act requires.
        </Clause>
        <Clause n="7.4">
          The Information Officer will notify the requester of the decision within the period prescribed by PAIA, ordinarily 30 days after receipt of a compliant request,
          subject to any lawful extension. If access is granted, the prescribed access or reproduction fees may apply before release.
        </Clause>
        <Clause n="7.5">
          Applicable request, search, access and reproduction fees are those prescribed in the PAIA regulations, as amended from time to time. A requester seeking their
          own personal information is not liable for a PAIA request fee where the prescribed exemption applies. The Company will provide a fee notice where required; no
          discretionary administrative fee is imposed by this manual.
        </Clause>
      </>
    ),
  },
  {
    id: "remedies",
    title: "Refusals, complaints and remedies",
    body: (
      <>
        <p>
          Where the Company refuses access, it will state the relevant legal grounds and describe the available remedies. A person dissatisfied with the response, or with
          a failure to respond in the prescribed time, may complain to the Information Regulator or approach a competent court, subject to applicable procedures and time
          limits. There is ordinarily no internal PAIA appeal against a private body’s decision.
        </p>
        <Facts
          rows={[
            [
              "Information Regulator",
              <a key="w" className="inline-link" href="https://inforegulator.org.za">
                inforegulator.org.za
              </a>,
            ],
            [
              "Email",
              <a key="e" className="inline-link" href="mailto:enquiries@inforegulator.org.za">
                enquiries@inforegulator.org.za
              </a>,
            ],
            ["Phone", "010 023 5200"],
          ]}
        />
        <p>The Regulator’s website provides complaint procedures and the prescribed complaint form.</p>
      </>
    ),
  },
  {
    id: "popia",
    title: "Processing of personal information under POPIA",
    body: (
      <>
        <h3>9.1 Purposes of processing</h3>
        <p>
          The Company processes personal information to receive and produce photo and gift orders; operate customer accounts; receive payment confirmations; arrange
          collection or courier delivery; address customer questions, returns and complaints; maintain security and prevent abuse; maintain business and tax records; and
          conduct lawful communications and optional marketing.
        </p>

        <h3>9.2 Categories of data subjects and information</h3>
        <Facts
          rows={[
            [
              "Customers and gift recipients",
              "Names, contact details, addresses and delivery instructions; account and order details; submitted photographs, designs and messages; correspondence, payment references and refunds.",
            ],
            [
              "Website visitors and account users",
              "Device/browser and connection information, necessary cookies or local storage information, account identifiers and usage records as described in the Privacy Policy.",
            ],
            ["Employees / applicants (if applicable)", "Contact and identification information, applications, employment and payment records."],
            ["Suppliers and representatives", "Business contacts, contractual details, invoices, payment and correspondence records."],
            ["People appearing in uploaded photos", "Images and any personal information that may be apparent from the submitted photograph."],
          ]}
        />

        <h3>9.3 Recipients and service providers</h3>
        <p>
          Where necessary, information may be shared with authorised staff and service providers handling payments (including PayFast), courier delivery (including The
          Courier Guy / Shiplogic), website hosting (Vercel), authentication and order records (Google Firebase), photo storage (Cloudinary), transactional email
          (Resend), and communications (including WhatsApp / Meta where used). Tax advisers, professional advisers, regulators or law-enforcement authorities may receive
          data where lawfully necessary. Provider roles and actual integrations should be rechecked periodically against the{" "}
          <Link className="inline-link" href="/privacy#disclosure">
            Privacy Policy
          </Link>
          .
        </p>

        <h3>9.4 Cross-border transfers</h3>
        <p>
          The Company’s order and account database (Google Firebase) is stored in South Africa. Certain technology or communications providers may store, access or
          process information outside South Africa, including Cloudinary, which stores uploaded photographs in the United States. The Company will assess and implement an
          applicable transfer basis under section 72 of POPIA for relevant transfers, taking account of contractual and other appropriate safeguards. The specific
          destinations and contractual protections depend on the providers and configurations actually in use.
        </p>

        <h3>9.5 General security measures</h3>
        <p>
          The Company uses or seeks to maintain proportionate organisational and technical safeguards such as access controls, password-protected user accounts,
          role-based staff access, protected communications, service-provider controls, secure handling of payment flows, reasonable retention practices and
          incident-response procedures. The Company will review the effectiveness of its controls and investigate suspected security compromises in accordance with POPIA.
          This summary is not a guarantee that any system is immune to security incidents.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability, languages and updates",
    body: (
      <>
        <p>
          A copy of this manual will be made available free of charge on the Company website, for inspection at its principal place of business during ordinary business
          hours, and upon reasonable request to the Information Officer, subject to any prescribed reproduction fees for physical copies. The Company will comply with any
          applicable language and publication requirements and will review this manual when material details or practices change.
        </p>
        <p>
          This manual should be read together with the Company’s{" "}
          <Link className="inline-link" href="/privacy">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link className="inline-link" href="/terms">
            Terms and Conditions
          </Link>
          . If those documents conflict with applicable law, the law prevails.
        </p>
      </>
    ),
  },
  {
    id: "approval",
    title: "Publication approval",
    body: (
      <>
        <Facts
          rows={[
            ["Approved for", NAME],
            ["Approved by", LEGAL.directors ? `${LEGAL.directors} (Director)` : null],
            ["Approval date", VERSION.label],
          ]}
        />
        <p>
          Useful official resources:{" "}
          <a className="inline-link" href="https://eservices.inforegulator.org.za/paiamanuals/">
            eservices.inforegulator.org.za/paiamanuals
          </a>{" "}
          (private-body template and upload portal);{" "}
          <a className="inline-link" href="https://inforegulator.org.za">
            inforegulator.org.za
          </a>{" "}
          (PAIA Guide, forms, fees and complaints).
        </p>
      </>
    ),
  },
];
