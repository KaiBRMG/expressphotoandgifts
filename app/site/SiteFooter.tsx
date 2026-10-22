import Link from "next/link";

import { POLICY_LINKS } from "@/lib/legal";
import { ArrowRight, Clock, Facebook, Instagram, Mail, Phone, Pin, WhatsApp } from "./icons";
import { CHAT_HREF, HOURS, SHOP } from "./data";
import { Newsletter } from "./Newsletter";

/**
 * Every page closes on the shop's counter: where it is, when it is open, how
 * to reach it, and the sign-up. Its anchor is `#find-us` on every page, so the
 * header's Find Us never has to leave the page it is on.
 *
 * One compact brand-blue ground, the same blue as the header. The last row is
 * the colophon, and it is sized to the dock: when the page bottoms out the
 * docked pair comes to rest on the right of that row, so nothing has to move
 * it out of the way.
 */
export function SiteFooter() {
  return (
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
                <a href={CHAT_HREF}>
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

      {/* The shop's three policies, small print above the colophon: the
          colophon's own row is sized to the dock and has no room for them. */}
      <nav className="shell footer__policies" aria-label="Shop policies">
        <ul>
          {POLICY_LINKS.map((p) => (
            <li key={p.href}>
              <Link href={p.href}>{p.label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shell footer__end">
        <p className="footer__colophon">
          &copy;{new Date().getFullYear()}. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
