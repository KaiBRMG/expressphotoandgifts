import "@/app/site/chrome.css";
import "@/app/checkout/checkout.css";

import { CartDrawer } from "@/app/site/Cart";
import { OrderDock } from "@/app/site/OrderDock";
import { SiteFooter } from "@/app/site/SiteFooter";
import { SiteHeader, type NavItem } from "@/app/site/SiteHeader";

const NAV: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/all", label: "All products" },
  { href: "#find-us", label: "Find Us" },
];

/** The customer's account: the site's bar and counter, with checkout's fields. */
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <>
      <SiteHeader nav={NAV} />
      <main id="main" className="ck">
        {children}
      </main>
      <SiteFooter />
      <OrderDock />
      <CartDrawer />
    </>
  );
}
