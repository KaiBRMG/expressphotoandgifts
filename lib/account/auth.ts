import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { after } from "next/server";
import { cache } from "react";
import { auth, db } from "@/lib/firebase";
import { checkPassword, isStaffEmail, sendPasswordReset, sessionCookie } from "@/lib/identity";
import { sendEmail } from "@/lib/email";
import { passwordError, type Address, type Contact } from "@/lib/checkout/details";
import { checkEmail, sendWelcome } from "@/lib/checkout/emails";
import { siteUrl } from "@/lib/checkout/site";
import type { Order } from "@/lib/checkout/order";
import { claimGuestOrders, releaseOrders } from "./orders";

/**
 * Customer accounts: optional, made as the customer pays ("Save my details"
 * at checkout) or from the receipt after, so the details a customer gives
 * once fill checkout the next time.
 *
 * An account is made by the server with the Admin SDK (Firebase Auth's
 * public sign-up stays off; see `lib/admin/auth.ts`), never for an address on
 * the admin allowlist. Signing in follows the admin's pattern through
 * `lib/identity.ts`, with its own cookie on every path. The saved details
 * live in `customers/{uid}`, beside the proof that the account's email is
 * the customer's; the orders an account holds are `lib/account/orders.ts`.
 */

/** Two weeks, Firebase's longest session. */
const session = sessionCookie("epg_customer", "/", 14 * 24 * 60 * 60 * 1000);

export type Customer = { uid: string; email: string };
export type SavedDetails = { contact: Contact; address: Address | null };

export { sendPasswordReset };

const WORDS = {
  disabled: "This account has been switched off. Call the shop and we’ll sort it out.",
  notConfigured: "Accounts aren’t set up yet.",
};

/** Signs a customer in and sets the session cookie: who they are, or why not. */
export async function signIn(email: string, password: string): Promise<Customer | { error: string }> {
  const checked = await checkPassword(email, password, WORDS);
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

/** Where a customer can change their mind about marketing email. */
export type ConsentSource = "footer" | "account";

/** One change of mind about marketing email: when, which way, and where it was made. */
export type ConsentChange = { at: string; optedIn: boolean; source: ConsentSource };

/** `marketing/{uid}` as stored: the first agreement, then every change after it. */
type ConsentRecord = { optedIn: boolean; at: string; source: ConsentSource; withdrawnAt?: string; changes?: ConsentChange[] };

/** A customer's consent as the admin reads it: whether it stands now, and every change, the first agreement first. */
export type Consent = { optedIn: boolean; history: ConsentChange[] };

/**
 * Whether the customer agrees to marketing email (specials and campaigns),
 * and the record a mailing list will need to show (POPIA asks for it): kept
 * in `marketing/{uid}`, apart from the saved details. The first agreement's
 * date (`at`) stands; every later change, either way, is added to `changes`,
 * so a withdrawal is recorded, never erased.
 */
export async function setMarketing(uid: string, optedIn: boolean, source: ConsentSource): Promise<void> {
  const doc = db().collection("marketing").doc(uid);
  const now = new Date().toISOString();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(doc);
    const was = snap.exists ? (snap.data() as { optedIn?: boolean }) : null;
    if (!was) {
      // Never agreed, so there is nothing to withdraw.
      if (optedIn) tx.create(doc, { optedIn: true, at: now, source, changes: [] });
      return;
    }
    if (was.optedIn === optedIn) return;
    tx.update(doc, { optedIn, changes: FieldValue.arrayUnion({ at: now, optedIn, source } satisfies ConsentChange), ...(optedIn ? {} : { withdrawnAt: now }) });
  });
}

/** Whether the customer has agreed to marketing email and not withdrawn it. */
export async function marketingOn(uid: string): Promise<boolean> {
  const snap = await db().collection("marketing").doc(uid).get();
  return snap.data()?.optedIn === true;
}

/** Every customer's consent record, by uid, for the admin's customers and its mailing list. */
export async function allConsent(): Promise<Map<string, Consent>> {
  const snap = await db().collection("marketing").get();
  return new Map(
    snap.docs.map((d) => {
      const r = d.data() as ConsentRecord;
      return [d.id, { optedIn: r.optedIn, history: [{ at: r.at, optedIn: true, source: r.source }, ...(r.changes ?? [])] }];
    }),
  );
}

/**
 * A new password, given the current one. Every other device signed in to the
 * account is signed out (its session revoked); this one signs in again with
 * the new password, so the customer stays where they are.
 */
export async function changePassword(c: Customer, current: string, next: string): Promise<{ ok: true } | { error: string; field?: "current" | "next" }> {
  const weak = passwordError(next);
  if (weak) return { error: weak, field: "next" };
  if (next === current) return { error: "That’s the password you have now. Choose a new one.", field: "next" };
  const refused = await confirmPassword(c, current);
  if (refused) return refused.wrong ? { error: "That isn’t your current password.", field: "current" } : { error: refused.error };
  try {
    await auth().updateUser(c.uid, { password: next });
  } catch (e) {
    if ((e as { code?: string }).code === "auth/invalid-password") return { error: "That password won’t do. Try a longer one.", field: "next" };
    console.error("Password not changed", c.uid, e);
    return { error: "We couldn’t change your password just now. Try again in a little while." };
  }
  await auth().revokeRefreshTokens(c.uid);
  const again = await signIn(c.email, next);
  return "error" in again ? { error: "Your password is changed. Sign in again with the new one." } : { ok: true };
}

