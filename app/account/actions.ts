"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  changePassword,
  createAccount,
  currentCustomer,
  detailsFrom,
  deleteAccount,
  replaceDetails,
  savedDetails,
  sendPasswordReset,
  setMarketing,
  signIn,
  startEmailCheck,
  signOut,
  type SavedDetails,
} from "@/lib/account/auth";
import { deletePhotos, reorder, type Reorder } from "@/lib/account/orders";
import { addressErrors, cleanAddress, cleanContact, contactErrors, hasErrors, isBlankAddress, isEmail, readAddress, readContact, type Address, type Contact } from "@/lib/checkout/details";
import { REF } from "@/lib/checkout/order";
import { callerIp, rateLimit } from "@/lib/rateLimit";
import { withdrawMarketing } from "@/lib/subscribers";
import { attachCustomer, orderForReceipt } from "@/lib/checkout/orders";

/**
 * Customer account calls. Each is a public endpoint, so each checks what it
 * is handed: the receipt's token for making an account from an order, and
 * the session for everything done to the account it belongs to.
 */

export type AccountState = { error?: string; notice?: string } | null;

const NEEDS_BOTH = { error: "Enter your email and password." };

/** Signs in from checkout and hands back the saved details to fill the form with. */
export async function signInForCheckout(email: string, password: string): Promise<{ error: string } | { details: SavedDetails | null; email: string }> {
  if (!isEmail(email) || !password) return NEEDS_BOTH;
  const customer = await signIn(email.trim(), password);
  if ("error" in customer) return customer;
  return { details: await savedDetails(customer.uid), email: customer.email };
}

/** The account page's sign-in form. */
export async function signInAction(_: AccountState, form: FormData): Promise<AccountState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!isEmail(email) || !password) return NEEDS_BOTH;
  const customer = await signIn(email, password);
  if ("error" in customer) return customer;
  redirect("/account");
}

export async function resetPasswordAction(email: string): Promise<AccountState> {
  if (!isEmail(email)) return { error: "Enter your email first, then ask for a reset link." };
  await sendPasswordReset(email.trim());
  return { notice: `If ${email.trim()} has an account, a link to set a new password is on its way.` };
}

const accountsMade = rateLimit(5, 60 * 60_000);

/**
 * The sign-in page's "Make an account": an email and a password, and the
 * customer is signed in. The footer's sign-up no longer makes accounts (it
 * subscribes to specials, `app/subscription`); this is the one place to make
 * one without an order, besides ticking "Save my details" at checkout.
 */
export async function makeAccountAction(_: AccountState, form: FormData): Promise<AccountState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!isEmail(email) || !password) return NEEDS_BOTH;
  const ip = callerIp(await headers());
  if (ip && !accountsMade(ip)) return BUSY;
  const made = await createAccount(email, password, null);
  if ("error" in made) return { error: made.exists ? `${made.error} Sign in above with its password.` : made.error };
  redirect("/account");
}

export async function signOutAction(): Promise<void> {
  await signOut();
}

/**
 * Makes an account from a paid order, for whoever holds its receipt link:
 * the details from the order, and the password they choose.
 */
export async function createAccountFromOrder(ref: string, token: string, password: string): Promise<AccountState> {
  const order = await orderForReceipt(String(ref), String(token));
  if (!order || order.status !== "paid") return { error: "Accounts can be made once the payment has gone through." };
  if (order.uid) return { notice: "This order is already saved to an account." };
  const made = await createAccount(order.contact.email, String(password), detailsFrom(order));
  if ("error" in made) return { error: made.exists ? `${made.error} Sign in at checkout next time and your details will be filled in.` : made.error };
  await attachCustomer(order.ref, made.uid).catch(() => {});
  return { notice: "Saved. Next time, sign in at checkout and your details will be filled in." };
}

/* ---- The signed-in account page ------------------------------------------ */

const SIGNED_OUT = { error: "You’ve been signed out. Sign in again to carry on." };
const BUSY = { error: "That’s a lot of tries at once. Wait a few minutes, then try again." };

/** Per account: password checks, reorders and emails each have their own allowance. A reorder asks Cloudinary's Admin API, which the free plan allows 500 calls an hour in all. */
const passwordTries = rateLimit(10, 10 * 60_000);
const reorders = rateLimit(10, 60 * 60_000);
const checkEmails = rateLimit(3, 60 * 60_000);
const photoDeletes = rateLimit(20, 60 * 60_000);

