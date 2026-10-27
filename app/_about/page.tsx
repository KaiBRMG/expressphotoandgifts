import "../site/chrome.css";
import "./about.css";

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmailLink, PhoneLink, WhoWeAre } from "@/app/site/Legal";
import { OrderDock } from "@/app/site/OrderDock";
import { ProductImage } from "@/app/site/ProductImage";
import { SiteFooter } from "@/app/site/SiteFooter";
import { SiteHeader, type NavItem } from "@/app/site/SiteHeader";
import { JsonLdScript } from "@/app/site/JsonLdScript";
import { ArrowRight, Pin, WhatsApp } from "@/app/site/icons";
import { ABOUT, CATEGORIES, GIFTS, HOURS, LEGAL, SHOP } from "@/app/site/data";
import { whatsappLink } from "@/lib/contact";
import { shopContact } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About us",
  description: `${SHOP.name} is a photo printing and gift shop in ${SHOP.town}, KwaZulu-Natal: who we are, what we make, how an order works, where to find us and the promises we make.`,
  alternates: { canonical: "/about" },
};

/** Day-long, like the footer's colophon, which reads the year. */
export const revalidate = 86400;

const NAV: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/all", label: "All products" },
  { href: "#find-us", label: "Find Us" },
];

const JUMP = [
  { id: "story", label: "Our story" },
  { id: "make", label: "What we make" },
  { id: "how", label: "How an order works" },
  { id: "visit", label: "Visit us" },
  { id: "promises", label: "Our promises" },
  { id: "business", label: "Business details" },
];

/** Six photo gifts: the puzzle, tile, board, keyring, snow globe and mug. */
const MAKES = [GIFTS[0], GIFTS[1], GIFTS[2], GIFTS[3], GIFTS[6], GIFTS[8]];

/** The shelves that sell things, in the homepage's order: Gift Wrapping and Specials are left to the homepage. */
const SHELVES = CATEGORIES.filter((c) => !["gift-wrapping", "specials"].includes(c.slug));

/** The gaps the shop has yet to fill are marked in development and on previews, and left off the live page. */
const SHOW_GAPS = process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";

/**
 * The About page: who the shop is, said once and plainly, with the things a
 * customer, PayFast or a lawyer looks for. Every claim here is one the site
 * already makes: the terms of sale, the privacy policy, the checkout and the
 * product pages. Change one, change the other. What the shop has yet to
 * supply is `ABOUT` and `LEGAL` in `app/site/data.ts`; an empty field is
 * left off, never guessed (`Gap` marks it off the live site).
 */
