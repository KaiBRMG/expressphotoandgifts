"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, sendPasswordReset, signIn, signOut } from "@/lib/admin/auth";
import { uploadTicket, type UploadTicket } from "@/lib/admin/cloudinary";
import * as store from "@/lib/admin/products";
import type { SaveResult } from "@/lib/admin/products";
import { normaliseCode, type ProductDraft } from "@/lib/catalog/edit";
import { CATALOG_TAG } from "@/lib/catalog/queries";

/**
 * Every write the admin makes. Each action checks the session itself: a server
 * action is a public endpoint, whatever page it was called from.
 */

export type FormState = { error?: string; notice?: string } | null;

export async function signInAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const failed = await signIn(email, password);
  if (failed) return failed;
  redirect("/admin/products");
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

export async function changeSlugAction(slug: string, next: string, expectedUpdatedAt: string) {
  await requireAdmin();
  const result = await store.changeSlug(slug, next, expectedUpdatedAt);
  if (!("error" in result)) updateTag(CATALOG_TAG);
  return result;
}

export async function uploadTicketAction(code: string): Promise<UploadTicket | { error: string }> {
  await requireAdmin();
  const c = normaliseCode(code);
  if (!c) return { error: "Give the product its shop code before adding photos." };
  return uploadTicket(c);
}
