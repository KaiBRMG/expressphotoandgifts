import "server-only";

import { randomUUID } from "node:crypto";
import { issueCodes } from "@/lib/campaignCodes";
import { formatCode } from "@/lib/catalog/codes";
import { buildFeature, type CampaignFeature } from "@/lib/campaignFeature";
import { phaseOf, type Campaign } from "@/lib/catalog/campaigns";
import { getCategories, getProducts } from "@/lib/catalog/queries";
import { marketingEmail } from "@/lib/checkout/emails";
import { siteUrl } from "@/lib/checkout/site";
import { sendBatch } from "@/lib/email";
import { db } from "@/lib/firebase";
import { shopContact } from "@/lib/settings";
import { getSoldOut } from "@/lib/stock";
import { shopNames } from "@/lib/campaigns";
import { getCampaign, listCampaigns } from "./campaigns";
import { marketingRecipients } from "./customers";
import { MAILING_LIMITS, type EmailableCampaign } from "./mailingLimits";

/**
 * "Email all": one message from staff to every customer who agreed to
 * marketing email (specials and campaigns) and hasn't withdrawn, read fresh
 * when Send is pressed. Each customer gets their own email, so no one sees
 * another's address. A campaign may be attached: its deals, dates, products
 * and photos are worked out from the campaign as it stands at that moment
 * (`lib/campaignFeature.ts`), never taken from the browser. When the campaign
 * needs a code (`caps.code`), each customer's email carries a code made for
 * them alone (`lib/campaignCodes.ts`), recorded before anything is sent. Every
 * send is kept under `mailings/{id}` with who sent it, the subject and
 * message, the campaign, how many codes and how many went, as the record that
 * the shop emailed only people who agreed.
 */

/** `coded`: each email carried its own one-time code. */
export type MailingResult = { ok: true; sent: number; failed: number; coded: boolean; error?: string } | { error: string };

/** What the preview shows where a customer's code goes: it has an O in it, which no real code has. */
const SAMPLE_CODE = "SAMPLE-CODE";

const NO_SITE = { error: "SITE_URL isn’t set, so the email couldn’t carry its Unsubscribe link. Set it in the host’s settings first." };

/** The subject and message trimmed and checked; or what is wrong with them. A campaign carries the email on its own, so the message may then be empty. */
function check(subject: unknown, message: unknown, hasCampaign: boolean): { subject: string; message: string } | { error: string } {
  const s = typeof subject === "string" ? subject.replace(/\s+/g, " ").trim() : "";
  const m = typeof message === "string" ? message.replace(/\r\n/g, "\n").trim() : "";
  if (!s) return { error: "Add a subject." };
  if (s.length > MAILING_LIMITS.subject) return { error: `Keep the subject to ${MAILING_LIMITS.subject} characters.` };
  if (!m && !hasCampaign) return { error: "Write a message, or choose a campaign to send." };
  if (m.length > MAILING_LIMITS.message) return { error: `Keep the message to ${MAILING_LIMITS.message} characters.` };
  return { subject: s, message: m };
}

/** The campaigns an email can promote: live now, or scheduled to be. */
export async function emailableCampaigns(): Promise<EmailableCampaign[]> {
  const now = Date.now();
  return (await listCampaigns())
    .flatMap((c) => {
      const phase = phaseOf(c, now);
      return phase === "live" || phase === "scheduled" ? [{ id: c.id, name: c.name, phase, startsAt: c.startsAt, endsAt: c.endsAt, code: c.caps.code }] : [];
    })
    .sort((a, b) => Number(b.phase === "live") - Number(a.phase === "live") || a.name.localeCompare(b.name));
}

/** The chosen campaign's email block as it stands now; null for none chosen, or why it can't be sent. */
async function featureFor(campaignId: unknown): Promise<{ campaign: Campaign; feature: CampaignFeature } | null | { error: string }> {
  if (campaignId === null || campaignId === undefined || campaignId === "") return null;
  const campaign = typeof campaignId === "string" ? await getCampaign(campaignId) : null;
  if (!campaign) return { error: "That campaign has been deleted. Choose another." };
  const [products, categories, names, soldOut] = await Promise.all([getProducts(), getCategories(), shopNames(), getSoldOut()]);
  const feature = buildFeature({ campaign, products, categories, names, soldOut, base: siteUrl() ?? "", cloud: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || null, now: Date.now() });
  return feature ? { campaign, feature } : { error: `${campaign.name} isn’t live or scheduled, so it can’t be sent as a deal.` };
}