/** Whether a password is the signed-in account's: null when it is, or why not (`wrong` when it simply doesn't match). */
async function confirmPassword(c: Customer, password: string): Promise<{ error: string; wrong: boolean } | null> {
  const checked = await checkPassword(c.email, password, WORDS);
  return "error" in checked ? { error: checked.error, wrong: checked.wrong === true } : null;
}

/**
 * Deletes the account for good, given its password, once nothing on it is
 * still on its way: the orders let go of first (`releaseOrders`: their
 * photos deleted, the orders kept unlinked), then the saved details, the
 * marketing record and the sign-in, and this browser is signed out.
 */
export async function deleteAccount(c: Customer, password: string): Promise<{ ok: true } | { error: string }> {
  const refused = await confirmPassword(c, password);
  if (refused) return { error: refused.wrong ? "That isn’t your password." : refused.error };
  const released = await releaseOrders(c.uid);
  if ("error" in released) return released;
  const batch = db().batch();
  batch.delete(customers().doc(c.uid));
  batch.delete(db().collection("marketing").doc(c.uid));
  await batch.commit();
  await auth().deleteUser(c.uid);
  await signOut();
  return { ok: true };
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

/** The email link's token, by its hash, and when it stops working. */
type EmailCheck = { hash: string; until: string };

/** `customers/{uid}`: the saved details, and the proof the account's email is the customer's. */
type CustomerRecord = Partial<SavedDetails> & { emailCheck?: EmailCheck; verifiedEmail?: string; verifiedAt?: string };

const read = async (uid: string) => (await customers().doc(uid).get()).data() as CustomerRecord | undefined;

/** The details that fill checkout, and nothing else the record holds: they go to the browser. */
const detailsOf = (r: CustomerRecord | undefined): SavedDetails | null => (r?.contact ? { contact: r.contact, address: r.address ?? null } : null);

export const savedDetails = async (uid: string) => detailsOf(await read(uid));

/** The account page's one read of the record: the saved details, and whether the email is proved. */
export async function accountRecord(c: Customer): Promise<{ saved: SavedDetails | null; proved: boolean }> {
  const r = await read(c.uid);
  return { saved: detailsOf(r), proved: r?.verifiedEmail === c.email };
}

/* ---- Proving the email -------------------------------------------------- */

/** How long the email's link works. */
const CHECK_HOURS = 24;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Emails a link that proves the account's email is the customer's, so the
 * orders placed with it before the account can join it. Only the token's
 * hash is kept; a new link replaces the last one.
 */
export async function startEmailCheck(c: Customer): Promise<{ ok: true } | { error: string }> {
  const site = siteUrl();
  if (!site) return { error: "Email links aren’t set up yet. Call the shop and we’ll add your orders for you." };
  const token = randomBytes(24).toString("base64url");
  const until = new Date(Date.now() + CHECK_HOURS * 3_600_000).toISOString();
  await customers().doc(c.uid).set({ emailCheck: { hash: sha(token), until } satisfies EmailCheck }, { merge: true });
  const link = `${site}/account/verify?u=${encodeURIComponent(c.uid)}&t=${token}`;
  const sent = await sendEmail(checkEmail(c.email, link, `account-check/${c.uid}/${sha(token).slice(0, 12)}`));
  if (!sent.ok) {
    console.error("Email check not sent", c.uid, sent.error);
    return { error: "We couldn’t send the email just now. Try again in a few minutes." };
  }
  return { ok: true };
}

/**
 * The email's link, followed: proves the address (in the record and on
 * Firebase's user), then brings in its orders. Works once, within its time.
 */
export async function finishEmailCheck(uid: string, token: string): Promise<{ claimed: number } | { error: "expired" | "invalid" }> {
  if (!uid || !token) return { error: "invalid" };
  const [record, user] = await Promise.all([read(uid), auth().getUser(uid).catch(() => null)]);
  const check = record?.emailCheck;
  if (!check || !user?.email) return { error: "invalid" };
  const given = Buffer.from(sha(token));
  if (given.length !== check.hash.length || !timingSafeEqual(given, Buffer.from(check.hash))) return { error: "invalid" };
  if (Date.parse(check.until) < Date.now()) return { error: "expired" };
  await Promise.all([
    customers().doc(uid).update({ verifiedEmail: user.email, verifiedAt: new Date().toISOString(), emailCheck: FieldValue.delete() }),
    user.emailVerified ? null : auth().updateUser(uid, { emailVerified: true }),
  ]);
  return { claimed: await claimGuestOrders({ uid, email: user.email }) };
}

/** Keeps the details from the latest order; an order collected from the shop leaves the saved address as it was. */
export async function saveDetails(uid: string, details: SavedDetails): Promise<void> {
  const update: Partial<SavedDetails> = { contact: details.contact };
  if (details.address) update.address = details.address;
  await customers().doc(uid).set(update, { merge: true });
}

/** The account page's edit: the details exactly as the customer left them, a removed address included. */
export async function replaceDetails(uid: string, details: SavedDetails): Promise<void> {
  await customers().doc(uid).set({ contact: details.contact, address: details.address }, { merge: true });
}
