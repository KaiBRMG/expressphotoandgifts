"use server";

import { redirect } from "next/navigation";
import { createAccount, detailsFrom, savedDetails, sendPasswordReset, signIn, signOut, type SavedDetails } from "@/lib/account/auth";
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
  const made = await createAccount(detailsFrom(order), String(password));
  if ("error" in made) return made;
  await attachCustomer(order.ref, made.uid).catch(() => {});
  return { notice: "Saved. Next time, sign in at checkout and your details will be filled in." };
}
