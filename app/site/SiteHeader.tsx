import Image from "next/image";
import Link from "next/link";

import { HeaderCart } from "./Cart";
import { HeaderSearch } from "./HeaderSearch";
import { Profile } from "./icons";
import { SHOP } from "./data";

/**
 * The icon links after search, in the order they read left to right; the cart
 * follows them as a button (`HeaderCart`), since it opens the drawer.
 *
 * Below 360px the wordmark and three 44px targets leave the wordmark too small
 * to read, and something has to give. The account is what goes: search and the
 * basket are what a shopper comes to a phone's bar for, and the footer's
 * sign-in line reaches the account on every page.
 */
const HEADER_ICONS = [{ label: "Account", Icon: Profile, narrow: false, href: "/account" }];

export type NavItem = { href: string; label: string };

/**
 * The bar every page opens on. `nav` is the page's own short list of places.
 * The gold Shop now is not here: the dock carries it on every page that isn't
 * the shop, and a second one on the same screen was the same tap twice.
 */
export function SiteHeader({ nav }: { nav: NavItem[] }) {
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
              /* Painted at most 560px wide (280px below 62rem), not the file's 1400. */
              sizes="(min-width: 62rem) 560px, 280px"
              loading="eager"
              fetchPriority="high"
            />
          </Link>

          <nav className="header__nav" aria-label="Sections">
            {nav.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header__actions">
            {/* The controls that survive to the narrow end: on a phone the bar
                is the wordmark and these, because search and a basket are what
                a shopper reaches for and a section link is what the page
                itself already provides. */}
            <HeaderSearch />
            {HEADER_ICONS.map(({ label, Icon, narrow, href }) => (
              <a
                key={label}
                className="header__icon"
                data-narrow={narrow ? "keep" : "drop"}
                href={href}
                aria-label={label}
              >
                <Icon size={21} />
                <span className="header__label">{label}</span>
              </a>
            ))}
            <HeaderCart />
          </div>
        </div>
      </header>
    </>
  );
}
