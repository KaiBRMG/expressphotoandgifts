import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { accountUid, marketingOn, setMarketing, type Consent, type ConsentChange } from "@/lib/account/auth";
import { customerKey } from "@/lib/campaigns";
import { confirmSubscriptionEmail } from "@/lib/checkout/emails";
import { siteUrl } from "@/lib/checkout/site";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/firebase";
import { isStaffEmail } from "@/lib/identity";
import { safeEqual } from "@/lib/secure";
import { shopContact } from "@/lib/settings";

/**
 * Marketing email for someone with no account: the footer's "Email me
 * specials". An address is asked for, a link is emailed to it, and only
 * following that link subscribes it, so nobody can sign up an address that
 * isn't theirs. Kept in `subscribers/{customerKey}` with the date they agreed
 * and every change after (POPIA asks the shop to be able to show it). A record
 * with no `at` is a link asked for and not yet followed: not a subscriber.
 *
 * Someone who has an account keeps their choice where it already lives,
 * `marketing/{uid}`, and the link switches that on instead. An address that
 * subscribes first and makes an account later carries the choice across when
 * the account is made (`adoptSubscription` in `lib/account/auth.ts`). Withdrawing, from an email's link or
 * the account page, clears both.
 */

type SubscriberRecord = {
  email: string;
  /** Set once the link has been followed; absent until then. */
  status?: "subscribed" | "unsubscribed";
  /** An unfollowed link's token, hashed, and when it stops working. */
  hash?: string;
  until?: string;
  /** The first agreement, which stands; every later change is in `changes`. */
  at?: string;
  changes?: ConsentChange[];
};

const subscribers = () => db().collection("subscribers");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const LINK_DAYS = 3;

/**
 * Emails the link that confirms the subscription. `email` is already
 * lowercase and valid (the action checks it). Says nothing about whether the
 * address was already subscribed or has an account (it simply sends no second
 * link then), so the form can't be used to find out who is a customer.
 */
export async function requestSubscription(email: string): Promise<{ ok: true } | { error: string }> {
  const site = siteUrl();
  if (!site) return { error: "Email links aren’t set up yet. Call the shop and we’ll add you." };
  // Staff addresses are never customers; answer as if sent.
  if (isStaffEmail(email)) return { ok: true };

  const key = customerKey(email);
  const [snap, uid, reach] = await Promise.all([subscribers().doc(key).get(), accountUid(email), shopContact()]);
  if ((snap.data() as SubscriberRecord | undefined)?.status === "subscribed") return { ok: true };
  if (uid && (await marketingOn(uid))) return { ok: true };

  const token = randomBytes(24).toString("base64url");
  const until = new Date(Date.now() + LINK_DAYS * 86_400_000).toISOString();
  // A merge: someone who unsubscribed and asks again keeps the history they already have.
  await subscribers().doc(key).set({ email, hash: sha(token), until }, { merge: true });

  const link = `${site}/subscription/confirm?e=${key}&t=${token}`;
  const sent = await sendEmail(confirmSubscriptionEmail(email, link, `subscribe/${key.slice(0, 16)}/${sha(token).slice(0, 12)}`, reach));
  if (!sent.ok) {
    console.error("Subscription link not sent", sent.error);
    return { error: "We couldn’t send the email just now. Try again in a few minutes." };
  }
  return { ok: true };
}

/** The emailed link, followed: subscribes the address (or switches on the account that has it). Works once, within its days. */
export async function confirmSubscription(key: string, token: string): Promise<"ok" | "expired" | "invalid"> {
  if (!/^[0-9a-f]{64}$/.test(key) || !token) return "invalid";
  const ref = subscribers().doc(key);
  const record = (await ref.get()).data() as SubscriberRecord | undefined;
  if (!record?.hash || !record.until || !safeEqual(sha(token), record.hash)) return "invalid";
  if (Date.parse(record.until) < Date.now()) return "expired";

  const uid = await accountUid(record.email);
  if (uid) {
    // Their account holds the choice; the link only spoke for it.
    await setMarketing(uid, true, "footer");
    await ref.delete();
    return "ok";
  }
  const now = new Date().toISOString();
  const change: ConsentChange = { at: now, optedIn: true, source: "footer" };
  await ref.update({
    status: "subscribed",
    hash: FieldValue.delete(),
    until: FieldValue.delete(),
    ...(record.at ? { changes: FieldValue.arrayUnion(change) } : { at: now, changes: [] }),
  });
  return "ok";
}

/** Just the email-only subscription: what the account page's switch clears when it is turned off. */
export async function withdrawSubscription(email: string, source: ConsentChange["source"]): Promise<void> {
  const ref = subscribers().doc(customerKey(email));
  await db().runTransaction(async (tx) => {
    const record = (await tx.get(ref)).data() as SubscriberRecord | undefined;
    if (record?.status !== "subscribed") return;
    tx.update(ref, { status: "unsubscribed", changes: FieldValue.arrayUnion({ at: new Date().toISOString(), optedIn: false, source } satisfies ConsentChange) });
  });
}

/**
 * Stops marketing email to an address, wherever the agreement was kept: the
 * subscription and the account's switch both. Safe to repeat, and a no-op for
 * an address that never agreed. A caller that already knows the account's uid
 * passes it, which saves looking it up.
 */
export async function withdrawMarketing(email: string, source: ConsentChange["source"], knownUid?: string): Promise<void> {
  const [uid] = await Promise.all([knownUid ?? accountUid(email), withdrawSubscription(email, source)]);
  if (uid) await setMarketing(uid, false, source);
}

/** Every address that has agreed to marketing email without an account, by lowercase email, with its record; for the admin's lists. */
export async function allSubscribers(): Promise<Map<string, Consent>> {
  const snap = await subscribers().get();
  const out = new Map<string, Consent>();
  for (const d of snap.docs) {
    const r = d.data() as SubscriberRecord;
    if (!r.at) continue; // asked for a link, never followed it
    out.set(r.email, { optedIn: r.status === "subscribed", history: [{ at: r.at, optedIn: true, source: "footer" }, ...(r.changes ?? [])] });
  }
  return out;
}

/**
 * The daily clean-up: a link nobody followed holds an address that never
 * agreed to anything, so once it has expired the request is deleted. A record
 * with a history (someone who unsubscribed and asked again) keeps the history
 * and loses only the dead link.
 */
export async function sweepPendingSubscriptions(): Promise<{ deleted: number }> {
  const stale = await subscribers().where("until", "<", new Date().toISOString()).select("at").get();
  let deleted = 0;
  // A batch takes 500 writes at most.
  for (let i = 0; i < stale.size; i += 500) {
    const batch = db().batch();
    for (const d of stale.docs.slice(i, i + 500)) {
      if ((d.data() as Pick<SubscriberRecord, "at">).at) batch.update(d.ref, { hash: FieldValue.delete(), until: FieldValue.delete() });
      else {
        batch.delete(d.ref);
        deleted++;
      }
    }
    await batch.commit();
  }
  return { deleted };
}
