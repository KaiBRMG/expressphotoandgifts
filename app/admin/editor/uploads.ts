"use client";

import type { ProductMedia } from "@/lib/catalog/types";
import { uploadTicketAction } from "../actions";

/**
 * The longest edge a product photograph is stored at. The shop shows them at
 * most 640 CSS pixels wide (see ProductImage), so this is that at 2x and no
 * more: the free plan meters every byte stored.
 */
const MAX_EDGE = 1280;
export const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/**
 * Scales a photograph down to MAX_EDGE in the browser before it is sent. Line
 * drawings (PNGs, usually the size diagrams) stay PNG so their edges stay
 * crisp; everything else becomes a JPEG.
 */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`“${file.name}” can’t be read. Save it as a JPG or PNG and try again.`);
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`“${file.name}” couldn’t be resized.`))), type, 0.88),
  );
}

/** Uploads one photograph for the product with this code, and describes it for the product's media. */
export async function uploadPhoto(file: File, code: string, alt: string): Promise<ProductMedia> {
  if (!ACCEPT.includes(file.type)) throw new Error(`“${file.name}” isn’t a JPG, PNG or WebP photo.`);
  const [blob, ticket] = await Promise.all([prepare(file), uploadTicketAction(code)]);
  if ("error" in ticket) throw new Error(ticket.error);

  const body = new FormData();
  for (const [k, v] of Object.entries(ticket.fields)) body.append(k, v);
  body.append("file", blob, file.name);
  const res = await fetch(ticket.url, { method: "POST", body }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as
    | { public_id: string; width: number; height: number; error?: { message: string } }
    | null;
  if (!res?.ok || !data?.public_id) throw new Error(`“${file.name}” didn’t upload. ${data?.error?.message ?? "Check the connection and try again."}`);

  return { publicId: data.public_id, role: "photo", alt, width: data.width, height: data.height };
}
