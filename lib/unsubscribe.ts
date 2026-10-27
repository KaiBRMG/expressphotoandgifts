import "server-only";

import { createHmac } from "node:crypto";

import { siteUrl } from "@/lib/checkout/site";
import { safeEqual } from "@/lib/secure";

/**
 * The unsubscribe link in every marketing email. It carries the address and a
 * signature of it, so it works from any browser with no sign-in and nothing
 * stored per recipient, and nobody can unsubscribe an address they weren't
 * sent a link for. The signing key is derived from the service-account key,
 * which the server already has and no browser sees. Rotating that credential
 * stops links in emails already delivered from working, so a rotation should
 * be followed by a note to anyone who wants off the list.
 */
let key: Buffer | undefined;
const secret = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  return (key ??= createHmac("sha256", raw).update("unsubscribe").digest());
};

const sign = (email: string) => createHmac("sha256", secret()).update(email).digest("base64url");

/** Whether `token` is the signature of `email`. */
export const validUnsubscribe = (email: string, token: string) => safeEqual(token, sign(email.trim().toLowerCase()));

/** The query a signed link carries, for the page and the route behind its button. */
export function unsubscribeQuery(email: string): string {
  const address = email.trim().toLowerCase();
  return `e=${encodeURIComponent(address)}&t=${sign(address)}`;
}

/**
 * The page that asks "Stop these emails?", and the route behind its button and
 * the mail client's one-click. Throws without SITE_URL: a marketing email must
 * not go out without a working way to stop it.
 */
export function unsubscribeLinks(email: string): { page: string; post: string } {
  const site = siteUrl();
  if (!site) throw new Error("SITE_URL is not set");
  const q = unsubscribeQuery(email);
  return { page: `${site}/subscription?${q}`, post: `${site}/subscription/off?${q}` };
}
