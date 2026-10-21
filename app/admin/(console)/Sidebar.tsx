"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Box, Card, External, Panels, Parcel, SignOut, Sliders, Truck } from "@/app/site/icons";
import { signOutAction } from "../actions";

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: Panels },
  { href: "/admin/orders", label: "Orders", Icon: Parcel },
  { href: "/admin/payments", label: "Payments", Icon: Card },
  { href: "/admin/courier", label: "Courier", Icon: Truck },
  { href: "/admin/products", label: "Products", Icon: Box },
  { href: "/admin/settings", label: "Settings", Icon: Sliders },
];

/**
 * The console's one blue ground: the logo, the pages, and at its foot who is
 * signed in. Below 62rem it narrows to its icons, each named by a tooltip;
 * below 46rem it lies across the top of the page.
 */
export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  // The labels show from 62rem; below it the tooltips stand in for them.
  const narrow = useMediaQuery("(max-width: 61.99rem)") ?? false;
  // Under 46rem the rail is a bar across the top, so its tooltips open downwards.
  const top = useMediaQuery("(max-width: 46rem)") ?? false;
  const tip = { position: top ? ("bottom" as const) : ("right" as const), disabled: !narrow, events: { hover: true, focus: true, touch: false } };

  return (
    <nav className="sidebar on-dark" aria-label="Admin">
      <Link href="/admin" className="sidebar__brand" aria-label="Express Photo and Gifts admin, dashboard">
        <Image src="/logo/new.png" alt="" width={196} height={28} className="sidebar__logo" priority />
        <span className="sidebar__where">Admin</span>
      </Link>

      <ul className="sidebar__nav">
        {NAV.map(({ href, label, Icon }) => {
          // The dashboard is the console's root, so only its own address marks it.
          const current = href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Tooltip label={label} {...tip}>
                <Link href={href} className="sidebar__item" aria-current={current ? "page" : undefined}>
                  <Icon size={22} />
                  <span className="sidebar__label">{label}</span>
                </Link>
              </Tooltip>
            </li>
          );
        })}
        <li>
          <Tooltip label="View the shop" {...tip}>
            <a href="/shop" target="_blank" rel="noopener" className="sidebar__item sidebar__item--quiet">
              <External size={22} />
              <span className="sidebar__label">View the shop</span>
            </a>
          </Tooltip>
        </li>
      </ul>

      <div className="sidebar__me">
        <span className="sidebar__email" title={email}>
          {email}
        </span>
        <form action={signOutAction}>
          <Tooltip label="Sign out" {...tip}>
            <button type="submit" className="sidebar__item sidebar__signout">
              <SignOut size={22} />
              <span className="sidebar__label">Sign out</span>
            </button>
          </Tooltip>
        </form>
      </div>
    </nav>
  );
}
