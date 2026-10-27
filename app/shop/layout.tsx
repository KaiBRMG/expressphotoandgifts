import "@/app/site/chrome.css";
import "./shop.css";

import { OrderDock } from "@/app/site/OrderDock";
import { SiteFooter } from "@/app/site/SiteFooter";
import { SiteHeader, type NavItem } from "@/app/site/SiteHeader";

const NAV: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/all", label: "All products" },
  { href: "#find-us", label: "Find Us" },
];

/**
 * Every page under /shop shares the site's bar and counter. The gold Shop now
 * would point at the shop from inside it, so here the dock leaves it out and
 * is the WhatsApp mark alone.
 */
export default function ShopLayout({ children }: LayoutProps<"/shop">) {
  return (
    <>
      <SiteHeader nav={NAV} />
      <main id="main" className="shop">
        {children}
      </main>
      <SiteFooter />
      <OrderDock shopAction={false} />
    </>
  );
}
