import "@/app/site/chrome.css";
import "./checkout.css";

import { CartDrawer } from "@/app/site/Cart";
import { SiteFooter } from "@/app/site/SiteFooter";
import { SiteHeader, type NavItem } from "@/app/site/SiteHeader";

const NAV: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/all", label: "All products" },
  { href: "#find-us", label: "Find Us" },
];

/**
 * Checkout shares the site's bar and counter but not the order dock: on a
 * phone the photo tray owns the foot of the screen. The cart drawer stays,
 * opened from the breadcrumb.
 */
export default function CheckoutLayout({ children }: LayoutProps<"/checkout">) {
  return (
    <>
      <SiteHeader nav={NAV} />
      <main id="main" className="ck">
        {children}
      </main>
      <SiteFooter />
      <CartDrawer />
    </>
  );
}
