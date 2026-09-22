import { Fragment } from "react";

import Image from "next/image";
import Link from "next/link";
import "./home.css";

import { Carousel } from "./site/Carousel";
import { Newsletter } from "./site/Newsletter";
import { Motion } from "./site/Motion";
import { OrderDock } from "./site/OrderDock";
import { ServiceCards } from "./site/ServiceCards";
import {
  ArrowDown,
  ArrowRight,
  Cart,
  Clock,
  Facebook,
  Instagram,
  Mail,
  Phone,
  Parcel,
  Pin,
  Profile,
  Search,
  WhatsApp,
} from "./site/icons";
import {
  HOURS,
  MARQUEE_WORDS,
  SHOP,
  WALL_ROWS,
  whatsapp,
} from "./site/data";

/**
 * The gift wrapping page does not exist yet. The link is live in the markup
 * so the prose is already wired; repoint this at the real route when that
 * page ships. "#" keeps it inert rather than sending anyone to a 404.
 */
const WRAPPING_HREF = "#";

/**
 * The colophon reads the current year, and this page is prerendered — without
 * this the year is the one the site was last deployed in, and the footer goes
 * stale on the 1st of January until someone happens to ship. A day is the
 * shortest useful period for a page whose only time-dependent value is a year.
 */
export const revalidate = 86400;

/**
 * The header's own dead ends. The shop, the basket, the account and search all
 * arrive with the catalogue; until then each control is drawn at its real size
 * in its real place and goes nowhere. "#" keeps them focusable and in the tab
 * order rather than 404ing.
 */
const DEAD_HREF = "#";

/**
 * The two sections of this page the header points at. Everything else in the
 * bar is a control, not a destination.
 */
const NAV = [
  { href: "#services", label: "Our Services" },
  { href: "#find-us", label: "Find Us" },
];

/**
 * The icon controls, in the order they read left to right.
 *
 * At the very narrow end the wordmark and three 44px targets are wider than the
 * screen, and something has to give. Search is what goes: it is the one control
 * here a shopper does not reach for on a phone bar, and the catalogue it will
 * eventually search has its own way in from the page. The basket and the
 * account stay, because those are what a shopper comes to the bar for.
 */
