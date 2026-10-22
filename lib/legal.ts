import { fromShopTime, SHOP_TZ } from "./shopTime";

/**
 * The shop's three policies (`/terms`, `/privacy`, `/refunds-cancellations`),
 * as the code refers to them. Shared by the browser and the server: no
 * secrets here.
 *
 * `POLICIES_VERSION` is the date the policies last changed. Checkout sends it
 * with the customer's tick, the server refuses an order without it, and each
 * order and payment attempt keeps the version that was agreed to, so the shop
 * can show which terms an order was placed under. Change it whenever any of
 * the three pages changes in substance.
 */
export const POLICIES_VERSION = "2026-10-22";

export const POLICY_LINKS = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds-cancellations", label: "Returns & Cancellations" },
] as const;

export type PolicyPath = (typeof POLICY_LINKS)[number]["href"];

/** A policy's name, as its page, its link and its tab title give it. */
export const policyTitle = (path: PolicyPath) => POLICY_LINKS.find((p) => p.href === path)!.label;

/** "22 October 2026", the way the pages date themselves. */
export const policiesDate = () => fromShopTime(`${POLICIES_VERSION} 12:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: SHOP_TZ });
