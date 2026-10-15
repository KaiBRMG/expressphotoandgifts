import "server-only";

import { cache } from "react";
import { auth, db } from "@/lib/firebase";
import { adminAllowlist, checkPassword, sendPasswordReset, sessionCookie } from "@/lib/identity";
import { PASSWORD_MIN, type Address, type Contact } from "@/lib/checkout/details";
import type { Order } from "@/lib/checkout/order";

/**
 * Customer accounts: optional, and only ever offered after a paid order, so
 * the details a customer gives once fill checkout the next time.
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

/** What an order says about its customer, as an account keeps it. */
export const detailsFrom = (order: Pick<Order, "contact" | "fulfilment">): SavedDetails => ({
  contact: order.contact,
  address: order.fulfilment.method === "courier" ? order.fulfilment.address : null,
});

/**
 * Makes an account for a customer who has just paid, with the details from
 * their order, and signs them in. Says plainly when the email already has one.
 */
export async function createAccount(details: SavedDetails, password: string): Promise<{ error: string } | { uid: string }> {
  const email = details.contact.email.toLowerCase();
  if (password.length < PASSWORD_MIN) return { error: `Use at least ${PASSWORD_MIN} characters.` };
  if (adminAllowlist().includes(email)) return { error: "This email can’t be used for a shop account." };
  let uid: string;
  try {
    const user = await auth().createUser({ email, password, displayName: `${details.contact.firstName} ${details.contact.lastName}`.trim() });
    uid = user.uid;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "auth/email-already-exists") return { error: "There’s already an account with this email. Sign in at checkout next time and your details will be filled in." };
    if (code === "auth/invalid-password") return { error: `Use at least ${PASSWORD_MIN} characters.` };
    console.error("Account not made", e);
    return { error: "We couldn’t make your account just now. Your order is safe; try again later." };
  }
  const [, signedIn] = await Promise.all([saveDetails(uid, details), signIn(email, password)]);
  return "error" in signedIn ? signedIn : { uid };
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
