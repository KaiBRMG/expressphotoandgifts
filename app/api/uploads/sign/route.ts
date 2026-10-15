import { createHash } from "node:crypto";

import { REF } from "@/lib/checkout/order";

/**
 * Signs a customer's photo upload, so it goes straight from the browser to
 * Cloudinary without the secret leaving the server. The signature pins the
 * folder to the order's reference and the formats to photographs; the upload
 * itself never passes through this server.
 */
const FORMATS = "jpg,jpeg,png,webp,heic,heif";

export async function POST(request: Request) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) return Response.json({ error: "Uploads are not set up." }, { status: 503 });

  const { ref } = (await request.json().catch(() => ({}))) as { ref?: unknown };
  if (typeof ref !== "string" || !REF.test(ref)) return Response.json({ error: "Bad order reference." }, { status: 400 });

  // Cloudinary signs the parameters in alphabetical order, joined as a query string.
  const params = { allowed_formats: FORMATS, folder: `orders/${ref}`, tags: "checkout", timestamp: Math.floor(Date.now() / 1000) };
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const signature = createHash("sha1").update(query + secret).digest("hex");

  return Response.json({ cloud, apiKey, signature, ...params });
}
