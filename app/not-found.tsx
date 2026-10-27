import type { Metadata } from "next";
import Link from "next/link";

import "./site/chrome.css";
import "./site/lost.css";

import { shopContact } from "@/lib/settings";
import { whatsappLink } from "@/lib/contact";
import { getRail } from "./shop/shelves";
import { OrderDock } from "./site/OrderDock";
import { SiteFooter } from "./site/SiteFooter";
import { SiteHeader, type NavItem } from "./site/SiteHeader";
import { ArrowRight, WhatsApp } from "./site/icons";

export const metadata: Metadata = { title: "Page not found" };

const NAV: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/all", label: "All products" },
  { href: "#find-us", label: "Find Us" },
];

/**
 * Any address the shop has no page for, and a product or shelf that isn't
 * there. It brings the whole site's bar and counter itself: a page that throws
 * `notFound()` leaves its own layout behind, so none is wrapped around this.
 */
export default async function NotFound() {
  const [shelves, contact] = await Promise.all([getRail(), shopContact()]);
  return (
    <>
      <SiteHeader nav={NAV} />
      <main id="main" className="lost">
        <div className="shell lost__inner">
          <p className="lost__mark">Error 404</p>
          <h1 className="lost__title">That page isn’t here.</h1>
          <p className="lost__text">The link may be old, or the product may have left the shop. Start again from the shop, or ask us and we’ll point you to it.</p>

          <div className="lost__actions">
            <Link className="btn btn--blue" href="/shop">
              Browse the shop
              <ArrowRight size={18} />
            </Link>
            <a className="lost__link" href={whatsappLink(contact, "Hi! I’m looking for something on your website and couldn’t find it.")} target="_blank" rel="noreferrer">
              <WhatsApp size={19} />
              Ask on WhatsApp
            </a>
          </div>

          <nav className="lost__shelves" aria-labelledby="lost-shelves">
            <h2 className="lost__shelvesTitle" id="lost-shelves">
              Or look on a shelf
            </h2>
            <ul>
              {shelves.map((s) => (
                <li key={s.slug}>
                  <Link href={`/shop/${s.slug}`}>{s.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
      <SiteFooter />
      <OrderDock />
    </>
  );
}
