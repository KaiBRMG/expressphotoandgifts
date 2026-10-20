"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, sendPasswordReset, signIn, signOut } from "@/lib/admin/auth";
import { uploadTicket, type UploadTicket } from "@/lib/admin/cloudinary";
import * as orders from "@/lib/admin/orders";
import * as store from "@/lib/admin/products";
import type { FieldError, SaveResult, VisibilityChange, VisibilityResult } from "@/lib/admin/products";
import type { AddableFacet, AddedTerm } from "@/lib/catalog/tags";
import { normaliseCode, STATUSES, type ProductDraft } from "@/lib/catalog/edit";
import { CATALOG_TAG } from "@/lib/catalog/queries";

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

/** The list's bulk actions, and their undo: status or Special for many products at once. */
export async function setVisibilityAction(changes: VisibilityChange[]): Promise<VisibilityResult | { error: string }> {
  await requireAdmin();
  if (!Array.isArray(changes) || changes.length > 200) return { error: "Choose up to 200 products at a time." };
  const valid = changes.every(
    (c) =>
      typeof c?.slug === "string" &&
      (c.status === undefined || STATUSES.includes(c.status)) &&
      (c.special === undefined || typeof c.special === "boolean"),
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

/* ---- Orders: only the shop's own side of an order changes here. ---- */

export async function setOrderStageAction(ref: string, stage: string) {
  const admin = await requireAdmin();
  return orders.setStage(String(ref), stage, admin.email);
}

/** `amount` in cents. The refund itself is made in PayFast's dashboard; this records it. */
export async function recordRefundAction(ref: string, amount: number, note: string) {
  const admin = await requireAdmin();
  return orders.recordRefund(String(ref), amount, note, admin.email);
}

export async function resolveOrderIssuesAction(ref: string, note: string) {
  const admin = await requireAdmin();
  return orders.resolveIssues(String(ref), note, admin.email);
}

export async function resendOrderEmailAction(ref: string, who: "shop" | "customer") {
  const admin = await requireAdmin();
  return orders.resendEmail(String(ref), who, admin.email);
}

export async function uploadTicketAction(code: string): Promise<UploadTicket | { error: string }> {
  await requireAdmin();
  const c = normaliseCode(code);
  if (!c) return { error: "Give the product its product code before adding photos." };
  return uploadTicket(c);
}