export default async function AboutPage() {
  const contact = await shopContact();
  const dateAsk = whatsappLink(contact, "Hi! I’d like to know if you can have an order ready by…");
  const businessAsk = whatsappLink(contact, "Hi! I’m ordering for a business, school or club and would like to talk about…");

  return (
    <>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "@id": `${SHOP.url}/about#webpage`,
          url: `${SHOP.url}/about`,
          name: `About ${SHOP.name}`,
          inLanguage: "en-ZA",
          isPartOf: { "@id": `${SHOP.url}/#website` },
          about: { "@id": `${SHOP.url}/#organization` },
          mainEntity: { "@id": `${SHOP.url}/#store` },
        }}
      />
      <SiteHeader nav={NAV} />

      <main id="main" className="about">
        {/* ---- The sign ------------------------------------------------- */}
        <section className="about__top">
          <div className="about__sign on-dark">
            <h1 className="about__signTitle">
              <span className="about__signLine">A real shop</span>{" "}
              <span className="about__signLine">
                in <span className="about__gold">{SHOP.town}</span>
              </span>
            </h1>
            <p className="about__signLede">
              About {SHOP.name}. We put your own photos on gifts and frames, and sell online and over the counter at {SHOP.street}.
            </p>
          </div>

          <nav className="about__jump shell" aria-label="On this page">
            <ul>
              {JUMP.map((j) => (
                <li key={j.id}>
                  <a href={`#${j.id}`}>{j.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {/* ---- Our story ------------------------------------------------ */}
        <section className="about__sec shell" id="story" aria-labelledby="story-h">
          <h2 id="story-h" className="h2 about__h">
            Our story
          </h2>
          <div className="about__story">
            <div className="about__prose">
              <p>
                {SHOP.name} is a photo printing and gift shop. We print your own photos and words on mugs, puzzles, keyrings, snow globes, tiles and more, and we sell
                frames, albums and jewellery too, online across South Africa and from our shop at {SHOP.street}, {SHOP.town}.
              </p>
              <p>
                There is a real counter behind this website. You can collect your order for free, look at the frame finishes in person, or message us before you
                order.
              </p>
              {ABOUT.story?.map((p) => <p key={p}>{p}</p>)}
              {ABOUT.visit ? <p>{ABOUT.visit}</p> : null}
              {!ABOUT.story && <Gap field="ABOUT.story">How the shop started, and why photos and gifts: one or two short paragraphs.</Gap>}
              {!ABOUT.visit && <Gap field="ABOUT.visit">What a visit to the counter is like.</Gap>}

              {ABOUT.ownerName || ABOUT.opened ? (
                <dl className="about__who">
                  {ABOUT.ownerName ? (
                    <div>
                      <dt>{ABOUT.ownerRole ?? "Run by"}</dt>
                      <dd>{ABOUT.ownerName}</dd>
                    </div>
                  ) : null}
                  {ABOUT.opened ? (
                    <div>
                      <dt>Opened</dt>
                      <dd className="about__mono">{ABOUT.opened}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              {!ABOUT.ownerName && <Gap field="ABOUT.ownerName and ownerRole">Who runs the shop.</Gap>}
              {!ABOUT.opened && <Gap field="ABOUT.opened">The year the shop opened.</Gap>}
            </div>

            {ABOUT.shopPhoto ? (
              <figure className="about__photo">
                <ProductImage code={ABOUT.shopPhoto.code} alt={ABOUT.shopPhoto.alt} width={640} height={640} sizes="(min-width: 62rem) 26rem, 90vw" />
              </figure>
            ) : (
              <Gap field="ABOUT.shopPhoto" photo>
                A photograph of the shop or its people, filed in Cloudinary under products/&lt;code&gt;.
              </Gap>
            )}
          </div>
        </section>

        {/* ---- What we make --------------------------------------------- */}
        <section className="about__sec about__make shell" id="make" aria-labelledby="make-h">
          <h2 id="make-h" className="h2 about__h">
            Your photo, on a gift
          </h2>
          <p className="lede">
            Mugs, puzzles, keyrings, snow globes, tiles and more, each printed with a photo you upload. Frames, albums and jewellery sit on the same shelves.
          </p>

          <ul className="about__prints">
            {MAKES.map((print) => (
              <li key={print.src}>
                <ProductImage code={print.src} alt={print.alt} width={640} height={640} sizes="(min-width: 75rem) 200px, (min-width: 46rem) 30vw, 44vw" />
                <span>{print.label}</span>
              </li>
            ))}
          </ul>

          <ul className="about__shelves" aria-label="Shelves in the shop">
            {SHELVES.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- How an order works --------------------------------------- */}
        <section className="about__how on-dark" id="how" aria-labelledby="how-h">
          <div className="shell about__howGrid">
            <div>
              <h2 id="how-h" className="h2 about__h">
                How an order works
              </h2>
              <p className="about__marked">
                <span className="marked">You see your photos in place before you pay.</span>
              </p>
            </div>

            <div>
              <ol className="about__steps">
                <li>
                  <span className="about__n" aria-hidden="true">
                    1
                  </span>
                  <h3>Choose it</h3>
                  <p>Pick a product and a size. Prices are in rand, and the total on the Pay button is what you pay.</p>
                </li>
                <li>
                  <span className="about__n" aria-hidden="true">
                    2
                  </span>
                  <h3>Add your photos</h3>
                  <p>
                    At checkout each photo goes into its place at the print&rsquo;s real size and shape. It goes in whole, and is cropped only if you crop it.
                  </p>
                </li>
                <li>
                  <span className="about__n" aria-hidden="true">
                    3
                  </span>
                  <h3>Pay securely</h3>
                  <p>Pay through PayFast. Your card details go to PayFast, never to us. We start making your order once it is paid.</p>
                </li>
                <li>
                  <span className="about__n" aria-hidden="true">
                    4
                  </span>
                  <h3>Collect it, or have it couriered</h3>
                  <p>
                    Collect it free from the shop, and we email you when it is ready. Or The Courier Guy brings it to your door, or straight to the person it is for,
                    priced at checkout, with a tracking number by email.
                  </p>
                </li>
              </ol>

              <p className="about__date">
                {ABOUT.makeTime ?? "Need it by a date? Ask before you order. A date is promised only when we confirm it to you in writing."}{" "}
                <a className="inline-link" href={dateAsk} target="_blank" rel="noreferrer">
                  Ask about a date on WhatsApp
                </a>
              </p>
              {!ABOUT.makeTime && <Gap field="ABOUT.makeTime" dark>How long an order takes to make, if the shop will keep to it.</Gap>}
            </div>
          </div>
        </section>

        {/* ---- Visit us ------------------------------------------------- */}
        <section className="about__sec shell" id="visit" aria-labelledby="visit-h">
          <h2 id="visit-h" className="h2 about__h">
            Come and see us
          </h2>
          <div className="about__visit">
            <div>
              <h3 className="about__h3">
                <Pin size={20} />
                The shop
              </h3>
              <address className="about__address">
                {SHOP.street}
                <br />
                {SHOP.town}
                <br />
                {SHOP.region}
                <br />
                {SHOP.postcode}
              </address>
              <a className="about__go" href={SHOP.mapsUrl} target="_blank" rel="noreferrer">
                Get directions
                <ArrowRight size={17} />
              </a>

              <table className="about__hours">
                <caption className="visually-hidden">Opening hours</caption>
                <tbody>
                  {HOURS.map((row) => (
                    <tr key={row.days} data-closed={row.closed ? "true" : "false"}>
                      <th scope="row">{row.days}</th>
                      <td>{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="about__prose">
              <h3 className="about__h3">Collecting an order</h3>
              <p>
                Collection is free, during trading hours. We email you when your order is ready. Bring your order number: someone you send can collect it with the
                number too.
              </p>
              <h3 className="about__h3">Not near {SHOP.town}?</h3>
              <p>
                We courier anywhere in South Africa The Courier Guy serves. Checkout shows the services and what each costs for your address before you pay, and
                every courier parcel is covered up to R1,000 at no extra cost.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Our promises --------------------------------------------- */}
        <section className="about__sec about__promises shell" id="promises" aria-labelledby="promises-h">
          <h2 id="promises-h" className="h2 about__h">
            What we promise
          </h2>
          <div>
            <p className="lede">The short version. The full wording is in the terms and the privacy policy, and where they differ from this page, they count.</p>
            <ul className="about__ledger">
              <li>
                <h3>Prices and payment</h3>
                <p>
                  Every price is in rand, and nothing is added at the end. We check the price again when you press Pay, and nothing is charged until you have seen the
                  total. Orders are paid through PayFast.
                </p>
                <Link className="inline-link" href="/terms#price-payment">
                  Price and payment
                </Link>
              </li>
              <li>
                <h3>Delivery</h3>
                <p>
                  Collect free, or have The Courier Guy deliver, priced for your address at checkout. Delivery times are the courier&rsquo;s estimates. We promise a
                  date only when we confirm it to you in writing.
                </p>
                <Link className="inline-link" href="/terms#delivery-options">
                  Delivery terms
                </Link>
              </li>
              <li>
                <h3>Cancelling and changing your mind</h3>
                <p>
                  Something made with your photo or words can be cancelled for a full refund until we start making it, but it cannot be returned for a change of mind,
                  because it cannot be sold to anyone else. Anything else you buy online can be returned within 7 days of receiving it.
                </p>
                <Link className="inline-link" href="/terms#returns">
                  Returns and cancellations
                </Link>
              </li>
              <li>
                <h3>If something is wrong</h3>
                <p>
                  If an item arrives faulty, damaged or not what you ordered, tell us within 6 months. You choose a repair, a replacement or a refund, and we cover
                  getting it back to us. Refunds go back to the card or account you paid with, within 30 days and usually much sooner.
                </p>
                <Link className="inline-link" href="/terms#refunds">
                  Refunds
                </Link>
              </li>
              <li>
                <h3>Your photos</h3>
                <p>
                  They stay yours. We use them only to make, deliver and support your order. Without an account we delete them a year after you pay. With an account,
                  they stay until you delete them.
                </p>
                <Link className="inline-link" href="/privacy#keeping">
                  How long we keep them
                </Link>
              </li>
              <li>
                <h3>If we cannot sort it out</h3>
                <p>
                  Talk to us first, and most things are sorted with one message. If we cannot, you can take a complaint to the Consumer Goods and Services Ombud or
                  the National Consumer Commission, or about your personal information to the Information Regulator.
                </p>
                <Link className="inline-link" href="/terms#complaints">
                  Complaints and disputes
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* ---- Business details ----------------------------------------- */}
        <section className="about__sec about__business shell" id="business" aria-labelledby="business-h">
          <h2 id="business-h" className="h2 about__h">
            Who is behind the shop
          </h2>
          <div className="about__businessGrid">
            <div>
              <WhoWeAre extra={[["Information Officer", LEGAL.informationOfficer]]} />
              {!LEGAL.registeredName && <Gap field="LEGAL.registeredName, legalForm, registrationNumber, vatNumber, informationOfficer">The business&rsquo;s registered details (ECTA s43).</Gap>}
            </div>

            <div className="about__prose">
              <h3 className="about__h3">Ordering for a business, school or club?</h3>
              <p>
                {ABOUT.businessCustomers ??
                  "Corporate gifts are one of the things we make. Tell us what you need and how many, and we will say what we can do."}
              </p>
              <p>
                <a className="btn btn--blue" href={businessAsk} target="_blank" rel="noreferrer">
                  <WhatsApp size={18} />
                  Message us on WhatsApp
                </a>
              </p>
              <p>
                Or email <EmailLink subject="Business order" />, or call <PhoneLink />.
              </p>
              {!ABOUT.businessCustomers && <Gap field="ABOUT.businessCustomers">How bulk orders work, once the shop has confirmed that line.</Gap>}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <OrderDock />
    </>
  );
}

/**
 * A fact the shop has yet to supply, named by the field in `app/site/data.ts`
 * that holds it. Drawn as an empty photo place is (a dashed blue outline on a
 * faint wash) in development and on previews only; on the live page nothing
 * stands here, because a trust page that says "coming soon" is worse than a
 * shorter one.
 */
function Gap({ field, children, photo, dark }: { field: string; children: ReactNode; photo?: boolean; dark?: boolean }) {
  if (!SHOW_GAPS) return null;
  return (
    <p className={`about__gap${photo ? " about__gap--photo" : ""}${dark ? " about__gap--dark" : ""}`}>
      <strong>To supply:</strong> {children} <span className="about__mono">{field}</span>
    </p>
  );
}
