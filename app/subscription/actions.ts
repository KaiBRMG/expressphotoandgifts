"use server";

import { headers } from "next/headers";

import { isEmail } from "@/lib/checkout/details";
import { callerIp, rateLimit } from "@/lib/rateLimit";
import { requestSubscription } from "@/lib/subscribers";

/** Per visitor and per address: each ask sends an email, so neither may be used to send many. */
const byIp = rateLimit(6, 60 * 60_000);
const byEmail = rateLimit(3, 60 * 60_000);

/**
 * The footer's "Email me specials": emails the address a link to confirm it.
 * The answer is the same for an address already on the list and one that is
 * not, so the form can't be used to learn who is a customer.
 */
export async function subscribeAction(email: string): Promise<{ ok: true } | { error: string }> {
  const address = String(email).trim().toLowerCase();
  if (!isEmail(address)) return { error: "That doesn’t look like an email address." };
  const ip = callerIp(await headers());
  if ((ip && !byIp(ip)) || !byEmail(address)) return { error: "We’ve sent a few already. Check your inbox and spam folder, or try again in an hour." };
  try {
    return await requestSubscription(address);
  } catch (e) {
    console.error("Subscription not requested", e);
    return { error: "That didn’t work just now. Try again in a minute." };
  }
}
