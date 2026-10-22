import "server-only";

import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { auth } from "@/lib/firebase";

/**
 * Firebase Auth from the server, shared by staff sign-in (`lib/admin/auth.ts`)
 * and customer accounts (`lib/account/auth.ts`). The password goes to
 * Firebase's REST API with the project's web API key, and the ID token that
 * comes back is traded for an httpOnly session cookie. Nothing of Firebase
 * runs in the browser.
 */
export async function identityToolkit(
  method: string,
  body: object,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; code: string }> {
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) return { ok: false, code: "NOT_CONFIGURED" };
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
  // Messages read like "TOO_MANY_ATTEMPTS_TRY_LATER : Access to this account…".
  return res.ok ? { ok: true, data } : { ok: false, code: (data.error?.message ?? "UNKNOWN").split(" ")[0] };
}

/** The addresses that sign in to /admin, lower-cased (ADMIN_EMAILS, comma-separated). */
export const adminAllowlist = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/** Whether an address is on the admin allowlist, however it was typed. */
export const isStaffEmail = (email: string) => adminAllowlist().includes(email.trim().toLowerCase());

/** What a wrong email or password is told, whichever it was. */
const NO_MATCH = "That email and password don’t match.";

/** Firebase's REST error codes, said the way a person would want to hear them. */
const SIGN_IN_ERRORS: Record<string, string> = {
  INVALID_LOGIN_CREDENTIALS: NO_MATCH,
  EMAIL_NOT_FOUND: NO_MATCH,
  INVALID_PASSWORD: NO_MATCH,
  INVALID_EMAIL: "That doesn’t look like an email address.",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Too many tries. Wait a few minutes, then try again.",
};

/**
 * Checks an email and password with Firebase, or says why not. `disabled`
 * and `notConfigured` are each caller's own words for those two cases;
 * `wrong` marks a password that simply doesn't match, for a caller that
 * already knows the email (the account page) to say so in its own words.
 */
export async function checkPassword(
  email: string,
  password: string,
  words: { disabled: string; notConfigured: string },
): Promise<{ idToken: string; uid: string; email: string } | { error: string; wrong?: true }> {
  const result = await identityToolkit("signInWithPassword", { email, password, returnSecureToken: true });
  if (result.ok) return { idToken: String(result.data.idToken), uid: String(result.data.localId), email: String(result.data.email ?? email) };
  if (result.code === "NOT_CONFIGURED") return { error: words.notConfigured };
  if (result.code === "USER_DISABLED") return { error: words.disabled };
  const error = SIGN_IN_ERRORS[result.code] ?? "Signing in didn’t work. Check your connection and try again.";
  return error === NO_MATCH ? { error, wrong: true } : { error };
}

/** Asks Firebase to email a reset link. Says nothing about whether the account exists. */
export async function sendPasswordReset(email: string): Promise<void> {
  await identityToolkit("sendOobCode", { requestType: "PASSWORD_RESET", email });
}

/** One kind of session: its cookie, the path it is sent on, and how long it lasts. */
export function sessionCookie(name: string, path: string, maxAgeMs: number) {
  return {
    async start(idToken: string) {
      const session = await auth().createSessionCookie(idToken, { expiresIn: maxAgeMs });
      (await cookies()).set(name, session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path,
        maxAge: maxAgeMs / 1000,
      });
    },
    async end() {
      (await cookies()).delete({ name, path });
    },
    /** The session's decoded token, or null. Checked against revocation. */
    async read(): Promise<DecodedIdToken | null> {
      const session = (await cookies()).get(name)?.value;
      if (!session) return null;
      return auth().verifySessionCookie(session, true).catch(() => null);
    },
  };
}
