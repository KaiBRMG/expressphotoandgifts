"use server";

import { redirect } from "next/navigation";
import { accountExists, createAccount, detailsFrom, recordMarketingConsent, savedDetails, sendPasswordReset, signIn, signOut, type SavedDetails } from "@/lib/account/auth";
import { isEmail } from "@/lib/checkout/details";
import { attachCustomer, orderForReceipt } from "@/lib/checkout/orders";

/**
 * Customer account calls. Each is a public endpoint, so each checks what it
 * is handed: the receipt's token for making an account from an order.
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
  await recordMarketingConsent(result.uid, "footer").catch((e) => console.error("Consent not recorded", e));
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