const HEADER_ICONS = [
  { label: "Search", Icon: Search, narrow: false },
  { label: "Account", Icon: Profile, narrow: true },
  { label: "Cart", Icon: Cart, narrow: true },
];

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="header">
        <div className="header__bar">
          <Link
            className="header__logo"
            href="/"
            aria-label={`${SHOP.name}, home`}
          >
            <Image
              src="/logo/black.png"
              alt={SHOP.name}
              /* The file's real size. It was declared 1300x300, a 4.33:1 box
                 against a 7:1 image, so the space reserved for the wordmark had
                 the wrong shape and the bar was budgeted against a mark almost
                 100px narrower than the one that actually paints. */
              width={1400}
              height={200}
              loading="eager"
              fetchPriority="high"
            />
          </Link>

          <nav className="header__nav" aria-label="Sections">
            {NAV.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header__actions">
            <a className="btn btn--gold on-gold header__shop" href={DEAD_HREF}>
              Shop now
            </a>

            {/* The three controls that survive to the narrow end: on a phone
                the bar is the wordmark and these, because a basket and an
                account are what a shopper reaches for and a section link is
                what the page itself already provides. */}
            {HEADER_ICONS.map(({ label, Icon, narrow }) => (
              <a
                key={label}
                className="header__icon"
                data-narrow={narrow ? "keep" : "drop"}
                href={DEAD_HREF}
                aria-label={label}
              >
                <Icon size={21} />
              </a>
            ))}
          </div>
        </div>
      </header>

      <main id="main">
        {/* ---- The cover ---------------------------------------------- */}
        <section className="cover on-dark">
          <div className="cover__wall" aria-hidden="true">
            {WALL_ROWS.map((row, r) => (
              <Fragment key={r}>
                <div className="cover__row">
                  {[0, 1].map((copy) =>
                    row.map((print) => (
                      <Image
                        key={`${copy}-${print.src}`}
                        src={`/products/web/${print.src}.webp`}
                        alt=""
                        width={640}
                        height={640}
                        loading={r === 0 && copy === 0 ? "eager" : "lazy"}
                        sizes="(max-width: 48rem) 40vw, 258px"
                      />
                    )),
                  )}
                </div>

                {/* Between each pair of rows, the running band, shrunk to a
                    strip and laid into the wall as one more thing travelling
                    past. It keeps its own blue ground so the words never sit
                    straight on a white product shot, and it leans with the
                    wall. Like the photographs it is texture, not reading. */}
                {r < WALL_ROWS.length - 1 ? (
                  <div className="cover__band">
                    {[0, 1].map((copy) => (
                      <div className="cover__bandRun" key={copy}>
                        {MARQUEE_WORDS.map((word) => (
                          <span key={word} style={{ display: "contents" }}>
                            <span>{word}</span>
                            <span className="cover__bandSlash">/</span>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>

          <div className="cover__scrim" />
          <div className="cover__scrim cover__scrim--foot" />

          <div className="cover__inner">
            <div className="shell">
              <h1 className="cover__title">
                Your one-stop
                <br />
                photo &amp; gift shop
              </h1>
              <p className="cover__lede">
                From personalised photo gifts to professional prints and
                frames — enhance your gifting experience.


              </p>
              {/* No buttons here. The docked pair carries the cover's two
                  actions from the first paint and never leaves, so a second
                  set in the headline would be the same two taps twice. */}

              <a className="cover__cue" href="#gifting">
                <span className="cover__cueRing">
                  <ArrowDown size={16} />
                </span>
                <span className="cover__cueText">Scroll down</span>
              </a>
            </div>
          </div>
        </section>

        {/* ---- The four services, one card each ------------------------ */}
        {/* Each card is a door: the illustration says what it looks like, the
            heading names it, and the whole card routes to that service's page
            under /shop. Those pages arrive with the catalogue. */}
        <section className="section services" id="services">
          <div className="shell">
            <h2 className="h2 services__title" data-reveal>
              Our Services
            </h2>

            <ServiceCards />
          </div>
        </section>

        {/* ---- The catalogue, travelling past -------------------------- */}
        {/* One row of the shop's own work, moving on its own. The heading and
            the action sit centred over the row; the row itself runs full
            bleed, because a catalogue that ends at the gutter reads as a
            finite list and this one is not. */}
        <section className="catalogue" id="catalogue">
          <div className="shell">
            <h2 className="h2 catalogue__title" data-reveal>
              Choose from our wide catalogue
            </h2>
            <p className="catalogue__sub" data-reveal>
              Tailored to you
            </p>
            <p className="catalogue__link" data-reveal>
              <Link className="inline-link" href="/shop" prefetch={false}>
                Browse the full catalogue
              </Link>
            </p>
          </div>

          <Carousel />
        </section>

        {/* ---- End-to-end gifting ------------------------------------- */}
        {/* The closing argument before the shop, so it takes the cover's
            display scale rather than the section headline: this is the second
            peak in the scroll, not another paragraph. Under it the two ways an
            order reaches its person are one ledger in the page's own ruled,
            boxless grammar, and the courier mark sits inside the row it
            belongs to instead of floating beside the copy. */}
        <section className="section gifting on-dark" id="gifting">
          <div className="shell">
            <div className="gifting__head">
              <h2 className="gifting__title" data-reveal>
                {/* The space keeps the words apart when the break is
                    suppressed at narrow widths. */}
                End-to-end gifting,{" "}
                <br />
                at your fingertips
              </h2>
              <p className="lede gifting__lede" data-reveal>
                Order your gifts and we deliver them straight to you or whoever
                you want to surprise &mdash; neatly wrapped in our personalised{" "}
                <a className="inline-link" href={WRAPPING_HREF}>
                  gift wrapping
                </a>
                .
              </p>
              <p className="gifting__marked" data-reveal>
                <span className="marked">Gift giving, made easy</span>
              </p>
            </div>

            <div className="handover">
              <div className="handover__row" data-reveal>
                <span className="handover__mark" aria-hidden="true">
                  <Parcel size={19} />
                </span>
                <div className="handover__text">
                  <h3 className="handover__name">We send it</h3>
                  <p className="handover__blurb">
                    Wrapped at the counter and handed to the courier for the
                    last leg, to your door or to theirs, or a locker (if available).
                  </p>
                </div>
                {/* The reserved slot on this row is the courier's own mark:
                    the evidence behind the sentence beside it. */}
                <div className="handover__slot handover__slot--wrap">
                  <span className="handover__powered">Powered by</span>
                  <Image
                    className="handover__logo"
                    src="/pudo_courierguy_logo.png"
                    alt="PUDO by The Courier Guy"
                    width={1024}
                    height={283}
                    sizes="(max-width: 62rem) 55vw, 240px"
                  />
                </div>
              </div>

              <div className="handover__row" data-reveal>
                <span className="handover__mark" aria-hidden="true">
                  <Pin size={19} />
                </span>
                <div className="handover__text">
                  <h3 className="handover__name">Or collect it at the shop</h3>
                  <p className="handover__blurb">
                    Near Scottburgh, KZN? Collect your order for free at {" "}
                    {SHOP.street}, and look at the frame finishes in person
                    while you&rsquo;re in.
                  </p>
                </div>
                <a className="handover__slot handover__link" href="#find-us">
                  Opening hours and directions
                  <ArrowRight size={13} />
                </a>
              </div>
            </div>

            
          </div>
        </section>

      </main>

      {/*
        The page closes on the counter itself. Where the shop's details and the
        footer used to be two dark surfaces back to back — the address, the
        hours, the phone and the socials each said once in a panel and again in
        a footer menu pointing back at that same panel — there is now one
        surface in brand blue: where the shop is, when it is open, how to reach
        it, the sign-up, and the name at shopfront scale.

        It is the page's last ground, and it is blue rather than the near-black
        DESIGN.md nominates for the close, because the section above it already
        owns near-black: two identical grounds meeting is what made the seam
        arbitrary in the first place.
      */}
      <footer className="footer on-dark" id="find-us">
        <div className="shell footer__top">
          <h2 className="h2" data-reveal>
            Come and find us
          </h2>

          <div className="shop__grid">
            <div className="shop__block" data-reveal>
              <h3>
                <Pin size={15} />
                The shop
              </h3>
              <address className="shop__address">
                {SHOP.street}
                <br />
                {SHOP.town}
                <br />
                {SHOP.region}
                <br />
                {SHOP.postcode}
              </address>
              <a
                className="shop__link"
                href={SHOP.mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Get directions
                <ArrowRight size={17} />
              </a>
            </div>

            <div className="shop__block" data-reveal>
              <h3>
                <Clock size={15} />
                Opening hours
              </h3>
              <table className="hours">
                <tbody>
                  {HOURS.map((row) => (
                    <tr
                      key={row.days}
                      data-closed={row.closed ? "true" : "false"}
                    >
                      <th scope="row">{row.days}</th>
                      <td>{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Every channel the shop answers on, each named once. The icon
                pills that used to sit beside the sign-up were the same three
                accounts a second time. */}
            <div className="shop__block" data-reveal>
              <h3>
                <WhatsApp size={15} />
                Talk to us
              </h3>
              <ul className="contacts">
                <li>
                  <a href={whatsapp("Hi! I have a question about…")}>
                    <WhatsApp size={19} />
                    WhatsApp {SHOP.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a href={`tel:+${SHOP.phoneE164}`}>
                    <Phone size={19} />
                    Call {SHOP.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${SHOP.email}`}>
                    <Mail size={19} />
                    {SHOP.email}
                  </a>
                </li>
                <li>
                  <a href={SHOP.instagramUrl} target="_blank" rel="noreferrer">
                    <Instagram size={19} />@{SHOP.instagram}
                  </a>
                </li>
                <li>
                  <a href={SHOP.facebookUrl} target="_blank" rel="noreferrer">
                    <Facebook size={19} />
                    {SHOP.facebook}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* The sign-up is the only thing down here that is not a detail of
              the shop, so it is the only thing held off by a rule. The base
              line sits on its end rather than claiming a strip of its own. */}
          <div className="footer__base">
            <div className="footer__signup" data-reveal>
              <h3 className="footer__signup-title">Sign Up</h3>
              <p className="footer__signup-sub">
                To receive updates on our latest products, easily save your
                information for future orders, and get access to exclusive
                member-only loyalty deals.
              </p>
              <Newsletter />
            </div>

            <p className="footer__colophon">
              &copy;{new Date().getFullYear()}. All Rights Reserved.
            </p>
          </div>
        </div>

        {/*
          The wordmark, set wider than the viewport on purpose and cropped by
          the footer — the name arrives at the scale of a shopfront sign, not
          of a logo. It is decorative: the name has been read already, so a
          screen reader is given the one span and not the letters.
        */}
        <div className="footer__wordmark">
          <span className="visually-hidden">{SHOP.name}</span>
          <span className="footer__wordmark-line" aria-hidden="true">
            Express
          </span>
        </div>
      </footer>

      <OrderDock />

      <Motion />
    </>
  );
}
