import "./chrome.css";
import "./legal.css";

import Link from "next/link";
import type { ReactNode } from "react";

import { POLICIES_VERSION, POLICY_LINKS, policiesDate, policyTitle, type PolicyPath } from "@/lib/legal";
import { shopContact } from "@/lib/settings";
import { LEGAL, SHOP } from "./data";
import { OrderDock } from "./OrderDock";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader, type NavItem } from "./SiteHeader";

const NAV: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/all", label: "All products" },
  { href: "#find-us", label: "Find Us" },
];

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
  /** Starts a new part of the page, with this name above it; the numbering begins again at 1, as a contract's parts do. */
  part?: string;
};

/** A clause's number, as the contents and its heading both show it, so a customer can say "clause 7". */
const Num = ({ n }: { n: number }) => (
  <span className="legal__n" aria-hidden="true">
    {n}
  </span>
);

/** The sections with their numbers, and grouped by part for the contents. A page with no parts is one group. */
function arranged(sections: LegalSection[]) {
  const parts: { name?: string; items: (LegalSection & { n: number })[] }[] = [];
  for (const s of sections) {
    if (s.part || !parts.length) parts.push({ name: s.part, items: [] });
    const items = parts[parts.length - 1].items;
    items.push({ ...s, n: items.length + 1 });
  }
  return parts;
}

/**
 * One of the shop's three policies: the header's blue carried into a title
 * band that links all three, then the contents beside one 62ch column of
 * numbered sections. The contents list holds still on a wide screen; on a
 * phone it is a list at the top. Each section is its own anchor, so an email
 * or the checkout can link straight to the clause it means. A long agreement
 * can be set in parts (`LegalSection.part`), each numbered from 1, and open
 * with an unnumbered `intro`.
 */
export function LegalPage({ path, lede, intro, sections }: { path: PolicyPath; lede: ReactNode; intro?: ReactNode; sections: LegalSection[] }) {
  const parts = arranged(sections);
  return (
    <>
      <SiteHeader nav={NAV} />
      <main id="main" className="legal">
        <header className="shelfhead legalhead on-dark">
          <div className="shell">
            <nav aria-label="Shop policies" className="legalhead__policies">
              <ul>
                {POLICY_LINKS.map((p) => (
                  <li key={p.href}>
                    <Link href={p.href} aria-current={p.href === path ? "page" : undefined}>
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <h1 className="shelfhead__title">{policyTitle(path)}</h1>
            <p className="legalhead__lede">{lede}</p>
            <p className="legalhead__date">
              Last updated <time dateTime={POLICIES_VERSION}>{policiesDate()}</time>
            </p>
          </div>
        </header>

        <div className="shell legal__grid">
          <nav className="legal__toc" aria-labelledby="legal-toc">
            <h2 id="legal-toc" className="legal__toc-title">
              On this page
            </h2>
            {parts.map((part) => (
              <div key={part.name ?? "all"}>
                {part.name ? <h3 className="legal__toc-part">{part.name}</h3> : null}
                <ol>
                  {part.items.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`}>
                        <Num n={s.n} />
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </nav>

          <article className="legal__body">
            {intro ? <div className="legal__intro">{intro}</div> : null}
            {parts.flatMap((part) =>
              part.items.map((s, i) => [
                i === 0 && part.name ? (
                  <h2 key={`${s.id}-part`} className="legal__part">
                    {part.name}
                  </h2>
                ) : null,
                <section key={s.id} id={s.id} className="legal__section" aria-labelledby={`${s.id}-h`}>
                  <h2 id={`${s.id}-h`} className="legal__h">
                    <Num n={s.n} />
                    {s.title}
                  </h2>
                  {s.body}
                </section>,
              ]),
            )}
            <Questions />
          </article>
        </div>
      </main>
      <SiteFooter />
      <OrderDock />
    </>
  );
}

/**
 * A numbered sub-clause, as a contract sets them out ("2.1 The Customer shall…"),
 * so a customer can say clause 9.1. `sub` sets it in under its parent, for
 * (a), (b) and 1.6.1.
 */
export function Clause({ n, sub, children }: { n: string; sub?: boolean; children: ReactNode }) {
  return (
    <p className={sub ? "legal__clause legal__clause--sub" : "legal__clause"}>
      <span className="legal__cn">{n}</span>
      <span>{children}</span>
    </p>
  );
}

/** The shop's email, as a link. */
export async function EmailLink({ subject }: { subject?: string }) {
  const { email } = await shopContact();
  return (
    <a className="inline-link" href={`mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`}>
      {email}
    </a>
  );
}

/** The shop's number, as a link: it takes calls and WhatsApp alike. */
export async function PhoneLink() {
  const { phoneE164, phoneDisplay } = await shopContact();
  return (
    <a className="inline-link" href={`tel:+${phoneE164}`}>
      {phoneDisplay}
    </a>
  );
}

/** The close of every policy: a real person at a real counter. */
function Questions() {
  return (
    <aside className="legal__ask" aria-label="Questions about this policy">
      <p className="legal__ask-title">Questions about any of this?</p>
      <p>
        Email <EmailLink />, call or WhatsApp <PhoneLink />, or come and see us at {SHOP.street}, {SHOP.town}.
      </p>
    </aside>
  );
}

/**
 * A clause that limits the shop's liability, puts a risk on the customer or
 * asks them to indemnify the shop. The Consumer Protection Act (s49) asks for
 * these to be drawn to the customer's attention conspicuously, before they
 * agree, so each is set apart and marked in amber.
 */
export function Notice({ title = "Please read this carefully", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="legal__notice" role="note">
      <p className="legal__notice-title">{title}</p>
      {children}
    </div>
  );
}

/** Facts as a ledger, a label to each; a row with no value is left out. */
export function Facts({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="legal__facts">
      {rows
        .filter(([, value]) => value != null)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** The business, as ECTA s43 asks for it. Registration and VAT numbers show only once there are some. */
export function WhoWeAre({ extra = [] }: { extra?: [label: string, value: ReactNode][] }) {
  return (
    <Facts
      rows={[
        ["Trading name", SHOP.name],
        ["Registered name", LEGAL.registeredName],
        ["Legal form", LEGAL.legalForm],
        ["Registration number", LEGAL.registrationNumber],
        ["VAT number", LEGAL.vatNumber],
        ["Shop and address for legal notices", `${SHOP.street}, ${SHOP.town}, ${SHOP.province}, ${SHOP.postcode}, ${SHOP.country}`],
        ["Phone and WhatsApp", <PhoneLink key="phone" />],
        ["Email", <EmailLink key="email" />],
        ["Website", "expressphotoandgifts.com"],
        ...extra,
      ]}
    />
  );
}
