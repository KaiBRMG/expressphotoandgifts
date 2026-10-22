"use server";

import { redirect } from "next/navigation";
import {
  accountExists,
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
import { reorder, type Reorder } from "@/lib/account/orders";
import { addressErrors, cleanAddress, cleanContact, contactErrors, hasErrors, isBlankAddress, isEmail, readAddress, readContact, type Address, type Contact } from "@/lib/checkout/details";
import { REF } from "@/lib/checkout/order";
import { rateLimit } from "@/lib/rateLimit";
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

/**
 * The footer sign-up's first step: whether the email it was handed already
 * has an account, so the field that follows asks for the right password.
 */
export async function lookupSignUpEmail(email: string): Promise<{ exists: boolean } | { error: string }> {
  const address = String(email).trim();
  if (!isEmail(address)) return { error: "That doesn’t look like an email address." };
  try {
    return { exists: await accountExists(address) };
  } catch (e) {
    console.error("Email lookup failed", e);
    return { error: "We couldn’t check that email just now. Try again in a moment." };
  }
}

export type SignUpResult = { done: "created" | "signedIn" } | { error: string; exists?: boolean };

/**
 * The footer sign-up's second step: makes the account (`exists: false`) or
 * signs in to the one the email already has, and records the marketing
 * consent the form's small print asks for. If the lookup was wrong by the
 * time the password comes (someone made the account meanwhile), says so
 * with `exists` so the form can turn into the other one.
 */
export async function footerSignUp(email: string, password: string, exists: boolean): Promise<SignUpResult> {
  const address = String(email).trim();
  const secret = String(password);
  if (!isEmail(address) || !secret) return NEEDS_BOTH;
  const result = exists ? await signIn(address, secret) : await createAccount(address, secret, null);
  if ("error" in result) {
    return "exists" in result && result.exists ? { error: `${result.error} Enter its password to sign in.`, exists: true } : { error: result.error };
  }
  await setMarketing(result.uid, true, "footer").catch((e) => console.error("Consent not recorded", e));
  return { done: exists ? "signedIn" : "created" };
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

/** The specials-and-campaigns switch: saved at once, either way, with the change recorded. */
export async function setMarketingAction(on: boolean): Promise<{ ok: true } | { error: string }> {
  const customer = await currentCustomer();
  if (!customer) return SIGNED_OUT;
  try {
    await setMarketing(customer.uid, on === true, "account");
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
