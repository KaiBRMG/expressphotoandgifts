import "server-only";

import { randomBytes } from "node:crypto";
import { api, signedForm, uploadTicket as ticket, type UploadTicket } from "@/lib/cloudinary";

/**
 * Product photographs in Cloudinary, from the admin. Uploads go straight from
 * the browser, signed here so the secret never leaves the server; photographs
 * staff remove are destroyed here, so the free plan's storage holds only what
 * the shop shows.
 */

export type { UploadTicket };

/**
 * One signed upload of a product photograph, filed as `products/<code>-<random>`
 * beside the imported `products/<code>`. The browser has already scaled it to
 * the largest size the shop shows.
 */
export const uploadTicket = (code: string): UploadTicket =>
  ticket({ allowed_formats: "jpg,jpeg,png,webp", public_id: `products/${code}-${randomBytes(3).toString("hex")}`, tags: "admin" });

/** Deletes photographs nothing shows any more. Best effort: a failure leaves a stray file, not a broken page. */
export async function destroyImages(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  const { base } = api();
  await Promise.allSettled(
    publicIds.map((public_id) => fetch(`${base}/destroy`, { method: "POST", body: signedForm({ invalidate: "true", public_id }) })),
  );
}