export type DetailsErrors = Partial<Record<keyof Contact | keyof Address, string>>;
export type DetailsResult = { ok: true; details: SavedDetails } | { errors: DetailsErrors } | { error: string };

/**
 * The account page's edit of the saved details. The email is the account's
 * own and is not changed here. The address may be left empty, to remove it;
 * one partly typed must be complete.
 */
export async function saveDetailsAction(rawContact: unknown, rawAddress: unknown): Promise<DetailsResult> {
  const customer = await currentCustomer();
  if (!customer) return SIGNED_OUT;
  const typed = readContact(rawContact);
  const address = readAddress(rawAddress);
  if (!typed || !address) return { error: "Something went wrong reading your details. Reload the page and try again." };
  const contact = { ...typed, email: customer.email };
  const blank = isBlankAddress(address);
  const errors = { ...contactErrors(contact), ...(blank ? {} : addressErrors(address)) };
  if (hasErrors(errors)) return { errors };
  const details: SavedDetails = { contact: cleanContact(contact), address: blank ? null : cleanAddress(address) };
  await replaceDetails(customer.uid, details);
  return { ok: true, details };
}

/** The specials-and-campaigns switch: saved at once, either way, with the change recorded. Turning it off clears an email-only subscription to the same address too. */
export async function setMarketingAction(on: boolean): Promise<{ ok: true } | { error: string }> {
  const customer = await currentCustomer();
  if (!customer) return SIGNED_OUT;
  try {
    if (on === true) await setMarketing(customer.uid, true, "account");
    else await withdrawMarketing(customer.email, "account", customer.uid);
    return { ok: true };
  } catch (e) {
    console.error("Marketing choice not saved", customer.uid, e);
    return { error: "That didn’t save. Check your connection and try again." };
  }
}

export async function changePasswordAction(current: string, next: string): Promise<{ ok: true } | { error: string; field?: "current" | "next" }> {
  const customer = await currentCustomer();
  if (!customer) return SIGNED_OUT;
  if (!passwordTries(customer.uid)) return BUSY;
  if (!String(current)) return { error: "Enter your current password.", field: "current" };
  return changePassword(customer, String(current), String(next));
}

/** Emails the link that proves the account's email, to bring in orders placed with it before. */
export async function requestOrderCheck(): Promise<AccountState> {
  const customer = await currentCustomer();
  if (!customer) return SIGNED_OUT;
  if (!checkEmails(customer.uid)) return { error: "We’ve sent a few already. Check your inbox and spam folder, or try again in an hour." };
  const sent = await startEmailCheck(customer);
  return "error" in sent ? sent : { notice: `Sent to ${customer.email}. Tap the link in it within 24 hours and your earlier orders will appear here.` };
}

/** An old order back in the cart, for the browser to add: lines, photos and places. */
export async function reorderAction(ref: string): Promise<Reorder | { error: string }> {
  const customer = await currentCustomer();
  if (!customer) return SIGNED_OUT;
  if (!REF.test(String(ref))) return { error: "We can’t find that order on your account." };
  if (!reorders(customer.uid)) return BUSY;
  try {
    return await reorder(customer, String(ref));
  } catch (e) {
    console.error("Reorder failed", ref, e);
    return { error: "That didn’t work just now. Try again in a minute." };
  }
}

/** Deletes the photos the shop keeps for one of the signed-in customer's orders. */
export async function deletePhotosAction(ref: string): Promise<{ ok: true } | { error: string }> {
  const customer = await currentCustomer();
  if (!customer) return SIGNED_OUT;
  if (!REF.test(ref)) return { error: "We can’t find that order on your account." };
  if (!photoDeletes(customer.uid)) return BUSY;
  try {
    return await deletePhotos(customer, ref);
  } catch (e) {
    console.error("Photo deletion failed", ref, e);
    return { error: "That didn’t work just now. Try again in a minute." };
  }
}

/** Deletes the account for good, given its password; then the page says goodbye. */
export async function deleteAccountAction(password: string): Promise<{ error: string }> {
  const customer = await currentCustomer();
  if (!customer) return SIGNED_OUT;
  if (!passwordTries(customer.uid)) return BUSY;
  if (!String(password)) return { error: "Enter your password to confirm." };
  const done = await deleteAccount(customer, String(password));
  if ("error" in done) return done;
  redirect("/account?deleted=1");
}
