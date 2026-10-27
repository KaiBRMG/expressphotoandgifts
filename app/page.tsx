import type { Metadata } from "next";
import { Fragment } from "react";

import Image from "next/image";
import Link from "next/link";
import "./site/chrome.css";
import "./home.css";

import { Carousel } from "./site/Carousel";
import { CategoryCards } from "./site/CategoryCards";
import { Motion } from "./site/Motion";
import { OrderDock } from "./site/OrderDock";
import { ProductImage } from "./site/ProductImage";
import { SiteFooter } from "./site/SiteFooter";
import { SiteHeader, type NavItem } from "./site/SiteHeader";
import { ArrowRight, Parcel, Pin } from "./site/icons";
import { OrganizationJsonLd } from "./site/OrganizationJsonLd";
import { MARQUEE_WORDS, SHOP, WALL_ROWS } from "./site/data";

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
 * How many words of the running band pass between each appearance of the
 * shop's mark. Thirteen words to a run, so the mark lands four times per run —
 * often enough that one is always somewhere on the visible side of the wall.
 */
const BAND_LOGO_EVERY = 4;

/**
 * The two sections of this page the header points at. Everything else in the
 * bar is a control, not a destination.
 */
const NAV: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "#categories", label: "Categories" },
  { href: "#find-us", label: "Find Us" },
];


export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <OrganizationJsonLd />
      <SiteHeader nav={NAV} />

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
                      <ProductImage
                        key={`${copy}-${i}-${print.src}`}
                        code={print.src}
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
              <Link className="inline-link" href="/shop/all">
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
                  leg, to your door or to theirs.
                </p>
                {/* The courier's own mark: the evidence behind the sentence
                    above it. */}
                <div className="way__slot">
                  <span className="way__powered">Powered by</span>
                  <span
                    className="way__logo"
                    role="img"
                    aria-label="The Courier Guy"
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

      <SiteFooter />

      <OrderDock />

      <Motion />
    </>
  );
}
