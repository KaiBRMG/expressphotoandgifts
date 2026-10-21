import "server-only";

import { after } from "next/server";
import { cache } from "react";
import { auth, db } from "@/lib/firebase";
import { checkPassword, isStaffEmail, sendPasswordReset, sessionCookie } from "@/lib/identity";
import { passwordError, type Address, type Contact } from "@/lib/checkout/details";
import { sendWelcome } from "@/lib/checkout/emails";
import type { Order } from "@/lib/checkout/order";

/**
 * Customer accounts: optional, made as the customer pays ("Save my details"
 * at checkout) or from the receipt after, so the details a customer gives
 * once fill checkout the next time.
 *
 * An account is made by the server with the Admin SDK (Firebase Auth's
 * public sign-up stays off; see `lib/admin/auth.ts`), never for an address on
 * the admin allowlist. Signing in follows the admin's pattern through
 * `lib/identity.ts`, with its own cookie on every path. The saved details
 * live in `customers/{uid}`.
 */

/** Two weeks, Firebase's longest session. */
const session = sessionCookie("epg_customer", "/", 14 * 24 * 60 * 60 * 1000);

export type Customer = { uid: string; email: string };
export type SavedDetails = { contact: Contact; address: Address | null };

export { sendPasswordReset };

/** Signs a customer in and sets the session cookie: who they are, or why not. */
export async function signIn(email: string, password: string): Promise<Customer | { error: string }> {
  const checked = await checkPassword(email, password, {
    disabled: "This account has been switched off. Call the shop and we’ll sort it out.",
    notConfigured: "Accounts aren’t set up yet.",
  });
  if ("error" in checked) return checked;
  await session.start(checked.idToken);
  return { uid: checked.uid, email: checked.email };
}

/** What an order says about its customer, as an account keeps it. A gift sent to someone else is their address, not the customer's. */
export const detailsFrom = (order: Pick<Order, "contact" | "fulfilment">): SavedDetails => ({
  contact: order.contact,
  address: order.fulfilment.method === "courier" && !order.fulfilment.recipient ? order.fulfilment.address : null,
});

/**
 * Makes an account and signs the customer in: from checkout as they pay or
 * from the receipt after (with the details from their order), or from the
 * footer's sign-up with only an email. Says plainly when the email already
 * has one (`exists`); each caller adds what to do next in its own place.
 */
export async function createAccount(rawEmail: string, password: string, details: SavedDetails | null): Promise<{ error: string; exists?: true } | { uid: string }> {
  const email = rawEmail.trim().toLowerCase();
  const weak = passwordError(password);
  if (weak) return { error: weak };
  if (isStaffEmail(email)) return { error: "This email can’t be used for a shop account." };
  let uid: string;
  try {
    const name = details ? `${details.contact.firstName} ${details.contact.lastName}`.trim() : "";
    const user = await auth().createUser({ email, password, ...(name ? { displayName: name } : {}) });
    uid = user.uid;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "auth/email-already-exists") return { error: "There’s already an account with this email.", exists: true };
    if (code === "auth/invalid-password") return { error: "That password won’t do. Try a longer one." };
    if (code === "auth/invalid-email") return { error: "That doesn’t look like an email address." };
    console.error("Account not made", e);
    return { error: "We couldn’t make your account just now. Try again in a little while." };
  }
  const [, signedIn] = await Promise.all([details ? saveDetails(uid, details) : null, signIn(email, password)]);
  // The welcome goes after the response, so signing up doesn't wait on the mail.
  after(() => sendWelcome(email, details?.contact.firstName.trim() || null, uid));
  return "error" in signedIn ? signedIn : { uid };
}

/**
 * Whether an email already has a customer account, for the footer's sign-up
 * to ask for the right password. An allowlisted staff address answers as
 * taken, the way `createAccount` treats it.
 */
export async function accountExists(email: string): Promise<boolean> {
  if (isStaffEmail(email)) return true;
  try {
    await auth().getUserByEmail(email.trim().toLowerCase());
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === "auth/user-not-found") return false;
    throw e;
  }
}

/**
 * Records that the customer agreed to marketing email, and where: the consent
 * a mailing list will need to show (POPIA asks for it). Kept in
 * `marketing/{uid}`, apart from the saved details; the first agreement's
 * date is kept, not overwritten.
 */
export async function recordMarketingConsent(uid: string, source: string): Promise<void> {
  try {
    await db().collection("marketing").doc(uid).create({ optedIn: true, at: new Date().toISOString(), source });
  } catch (e) {
    // gRPC ALREADY_EXISTS: agreed before, and that first date stands.
    if ((e as { code?: number }).code !== 6) throw e;
  }
}

export async function signOut(): Promise<void> {
  await session.end();
}

/** The signed-in customer, or null. Checked against revocation, once per request. */
export const currentCustomer = cache(async (): Promise<Customer | null> => {
  const decoded = await session.read();
  return decoded ? { uid: decoded.uid, email: decoded.email ?? "" } : null;
});

const customers = () => db().collection("customers");

export async function savedDetails(uid: string): Promise<SavedDetails | null> {
  const snap = await customers().doc(uid).get();
  return snap.exists ? (snap.data() as SavedDetails) : null;
}

/** Keeps the details from the latest order; an order collected from the shop leaves the saved address as it was. */
export async function saveDetails(uid: string, details: SavedDetails): Promise<void> {
  const update: Partial<SavedDetails> = { contact: details.contact };
  if (details.address) update.address = details.address;
  await customers().doc(uid).set(update, { merge: true });
}
