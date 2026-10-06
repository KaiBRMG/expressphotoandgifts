import { Fragment } from "react";

import Image from "next/image";
import Link from "next/link";
import "./home.css";

import { Carousel } from "./site/Carousel";
import { CategoryCards } from "./site/CategoryCards";
import { Newsletter } from "./site/Newsletter";
import { Motion } from "./site/Motion";
import { OrderDock } from "./site/OrderDock";
import {
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
 * How many words of the running band pass between each appearance of the
 * shop's mark. Thirteen words to a run, so the mark lands four times per run —
 * often enough that one is always somewhere on the visible side of the wall.
 */
const BAND_LOGO_EVERY = 4;

/**
 * The two sections of this page the header points at. Everything else in the
 * bar is a control, not a destination.
 */
const NAV = [
  { href: "#categories", label: "Categories" },
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

      <header className="header on-dark">
        <div className="header__bar">
          <Link
            className="header__logo"
            href="/"
            aria-label={`${SHOP.name}, home`}
          >
            <Image
              src="/logo/new.png"
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
        <section className="cover">
          {/* Three rows of real work and the bands woven between them. The
              headline is one of those bands: the widest, and the only one
              that holds still while the rows and the word strip travel past,
              which is what marks it as the one fixed sentence. */}
          <div className="cover__wall">
            {WALL_ROWS.map((row, r) => (
              <Fragment key={r}>
                <div className="cover__row" aria-hidden="true">
                  {/* Each half of the loop lays the row out twice, so one
                      half is wider than the wall even on a 2560px screen
                      and the travel never opens a gap at the far end. */}
                  {[0, 1].map((copy) =>
                    [...row, ...row].map((print, i) => (
                      <Image
                        key={`${copy}-${i}-${print.src}`}
                        src={`/products/web/${print.src}.webp`}
                        alt=""
                        width={640}
                        height={640}
                        loading={r < 2 && copy === 0 && i < row.length ? "eager" : "lazy"}
                        sizes="(max-width: 48rem) 44vw, 210px"
                      />
                    )),
                  )}
                </div>

                {/* Between the first pair of rows, the running band shrunk to
                    a strip: one more thing travelling past, on its own blue so
                    the words never sit straight on a white product shot. Each
                    run opens on the shop's own mark. */}
                {r === 0 ? (
                  <div className="cover__band" aria-hidden="true">
                    {[0, 1].map((copy) => (
                      <div className="cover__bandRun" key={copy}>
                        {MARQUEE_WORDS.map((word, w) => (
                          <span key={word} style={{ display: "contents" }}>
                            {w % BAND_LOGO_EVERY === 0 ? (
                              <>
                                <Image
                                  className="cover__bandLogo"
                                  src="/logo/new.png"
                                  alt=""
                                  width={1400}
                                  height={200}
                                  sizes="240px"
                                />
                                <span className="cover__bandSlash">/</span>
                              </>
                            ) : null}
                            <span>{word}</span>
                            <span className="cover__bandSlash">/</span>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Between the second pair, the headline's own band, with the
                    lede on a slimmer one under it. No buttons: the docked pair
                    carries the cover's two actions from the first paint. */}
                {r === 1 ? (
                  <div className="cover__sign">
                    <h1 className="cover__title">
                      <span className="cover__line">Your one-stop</span>{" "}
                      <span className="cover__line">
                        photo &amp;{" "}
                        <span className="cover__gold">gift shop</span>
                      </span>
                    </h1>
                    <p className="cover__lede">
                      From personalised photo gifts to professional prints and
                      frames — enhance your gifting experience.
                    </p>
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>

          {/* The catalogue's top edge, drawn here at the wall's lean so its
              blue reads as the widest band, the one the wall settles into. */}
          <div className="cover__edge" aria-hidden="true" />
        </section>

        {/* ---- The catalogue, travelling past -------------------------- */}
        {/* It follows the cover directly, its blue rising into the wall on
            the cover's leaning edge. The heading and the action sit
            centred over the row; the row itself runs full bleed, because a
            catalogue that ends at the gutter reads as a finite list and this
            one is not. */}
        <section className="catalogue on-dark" id="catalogue">
          <div className="shell">
            <h2 className="h2 catalogue__title" data-reveal>
              Choose from our wide catalogue
            </h2>
            <p className="catalogue__sub" data-reveal>
              Tailored by you
            </p>
            <p className="catalogue__link" data-reveal>
              <Link className="inline-link" href="/shop" prefetch={false}>
                Browse the full catalogue
              </Link>
            </p>
          </div>

          <Carousel />
        </section>

        {/* ---- Shop by category --------------------------------------- */}
        {/* The whole range as eight small doors, heading centred over them the
            way the catalogue's is. Each tile routes to its shelf under /shop;
            those pages arrive with the catalogue. */}
        <section className="section categories" id="categories">
          <div className="shell">
            <h2 className="h2 categories__title" data-reveal>
              Shop by category
            </h2>

            <CategoryCards />
          </div>
        </section>

        {/* ---- End-to-end gifting ------------------------------------- */}
        {/* The page's second sign. The headline rides the same leaning blue
            band as the cover's, with its lede on the slimmer band beneath, so
            the page closes on the device it opened with. Under it, the
            highlighter line and the two ways an order reaches its person,
            side by side and split by a hairline rather than boxed. */}
        <section className="gifting" id="gifting">
          <div className="gifting__sign on-dark">
            <h2 className="gifting__title">
              <span className="gifting__line">End-to-end gifting,</span>{" "}
              <span className="gifting__line gifting__gold">
                at your fingertips
              </span>
            </h2>
            <p className="gifting__lede">
              Order your gifts and we deliver them straight to you or whoever
              you want to surprise &mdash; neatly wrapped in our personalised{" "}
              <a className="inline-link" href={WRAPPING_HREF}>
                gift wrapping
              </a>
              .
            </p>
          </div>

          <div className="shell">
            <p className="gifting__marked" data-reveal>
              <span className="marked">Gift giving, made easy</span>
            </p>

            <div className="ways">
              <div className="way" data-reveal>
                <span className="way__icon" aria-hidden="true">
                  <Parcel size={24} />
                </span>
                <h3 className="way__name">We send it</h3>
                <p className="way__blurb">
                  Wrapped at the counter and handed to the courier for the last
                  leg, to your door or to theirs, or a locker (if available).
                </p>
                {/* The courier's own mark: the evidence behind the sentence
                    above it. */}
                <div className="way__slot">
                  <span className="way__powered">Powered by</span>
                  <span
                    className="way__logo"
                    role="img"
                    aria-label="PUDO by The Courier Guy"
                  />
                </div>
              </div>

              <div className="way" data-reveal>
                <span className="way__icon" aria-hidden="true">
                  <Pin size={24} />
                </span>
                <h3 className="way__name">Or collect it at the shop</h3>
                <p className="way__blurb">
                  Near Scottburgh, KZN? Collect your order for free at{" "}
                  {SHOP.street}, and look at the frame finishes in person while
                  you&rsquo;re in.
                </p>
                <div className="way__slot">
                  <a className="way__link" href="#find-us">
                    Opening hours and directions
                    <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/*
        The page closes on the counter itself: where the shop is, when it is
        open, how to reach it, and the sign-up — one compact brand-blue
        ground under the white gifting section, the same blue as the header.

        The last row is the colophon, and it is sized to the dock: when the page
        bottoms out the docked pair comes to rest on the right of that row, so
        nothing has to move it out of the way.
      */}
      <footer className="footer on-dark" id="find-us">
        <div className="shell footer__top">
          <h2 className="footer__title" data-reveal>
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
              the shop, so it is the only thing held off by a rule. On a wide
              screen it is one row: what it is for on the left, the line to
              write on to the right. */}
          <div className="footer__base">
            <div className="footer__signup-copy" data-reveal>
              <h3 className="footer__signup-title">Sign up</h3>
              <p className="footer__signup-sub">
                To receive updates on our latest products, easily save your
                information for future orders, and get access to exclusive
                member-only loyalty deals.
              </p>
            </div>
            <div className="footer__signup" data-reveal>
              <Newsletter />
            </div>
          </div>
        </div>

        <div className="shell footer__end">
          <p className="footer__colophon">
            &copy;{new Date().getFullYear()}. All Rights Reserved.
          </p>
        </div>
      </footer>

      <OrderDock />

      <Motion />
    </>
  );
}
