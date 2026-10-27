import "server-only";

import { createHmac } from "node:crypto";
import type { DocumentSnapshot, Transaction } from "firebase-admin/firestore";

import { phaseOf, stackOrder, type Campaign, type LiveCampaign } from "@/lib/catalog/campaigns";
import { CODE_ALPHABET, CODE_LENGTH, formatCode, normalizeCode } from "@/lib/catalog/codes";
import type { Availability } from "@/lib/catalog/stock";
import { db } from "@/lib/firebase";
import { campaignDocs, campaignFromDoc, customerKey, readLiveDeals, resolveAll } from "@/lib/campaigns";
import { getSoldOut } from "@/lib/stock";

/**
 * Single-use codes for a campaign that needs one (`caps.code`). Email all
 * makes one for each customer it sends the campaign to, and the email says to
 * enter it at checkout; the deal is on no shelf, card or page, and an order
 * gets it only with a code that is unused and whose campaign is live. Paying
 * uses the code up, in the transaction that marks the order paid, so a failed
 * or abandoned payment costs the customer nothing.
 *
 *   campaignCodes/{code}   { campaign, mailing, to (customerKey of who it was emailed to), at, test?, redeemed?: { ref, at } }
 *
 * A code isn't tied to the email it was sent to (a customer may pay with
 * another address, or forward it to a friend); being used once is what stops
 * it being shared widely. Refunds don't give a code back.
 */

export const codes = () => db().collection("campaignCodes");

/** Keyed from the service-account key, like the unsubscribe link: the server has it, no browser does. */
let key: Buffer | undefined;
const secret = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  return (key ??= createHmac("sha256", raw).update("campaign-codes").digest());
};

/**
 * The code for one customer in one mailing. Worked out, not drawn at random,
 * so a send that is tried again with the same id makes the same codes and
 * therefore the same emails, which Resend then recognises as the repeat it is.
 * 50 bits an unrelated guess would have to hit.
 */
function mint(mailing: string, email: string): string {
  const digest = createHmac("sha256", secret()).update(`${mailing}\n${customerKey(email)}`).digest();
  return Array.from({ length: CODE_LENGTH }, (_, i) => CODE_ALPHABET[digest[i] & 31]).join("");
}

/** Firestore takes 500 writes a batch. */
const BATCH = 400;

/**
 * Makes a code for each address and records them, before any email goes: an
 * email must never carry a code the shop doesn't know. Writing a code that
 * already exists changes none of what a redemption has set, so a send tried
 * again is harmless. Returns each address's code.
 */
export async function issueCodes(campaign: string, mailing: string, emails: string[], test = false): Promise<Map<string, string>> {
  const at = new Date().toISOString();
  const issued = new Map(emails.map((e) => [e, mint(mailing, e)]));
  const all = [...issued];
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = db().batch();
    for (const [email, code] of all.slice(i, i + BATCH)) {
      batch.set(codes().doc(code), { campaign, mailing, to: customerKey(email), at, ...(test ? { test: true } : {}) }, { merge: true });
    }
    await batch.commit();
  }
  return issued;
}

export type CodeCheck = { ok: true; code: string; campaign: Campaign } | { ok: false; error: string };

const UNKNOWN = "We don’t recognise that code. Check it and try again.";

const on = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", timeZone: "Africa/Johannesburg" });

/**
 * Whether a code can be used right now, read fresh: it exists, nobody has
 * used it, and its campaign is live. Each reason has words for the customer.
 * The code alone says nothing of the cart: whether it saves anything on this
 * one is for the cart's pricing to show.
 */
