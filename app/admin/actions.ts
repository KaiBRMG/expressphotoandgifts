"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, sendPasswordReset, signIn, signOut } from "@/lib/admin/auth";
import { uploadTicket, type UploadTicket } from "@/lib/admin/cloudinary";
import * as campaigns from "@/lib/admin/campaigns";
import * as mailings from "@/lib/admin/mailings";
import * as orders from "@/lib/admin/orders";
import * as payments from "@/lib/admin/payments";
import * as refunds from "@/lib/admin/refunds";
import * as stock from "@/lib/admin/stock";
import type { StockEdit } from "@/lib/catalog/stock";
import { returnStock } from "@/lib/stock";
import type { Boxes } from "@/lib/checkout/boxes";
import type { ContactInput, SaveContactResult } from "@/lib/contact";
import { saveOrderRecipients, saveShippingBoxes, saveShopContact, CONTACT_TAG, SETTINGS_TAG } from "@/lib/settings";
import type { OrderActionResult } from "@/lib/checkout/order";
import * as store from "@/lib/admin/products";
import type { OrderEmail } from "@/lib/checkout/emails";
import type { Direction } from "@/lib/checkout/courier";
import * as shipments from "@/lib/checkout/shipments";
import type { FieldError, SaveResult, VisibilityChange, VisibilityResult } from "@/lib/admin/products";
import type { AddableFacet, AddedTerm } from "@/lib/catalog/tags";
import { normaliseCode, STATUSES, type ProductDraft } from "@/lib/catalog/edit";
import { CATALOG_TAG } from "@/lib/catalog/queries";
import { CAMPAIGNS_TAG } from "@/lib/campaigns";

/**
 * Every write the admin makes. Each action checks the session itself: a server
 * action is a public endpoint, whatever page it was called from.
 */

export type FormState = { error?: string; notice?: string; field?: FieldError["field"] } | null;

export async function signInAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const failed = await signIn(email, password);
  if (failed) return failed;
  redirect("/admin");
}

export async function resetPasswordAction(email: string): Promise<FormState> {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { error: "Enter your email first, then ask for a reset link." };
  await sendPasswordReset(email.trim());
  return { notice: `If ${email.trim()} has an admin account, a reset link is on its way.` };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/admin/login");
}

export async function saveProductAction(slug: string, expectedUpdatedAt: string, draft: ProductDraft): Promise<SaveResult> {
  await requireAdmin();
  const result = await store.saveProduct(slug, expectedUpdatedAt, draft);
  // The shop reads the catalogue through a cache; the next visit reads it fresh.
  if (result.ok) updateTag(CATALOG_TAG);
  return result;
}

export async function createProductAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const result = await store.createProduct({
    name: String(form.get("name") ?? ""),
    code: String(form.get("code") ?? ""),
    categoryId: String(form.get("categoryId") ?? ""),
  });
  if ("error" in result) return result;
  redirect(`/admin/products/${result.slug}`);
}

/** A hidden copy of a saved product under a new code. Returns the copy's slug for its editor. */
export async function duplicateProductAction(slug: string, code: string): Promise<{ slug: string } | { error: string }> {
  await requireAdmin();
  // Hidden, so the shop's cache has nothing new to show.
  return store.duplicateProduct(slug, code);
}

/** The list's bulk actions, and their undo: status for many products at once. */
export async function setVisibilityAction(changes: VisibilityChange[]): Promise<VisibilityResult | { error: string }> {
  await requireAdmin();
  if (!Array.isArray(changes) || changes.length > 200) return { error: "Choose up to 200 products at a time." };
  const valid = changes.every(
    (c) =>
      typeof c?.slug === "string" &&
      (c.status === undefined || STATUSES.includes(c.status)),
  );
  if (!valid) return { error: "That change can’t be made. Reload the list and try again." };
  const result = await store.setVisibility(changes);
  if (result.before.length) updateTag(CATALOG_TAG);
  return result;
}

export async function changeSlugAction(slug: string, next: string, expectedUpdatedAt: string) {
  await requireAdmin();
  const result = await store.changeSlug(slug, next, expectedUpdatedAt);
  if (!("error" in result)) updateTag(CATALOG_TAG);
  return result;
}

/** A new type on a shelf, or a new occasion, for every product and the shop. */
export async function addTermAction(facet: AddableFacet, label: string, category?: string): Promise<{ term: AddedTerm } | { error: string }> {
  await requireAdmin();
  if (typeof label !== "string" || (category !== undefined && typeof category !== "string")) return { error: "That name can’t be added." };
  const result = await store.addTerm(facet, label, category);
  // The shop's filters and search read the terms through the catalogue's cache.
  if ("term" in result) updateTag(CATALOG_TAG);
  return result;
}

/* ---- Campaigns: every change clears the shop's copy, so prices move on the next visit. ---- */

