import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Product photographs in Cloudinary, from the admin. Uploads go straight from
 * the browser, signed here so the secret never leaves the server; photographs
 * staff remove are destroyed here, so the free plan's storage holds only what
 * the shop shows.
 */

function credentials() {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) throw new Error("Cloudinary is not set up.");
  return { cloud, apiKey, secret };
}

/** Cloudinary signs the parameters in alphabetical order, joined as a query string. */
function sign(params: Record<string, string | number>, secret: string): string {
  const query = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(query + secret).digest("hex");
}

export type UploadTicket = {
  url: string;
  fields: Record<string, string>;
};

/**
 * One signed upload of a product photograph, filed as `products/<code>-<random>`
 * beside the imported `products/<code>`. The browser has already scaled it to
 * the largest size the shop shows.
 */
export function uploadTicket(code: string): UploadTicket {
  const { cloud, apiKey, secret } = credentials();
  const params = {
    allowed_formats: "jpg,jpeg,png,webp",
    public_id: `products/${code}-${randomBytes(3).toString("hex")}`,
    tags: "admin",
    timestamp: Math.floor(Date.now() / 1000),
  };
  return {
    url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    fields: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: apiKey, signature: sign(params, secret) },
  };
}

/** Deletes photographs nothing shows any more. Best effort: a failure leaves a stray file, not a broken page. */
export async function destroyImages(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  const { cloud, apiKey, secret } = credentials();
  await Promise.allSettled(
    publicIds.map((public_id) => {
      const params = { invalidate: "true", public_id, timestamp: Math.floor(Date.now() / 1000) };
      const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: apiKey, signature: sign(params, secret) });
      return fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: "POST", body });
    }),
  );
}
