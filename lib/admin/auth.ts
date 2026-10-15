import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "@/lib/firebase";
import { adminAllowlist, checkPassword, sendPasswordReset, sessionCookie } from "@/lib/identity";

/**
 * Staff sign-in for /admin.
 *
 * The email and password go to Firebase Auth from the server (its REST API,
 * with the project's web API key), and the ID token that comes back is traded
 * for a Firebase session cookie, httpOnly and scoped to /admin. Nothing of
 * Firebase runs in the browser, so firestore.rules can keep denying it.
 *
 * Signing in is not enough: the account must be an admin, either by the
 * `admin: true` custom claim or by being listed in ADMIN_EMAILS
 * (comma-separated). Both are set outside the console.
 */

/** Five days, then sign in again. Firebase allows up to two weeks. */
const session = sessionCookie("epg_admin", "/admin", 5 * 24 * 60 * 60 * 1000);

export type Admin = { uid: string; email: string };

/**
 * Accounts made in the Firebase console are never email-verified, so the
 * allowlist cannot ask for it. What keeps a listed address safe is that its
 * account already exists (nobody else can register it) and that public
 * sign-up is switched off in Firebase Auth's settings. Customer accounts are
 * made by the server with the Admin SDK, which needs no public sign-up, and
 * never for a listed address (`lib/account/auth.ts`).
 */
const isAdmin = (t: DecodedIdToken) =>
  t.admin === true || (!!t.email && adminAllowlist().includes(t.email.toLowerCase()));

/** Signs a member of staff in and sets the session cookie, or says why not. */
export async function signIn(email: string, password: string): Promise<{ error: string } | null> {
  const checked = await checkPassword(email, password, {
    disabled: "This account has been switched off. Ask the shop’s owner to turn it back on.",
    notConfigured: "Sign-in isn’t set up yet: the Firebase web API key is missing.",
  });
  if ("error" in checked) return checked;
  if (!isAdmin(await auth().verifyIdToken(checked.idToken))) return { error: "This account doesn’t have access to the admin." };
  await session.start(checked.idToken);
  return null;
}

export { sendPasswordReset };

/**
 * Ends this browser's session only. Staff may share one account across the
 * counter PC and a laptop, so revoking the account's tokens would sign out
 * the other machine too.
 */
export async function signOut(): Promise<void> {
  await session.end();
}

/** The signed-in admin, or null. Checked against revocation, once per request. */
export const currentAdmin = cache(async (): Promise<Admin | null> => {
  const decoded = await session.read();
  return decoded && isAdmin(decoded) ? { uid: decoded.uid, email: decoded.email ?? "" } : null;
});

/** For every admin page and action: the admin, or off to the sign-in page. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