/** Saves a campaign's draft: a new one when `id` is null. */
export async function saveCampaignAction(id: string | null, expected: string, draft: unknown) {
  const admin = await requireAdmin();
  const result = await campaigns.saveCampaign(typeof id === "string" ? id : null, String(expected ?? ""), draft, admin.email);
  if ("ok" in result) updateTag(CAMPAIGNS_TAG);
  return result;
}

export async function moveCampaignAction(id: string, expected: string, move: campaigns.StatusMove) {
  const admin = await requireAdmin();
  const result = await campaigns.moveCampaign(String(id), String(expected), move, admin.email);
  if ("ok" in result) updateTag(CAMPAIGNS_TAG);
  return result;
}

export async function deleteCampaignAction(id: string, expected: string) {
  await requireAdmin();
  const result = await campaigns.deleteCampaign(String(id), String(expected));
  if ("error" in result) return result;
  redirect("/admin/campaigns");
}

export async function duplicateCampaignAction(id: string): Promise<{ error: string }> {
  const admin = await requireAdmin();
  const result = await campaigns.duplicateCampaign(String(id), admin.email);
  if ("error" in result) return result;
  redirect(`/admin/campaigns/${result.campaign.id}`);
}

/** Turns what was put on Specials by hand into one draft campaign, and opens it. */
export async function adoptHandSpecialsAction(): Promise<{ error: string }> {
  const admin = await requireAdmin();
  const result = await campaigns.adoptHandSpecials(admin.email);
  if ("error" in result) return result;
  updateTag(CATALOG_TAG);
  redirect(`/admin/campaigns/${result.campaign.id}`);
}

/* ---- Orders: only the shop's own side of an order changes here. ---- */

export async function setOrderStageAction(ref: string, stage: string) {
  const admin = await requireAdmin();
  return orders.setStage(String(ref), stage, admin.email);
}

/** Refunds through PayFast's API, by the terms' rules (`lib/checkout/refunds.ts`): to the card or account the customer paid with. */
export async function refundOrderAction(ref: string, input: unknown): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  return refunds.refundThroughPayfast(String(ref), input, admin.email);
}

/** Records a refund made in PayFast's dashboard, once PayFast's record shows it. */
export async function recordDashboardRefundAction(ref: string, input: unknown): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  return refunds.recordDashboardRefund(String(ref), input, admin.email);
}

/** Cancels a paid order from the shop's side, by the terms: refunded through PayFast (or as already refunded in its dashboard), its waybill cancelled and, when asked, its stock put back. */
export async function cancelOrderAction(ref: string, input: unknown, via: "payfast" | "dashboard"): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  return refunds.cancelOrder(String(ref), input, admin.email, via === "dashboard" ? "dashboard" : "payfast");
}

/** Settles a refund held on PayFast's answer, from PayFast's record now. */
export async function checkRefundAction(ref: string): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  return refunds.checkRefund(String(ref), admin.email);
}

/* ---- Stock: saving clears the shop's caches itself (`lib/stock.ts`). ---- */

/** Puts what a paid order took back in stock, once: however it was refunded or cancelled. */
export async function returnStockAction(ref: string): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const back = await returnStock(String(ref), admin.email);
  return "error" in back ? back : { ok: true };
}

export async function saveStockAction(edits: StockEdit[]) {
  const admin = await requireAdmin();
  return stock.saveStock(edits, admin.email);
}

export async function stockHistoryAction(sku: string) {
  await requireAdmin();
  return stock.stockHistory(sku);
}

export async function resolveOrderIssuesAction(ref: string, note: string) {
  const admin = await requireAdmin();
  return orders.resolveIssues(String(ref), note, admin.email);
}

export async function resendOrderEmailAction(ref: string, who: OrderEmail) {
  const admin = await requireAdmin();
  return orders.resendEmail(String(ref), who, admin.email);
}

/* ---- Customers: one message to everyone who agreed to marketing email. ---- */

/** `campaignId`: a live or scheduled campaign whose deals, dates and products the email carries, or null for the message alone. */
export async function emailAllCustomersAction(id: string, subject: string, message: string, campaignId: string | null) {
  const admin = await requireAdmin();
  return mailings.emailAll(id, subject, message, campaignId, admin.email);
}

export async function emailTestAction(subject: string, message: string, campaignId: string | null) {
  const admin = await requireAdmin();
  return mailings.sendTest(subject, message, campaignId, admin.email);
}

export async function emailPreviewAction(subject: string, message: string, campaignId: string | null) {
  await requireAdmin();
  return mailings.preview(subject, message, campaignId);
}

/* ---- PayFast: read only, except accepting a payment its history shows and its notice missed. ---- */