/** The email as customers will get it, as HTML, for the dialog's preview. */
export async function preview(subject: unknown, message: unknown, campaignId: unknown): Promise<{ html: string } | { error: string }> {
  if (!siteUrl()) return NO_SITE;
  const picked = await featureFor(campaignId);
  if (picked && "error" in picked) return picked;
  const checked = check(subject, message, picked !== null);
  if ("error" in checked) return checked;
  const feature = picked ? { ...picked.feature, ...(picked.feature.needsCode ? { code: SAMPLE_CODE } : {}) } : null;
  return { html: marketingEmail("preview@example.com", checked.subject, checked.message, await shopContact(), feature).html };
}

/** The email as customers will get it, sent to the staff member alone. */
export async function sendTest(subject: unknown, message: unknown, campaignId: unknown, staffEmail: string): Promise<MailingResult> {
  if (!siteUrl()) return NO_SITE;
  const picked = await featureFor(campaignId);
  if (picked && "error" in picked) return picked;
  const checked = check(subject, message, picked !== null);
  if ("error" in checked) return checked;
  // The code is a real one, so the test can be followed through checkout.
  const test = `test-${randomUUID()}`;
  const coded = picked?.feature.needsCode ?? false;
  const code = coded ? (await issueCodes(picked!.campaign.id, test, [staffEmail], true)).get(staffEmail) : undefined;
  const feature = picked ? { ...picked.feature, ...(code ? { code: formatCode(code) } : {}) } : null;
  // Only the subject line says it's a test; the email itself reads as customers will get it.
  const mail = marketingEmail(staffEmail, checked.subject, checked.message, await shopContact(), feature);
  const sent = await sendBatch([{ ...mail, subject: `[Test] ${mail.subject}` }], `marketing-test/${test}`);
  return sent.sent ? { ok: true, sent: 1, failed: 0, coded } : { error: sent.error ?? "The test wasn’t sent." };
}

/**
 * Sends to everyone who has agreed. `id` is made when the dialog opens, so a
 * second press or a retry of the same send can't email anyone twice (Resend
 * ignores a repeat of the same key within a day).
 */
export async function emailAll(id: unknown, subject: unknown, message: unknown, campaignId: unknown, staffEmail: string): Promise<MailingResult> {
  if (!siteUrl()) return NO_SITE;
  if (typeof id !== "string" || !/^[\w-]{8,64}$/.test(id)) return { error: "That send wasn’t recognised. Close this window and try again." };
  const picked = await featureFor(campaignId);
  if (picked && "error" in picked) return picked;
  const checked = check(subject, message, picked !== null);
  if ("error" in checked) return checked;

  const [people, reach] = await Promise.all([marketingRecipients(), shopContact()]);
  if (people.length === 0) return { error: "No customer has agreed to marketing email yet." };

  // A code for each customer, written down before any email carries it. Made from this send's id, so a retry makes the same ones.
  const coded = picked?.feature.needsCode ?? false;
  const issued = coded ? await issueCodes(picked!.campaign.id, id, people.map((p) => p.email)) : null;
  const sent = await sendBatch(
    people.map((p) => marketingEmail(p.email, checked.subject, checked.message, reach, picked && { ...picked.feature, ...(issued ? { code: formatCode(issued.get(p.email)!) } : {}) })),
    `marketing/${id}`,
  );
  await db()
    .collection("mailings")
    .doc(id)
    .set({
      at: new Date().toISOString(),
      by: staffEmail,
      subject: checked.subject,
      message: checked.message,
      campaign: picked ? { id: picked.campaign.id, name: picked.campaign.name } : null,
      recipients: people.length,
      codes: issued?.size ?? 0,
      sent: sent.sent,
      failed: sent.failed,
      ...(sent.error ? { error: sent.error } : {}),
    });
  if (sent.sent === 0) return { error: sent.error ?? "Nothing was sent." };
  return { ok: true, sent: sent.sent, failed: sent.failed, coded, ...(sent.error ? { error: sent.error } : {}) };
}
