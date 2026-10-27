/**
 * Marks every existing Firebase Auth account that is not staff's as a
 * customer's (custom claim `customer: true`, `CUSTOMER_CLAIMS` in
 * lib/identity.ts), so the admin allowlist (ADMIN_EMAILS) can never let one in
 * if its address is listed later. Accounts made by the shop since the mark
 * existed already have it; this covers the ones made before.
 *
 *   node --env-file=.env.local scripts/mark-customer-accounts.mts --dry-run
 *   node --env-file=.env.local scripts/mark-customer-accounts.mts
 *
 * Run it BEFORE adding anyone to ADMIN_EMAILS, and with ADMIN_EMAILS set as it
 * is now: listed addresses and `admin: true` accounts are skipped. Any other
 * claims an account has are kept.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const DRY_RUN = process.argv.includes("--dry-run");

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!key) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
const auth = getAuth(initializeApp({ credential: cert(JSON.parse(key)) }));

const staff = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

let marked = 0;
let skipped = 0;
let page: string | undefined;
do {
  const res = await auth.listUsers(1000, page);
  for (const u of res.users) {
    const claims = u.customClaims ?? {};
    if (claims.admin === true || claims.customer === true || (u.email && staff.has(u.email.toLowerCase()))) {
      skipped++;
      continue;
    }
    console.log(`${DRY_RUN ? "would mark" : "marking"} ${u.email ?? u.uid}`);
    if (!DRY_RUN) await auth.setCustomUserClaims(u.uid, { ...claims, customer: true });
    marked++;
  }
  page = res.pageToken;
} while (page);

console.log(`${DRY_RUN ? "Would mark" : "Marked"} ${marked} account(s); left ${skipped} as they were.`);
