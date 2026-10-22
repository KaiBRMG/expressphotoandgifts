import "server-only";

import { unstable_cache } from "next/cache";
import { SHOP } from "@/app/site/data";
import { checkBoxes, readBoxes, type Boxes } from "@/lib/checkout/boxes";
import { isEmail, LIMITS } from "@/lib/checkout/details";
import { db } from "@/lib/firebase";
import { MAX_RECIPIENTS } from "./settings-shared";

/**
 * The shop's settings the admin can change (`settings/shop`), written only
 * through the admin's Settings page. Reads are cached under SETTINGS_TAG, which
 * every save clears (`updateTag` in its server action): checkout quotes the
 * courier with the boxes on every address, and Firestore's free tier allows
 * 50k reads a day.
 *
 * `orderEmailTo` is who the shop's new-order email goes to: one address, several,
 * or none. Until the Settings page has saved once, it's ORDER_EMAIL_TO, or the
 * shop's own address.
 *
 * `boxes` are the name, outside size and empty weight of each box the shop ships in
 * (`lib/checkout/boxes.ts`); until saved, the placeholders there.
 */


const doc = () => db().collection("settings").doc("shop");

/** Tag for updateTag() after a save. */
export const SETTINGS_TAG = "settings";

const saved = unstable_cache(async (): Promise<Record<string, unknown>> => (await doc().get()).data() ?? {}, ["settings-shop"], { tags: [SETTINGS_TAG], revalidate: 3600 });

const fallback = () => [process.env.ORDER_EMAIL_TO?.trim() || SHOP.email];

/** Where the shop's new-order email goes. Empty when the shop has turned it off. */
export async function orderRecipients(): Promise<string[]> {
  const emails = (await saved()).orderEmailTo;
  return Array.isArray(emails) ? emails.filter((e): e is string => typeof e === "string") : fallback();
}

/** Checks and saves the list: each a real address, no repeats, at most `MAX_RECIPIENTS`. */
export async function saveOrderRecipients(raw: unknown, by: string): Promise<{ ok: true; emails: string[] } | { error: string }> {
  if (!Array.isArray(raw) || raw.some((e) => typeof e !== "string")) return { error: "Something went wrong reading that. Reload the page and try again." };
  const emails = [...new Set((raw as string[]).map((e) => e.trim().toLowerCase()))].filter(Boolean);
  const bad = emails.find((e) => !isEmail(e) || e.length > LIMITS.email);
  if (bad) return { error: `“${bad}” doesn’t look like an email address.` };
  if (emails.length > MAX_RECIPIENTS) return { error: `Up to ${MAX_RECIPIENTS} addresses, please.` };
  await doc().set({ orderEmailTo: emails, updatedAt: new Date().toISOString(), updatedBy: by }, { merge: true });
  return { ok: true, emails };
}

/** The boxes the shop ships in, as Settings last saved them. */
export async function shippingBoxes(): Promise<Boxes> {
  return readBoxes((await saved()).boxes);
}

/** Checks and saves the boxes' names, sizes and empty weights. */
export async function saveShippingBoxes(raw: unknown, by: string): Promise<{ ok: true; boxes: Boxes } | { error: string }> {
  const checked = checkBoxes(raw);
  if (!("ok" in checked)) return checked;
  await doc().set({ boxes: checked.boxes, updatedAt: new Date().toISOString(), updatedBy: by }, { merge: true });
  return checked;
}