/** Checks PayFast's history for a month ("2026-10"), flagging each exception on its order. */
export async function checkPaymentsAction(month: string): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const asked = payments.parseMonth(month);
  if (!asked) return { error: "That isn’t a month that has started." };
  const check = await payments.runCheck(admin.email, payments.monthRange(asked));
  return check.ok ? { ok: true } : { error: check.error };
}

/** Marks an exception on the Payments page as looked at, with what was done. */
export async function reviewPaymentAction(month: string, key: string, note: string) {
  const admin = await requireAdmin();
  const asked = payments.parseMonth(month);
  if (!asked) return { error: "That isn’t a month that has started." };
  return payments.reviewException(asked, String(key), note, admin.email);
}

export async function acceptPayfastRecordAction(ref: string) {
  const admin = await requireAdmin();
  return payments.acceptFromPayfast(String(ref), admin.email);
}

export async function checkCardPaymentAction(ref: string) {
  const admin = await requireAdmin();
  return payments.checkCard(String(ref), admin.email);
}

/* ---- The courier: booking (out, or a return), settling a booking that didn't finish, cancelling, status and proof of delivery. ---- */

const direction = (which: unknown): Direction => (which === "return" ? "return" : "out");

/** The account's extras for the booking form. */
export async function courierExtrasAction(ref: string, which: Direction) {
  await requireAdmin();
  return shipments.extrasFor(String(ref), direction(which));
}

/** TCG's price for the waybill as set up in the booking form. */
export async function previewShipmentAction(ref: string, which: Direction, parcels: unknown, options: unknown) {
  await requireAdmin();
  return shipments.previewWaybill(String(ref), direction(which), parcels, options);
}

/** A return's waybill. An order going out is booked only with the day's collection (`bookCollectionAction`). `parcels`: the boxes, each with its weight in kg; `options`: collection day, hours and extras; `service`: the return's service code. */
export async function bookShipmentAction(ref: string, which: Direction, parcels: unknown, options: unknown, service?: string) {
  const admin = await requireAdmin();
  if (direction(which) !== "return") return { error: "An order is booked with the courier from the Dashboard, together with the others that are ready." };
  return shipments.bookShipment(String(ref), "return", parcels, options, service, admin.email);
}

/** Saves the parcels a courier order was packed into and marks it ready to send. */
export async function packOrderAction(ref: string, parcels: unknown) {
  const admin = await requireAdmin();
  return shipments.packOrder(String(ref), parcels, admin.email);
}

/** The Dashboard's Book courier collection: the orders its dialog listed, with the collection day and hours. */
export async function bookCollectionAction(refs: unknown, window: unknown) {
  const admin = await requireAdmin();
  return shipments.bookCollection(refs, window, admin.email);
}

export async function lookUpShipmentAction(ref: string, which: Direction) {
  const admin = await requireAdmin();
  return shipments.lookUpShipment(String(ref), direction(which), admin.email);
}

export async function markNotBookedAction(ref: string, which: Direction) {
  const admin = await requireAdmin();
  return shipments.markNotBooked(String(ref), direction(which), admin.email);
}

export async function cancelShipmentAction(ref: string, which: Direction) {
  const admin = await requireAdmin();
  return shipments.cancelOrderShipment(String(ref), direction(which), admin.email);
}

export async function refreshShipmentAction(ref: string, which: Direction) {
  const admin = await requireAdmin();
  return shipments.syncShipment(String(ref), { which: direction(which), staff: admin.email });
}

/** The delivered waybill's proof of delivery, as signed links read from TCG now. */
export async function proofOfDeliveryAction(ref: string, which: Direction) {
  await requireAdmin();
  return shipments.proofFor(String(ref), direction(which));
}

export async function uploadTicketAction(code: string): Promise<UploadTicket | { error: string }> {
  await requireAdmin();
  const c = normaliseCode(code);
  if (!c) return { error: "Give the product its product code before adding photos." };
  return uploadTicket(c);
}

/** Saves who the shop's new-order email goes to: any number of addresses, or none. */
export async function saveOrderRecipientsAction(emails: string[]): Promise<{ ok: true; emails: string[] } | { error: string }> {
  const admin = await requireAdmin();
  const result = await saveOrderRecipients(emails, admin.email);
  if ("ok" in result) updateTag(SETTINGS_TAG);
  return result;
}

/** Saves the email and mobile number the site gives the public. */
export async function saveShopContactAction(input: ContactInput): Promise<SaveContactResult> {
  const admin = await requireAdmin();
  const result = await saveShopContact(input, admin.email);
  if ("ok" in result) updateTag(CONTACT_TAG);
  return result;
}

/** Saves the name, size and packed weight of each box the shop ships in. */
export async function saveShippingBoxesAction(boxes: Boxes): Promise<{ ok: true; boxes: Boxes } | { error: string }> {
  const admin = await requireAdmin();
  const result = await saveShippingBoxes(boxes, admin.email);
  if ("ok" in result) updateTag(SETTINGS_TAG);
  return result;
}
