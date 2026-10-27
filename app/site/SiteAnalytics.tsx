"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Pages that aren't the shop's traffic: the staff console and a customer's own account. */
const PRIVATE = /^\/(admin|account)(\/|$)/;

/** What a page's address keeps: the shop's filters, a search and campaign tags. A receipt's ref and token never leave. */
const KEPT = /^(q|type|occasion|for|sort|variant|utm_[a-z]+)$/;

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (PRIVATE.test(url.pathname)) return null;
  for (const key of [...url.searchParams.keys()]) if (!KEPT.test(key)) url.searchParams.delete(key);
  return { ...event, url: url.toString() };
}

/**
 * Vercel Web Analytics: visitors, pages, referrers, devices and countries,
 * without cookies, read in Vercel's own Analytics tab.
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
