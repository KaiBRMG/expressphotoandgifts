"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Box, Card, Chart, External, Menu, Panels, Parcel, People, Shelves, SignOut, Sliders, Tag, Truck } from "@/app/site/icons";
import { signOutAction } from "../actions";

type Item = { href: string; label: string; Icon: typeof Panels };

/**
 * The console's pages, grouped by how often they're opened: the day's work
 * first, then the shop's catalogue and customers, then the month-end money,
 * then setup. On a phone the first group's orders, products and stock are the
 * tab bar (the dashboard is behind the logo); the rest sit behind More.
 */
const GROUPS: { name: string; items: Item[] }[] = [
  {
    name: "Day to day",
    items: [
      { href: "/admin", label: "Dashboard", Icon: Panels },
      { href: "/admin/orders", label: "Orders", Icon: Parcel },
      { href: "/admin/products", label: "Products", Icon: Box },
      { href: "/admin/stock", label: "Stock", Icon: Shelves },
    ],
  },
  {
    name: "Shop",
    items: [
      { href: "/admin/campaigns", label: "Campaigns", Icon: Tag },
      { href: "/admin/customers", label: "Customers", Icon: People },
    ],
  },
  {
    name: "Money",
    items: [
      { href: "/admin/payments", label: "Payments", Icon: Card },
      { href: "/admin/courier", label: "Courier", Icon: Truck },
      { href: "/admin/analytics", label: "Analytics", Icon: Chart },
    ],
  },
  { name: "Setup", items: [{ href: "/admin/settings", label: "Settings", Icon: Sliders }] },
];

/** The tab bar's pages, and everything else, for the More sheet. */
const TABS = GROUPS[0].items.filter((i) => i.href !== "/admin");
const MORE = [GROUPS[0].items[0], ...GROUPS.slice(1).flatMap((g) => g.items)];

// The dashboard is the console's root, so only its own address marks it.
const isCurrent = (path: string, href: string) => (href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`));

/**
 * The console's one blue ground: the logo, the pages, and at its foot who is
 * signed in. Below 62rem it narrows to its icons, each named by a tooltip;
 * below 46rem it is just the logo, and the pages are a tab bar at the thumb.
 */
export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  // The labels show from 62rem; below it the tooltips stand in for them.
  const narrow = useMediaQuery("(max-width: 61.99rem)") ?? false;
  const tip = { position: "right" as const, disabled: !narrow, events: { hover: true, focus: true, touch: false } };

  return (
    <>
      <nav className="sidebar on-dark" aria-label="Admin">
        <Link href="/admin" className="sidebar__brand" aria-label="Express Photo and Gifts admin, dashboard">
          <Image src="/logo/new.png" alt="" width={196} height={28} className="sidebar__logo" priority />
          <span className="sidebar__where">Admin</span>
        </Link>

        <div className="sidebar__groups">
          {GROUPS.map(({ name, items }, g) => (
            <ul key={name} className="sidebar__nav" aria-label={name}>
              {items.map(({ href, label, Icon }) => (
                <li key={href}>
                  <Tooltip label={label} {...tip}>
                    <Link href={href} className="sidebar__item" aria-current={isCurrent(path, href) ? "page" : undefined}>
                      <Icon size={22} />
                      <span className="sidebar__label">{label}</span>
                    </Link>
                  </Tooltip>
                </li>
              ))}
              {g === GROUPS.length - 1 ? (
                <li>
                  <Tooltip label="View the shop" {...tip}>
                    <a href="/shop" target="_blank" rel="noopener" className="sidebar__item sidebar__item--quiet">
                      <External size={22} />
                      <span className="sidebar__label">View the shop</span>
                    </a>
                  </Tooltip>
                </li>
              ) : null}
            </ul>
          ))}
        </div>

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

      <TabBar path={path} email={email} />
    </>
  );
}

/** A phone's way round: the three pages worked every day, then everything else behind More. */
function TabBar({ path, email }: { path: string; email: string }) {
  // The page the sheet was opened on: moving to another page closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === path;
  const inMore = MORE.some((i) => isCurrent(path, i.href));

  return (
    <>
      <nav className="tabbar on-dark" aria-label="Admin pages">
        {TABS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="tabbar__item" aria-current={isCurrent(path, href) ? "page" : undefined}>
            <Icon size={24} />
            {label}
          </Link>
        ))}
        <button type="button" className="tabbar__item" aria-haspopup="dialog" aria-expanded={open} aria-current={inMore ? "page" : undefined} onClick={() => setOpenedOn(path)}>
          <Menu size={24} />
          More
        </button>
      </nav>

      <Drawer opened={open} onClose={() => setOpenedOn(null)} position="bottom" size="min(85dvh, 36rem)" title="All pages" radius="lg">
        <ul className="more__list">
          {MORE.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} className="more__item" aria-current={isCurrent(path, href) ? "page" : undefined}>
                <Icon size={22} />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <a href="/shop" target="_blank" rel="noopener" className="more__item">
              <External size={22} />
              View the shop
            </a>
          </li>
        </ul>
        <form action={signOutAction} className="more__me">
          <span className="more__email">{email}</span>
          <button type="submit" className="more__item more__signout">
            <SignOut size={22} />
            Sign out
          </button>
        </form>
      </Drawer>
    </>
  );
}
