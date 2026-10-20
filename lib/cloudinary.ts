import "server-only";

import { createHash } from "node:crypto";

/**
 * Cloudinary from the server: the credentials, the signature its upload API
 * checks, and the Admin API's address and login. The secret never leaves
 * here. Used by the admin's product photos (`lib/admin/cloudinary.ts`) and
 * the customer's order photos (`/api/uploads/sign`, `lib/checkout/uploads.ts`).
 */

export function credentials() {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) throw new Error("Cloudinary is not set up.");
  return { cloud, apiKey, secret };
}

export const cloudinaryReady = () => {
  try {
    credentials();
    return true;
  } catch {
    return false;
  }
};

/** Cloudinary signs the parameters in alphabetical order, joined as a query string. */
export function sign(params: Record<string, string | number>, secret: string): string {
  const query = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(query + secret).digest("hex");
}

/** A signed upload, for the browser to post as is: every field goes into the form. */
export type UploadTicket = {
  url: string;
  fields: Record<string, string>;
};

/** One signed image upload carrying `params` (timestamped here). */
export function uploadTicket(params: Record<string, string>): UploadTicket {
  const { cloud, apiKey, secret } = credentials();
  const signed = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };
  return {
    url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    fields: { ...signed, api_key: apiKey, signature: sign(signed, secret) },
  };
}

/**
 * A signed call to the upload API's other endpoints (tags, destroy), as a
 * form body. A list is signed comma-joined but sent as `name[]` fields.
 */
export function signedForm(params: Record<string, string | string[]>): URLSearchParams {
  const { apiKey, secret } = credentials();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const flat = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]));
  const body = new URLSearchParams({ timestamp, api_key: apiKey, signature: sign({ ...flat, timestamp }, secret) });
  for (const [k, v] of Object.entries(params)) for (const x of [v].flat()) body.append(Array.isArray(v) ? `${k}[]` : k, x);
  return body;
}

/** The image endpoints' base and the Admin API's login. */
export function api() {
  const { cloud, apiKey, secret } = credentials();
  return {
    base: `https://api.cloudinary.com/v1_1/${cloud}/image`,
    admin: `https://api.cloudinary.com/v1_1/${cloud}/resources/image`,
    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${secret}`).toString("base64")}` },
  };
}