export async function checkCode(raw: unknown, now = Date.now()): Promise<CodeCheck> {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, error: UNKNOWN };
  const snap = await codes().doc(code).get();
  if (!snap.exists) return { ok: false, error: UNKNOWN };
  const given = snap.data()!;
  if (given.redeemed) return { ok: false, error: "That code has already been used. Each code works once." };

  const doc = await campaignDocs().doc(String(given.campaign)).get();
  const campaign = doc.exists ? campaignFromDoc(doc.id, doc.data()!) : null;
  if (!campaign) return { ok: false, error: "That offer has ended." };
  const phase = phaseOf(campaign, now);
  if (phase === "scheduled") return { ok: false, error: `That offer starts on ${on(campaign.startsAt!)}. Enter the code then.` };
  if (phase === "paused") return { ok: false, error: "That offer isn’t running right now. Try again later." };
  if (phase !== "live") return { ok: false, error: "That offer has ended." };
  // The shop took the code requirement off: the deal is on the shop for everyone, and a code stacked on it would double it.
  if (!campaign.caps.code) return { ok: false, error: "You don’t need this code any more: the deal is on the shop for everyone." };
  return { ok: true, code, campaign };
}

/** A checked code's campaign as the engine takes it, for the cart to price. */
export async function codeDeal(raw: unknown): Promise<{ ok: true; code: string; deal: LiveCampaign } | { ok: false; error: string }> {
  const [checked, soldOut] = await Promise.all([checkCode(raw), getSoldOut()]);
  if (!checked.ok) return checked;
  const [deal] = await resolveAll([checked.campaign], soldOut);
  return { ok: true, code: checked.code, deal };
}

/** The shop's live deals with the code's added, in the order they stack; the deals alone when the code can't be used. */
export async function dealsWithCode(deals: LiveCampaign[], raw: unknown): Promise<LiveCampaign[]> {
  if (raw === null || raw === undefined || raw === "") return deals;
  const coded = await codeDeal(raw);
  return coded.ok ? stackOrder([...deals.filter((d) => d.id !== coded.deal.id), coded.deal]) : deals;
}

/**
 * The deals to price an order with, read fresh: every live campaign the shop
 * shows, and the code's if it has one that can be used. `error` is why a code
 * given can't be, in the customer's words.
 */
export async function dealsForOrder(raw: string | null, soldOut: Availability): Promise<{ deals: LiveCampaign[]; code: { code: string; campaign: string } | null; error?: string }> {
  const [live, checked] = await Promise.all([readLiveDeals(), raw ? checkCode(raw) : null]);
  if (checked && !checked.ok) return { deals: await resolveAll(live, soldOut), code: null, error: checked.error };
  const cs = checked ? [...live.filter((c) => c.id !== checked.campaign.id), checked.campaign] : live;
  return { deals: await resolveAll(cs, soldOut), code: checked ? { code: checked.code, campaign: checked.campaign.id } : null };
}

/** In the paying transaction, before any write: the code the order used. */
export const readCode = (tx: Transaction, code: string) => tx.get(codes().doc(code));

/**
 * In the paying transaction, after its reads: uses the code up for this
 * order. The customer has already paid the discounted price, so a code found
 * used by another order (two orders paid with it at once) doesn't stop this
 * one being paid: it says what the shop should look at.
 */
export function redeemCode(tx: Transaction, snap: DocumentSnapshot, code: string, order: string, at: string): string | null {
  const used = snap.data()?.redeemed as { ref?: string } | undefined;
  if (!snap.exists) return `Code ${formatCode(code)} is not in the shop’s records, yet this order was priced with it. Check the deal it was given.`;
  if (used && used.ref !== order) return `Code ${formatCode(code)} had already been used on order ${used.ref}. The deal was given on both: decide whether to keep or refund the difference.`;
  if (!used) tx.update(snap.ref, { redeemed: { ref: order, at } });
  return null;
}

/** How many codes a campaign's emails carried, from the record of each send. */
export async function codesSent(campaign: string): Promise<number> {
  const sends = await db().collection("mailings").where("campaign.id", "==", campaign).get();
  return sends.docs.reduce((n, d) => n + (Number(d.data().codes) || 0), 0);
}
