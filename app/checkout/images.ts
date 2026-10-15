"use client";

import type { Edit, Pixels, SlotNeed } from "@/lib/catalog/checkout";
import { cropBox } from "@/lib/catalog/checkout";

/**
 * The photo step's dealings with image files: reading one in the browser,
 * keeping it under Cloudinary's upload limit, and the two addresses a stored
 * photo is seen at.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/** Cloudinary's free plan refuses an image file over 10 MB. */
const UPLOAD_LIMIT = 10 * 1024 * 1024;

/** The long edge of the local preview and of the copy Cloudinary serves back: sharp in the editor, small in memory. */
const PREVIEW_EDGE = 1600;

/**
 * The only two sizes the photo step asks Cloudinary for: the tray's thumbnail
 * and the slot and editor's working copy. Each distinct size is a derived
 * image on the free plan, so there are two and no more.
 */
export const THUMB = 400;
export const WORKING = PREVIEW_EDGE;

type ReadPhoto = {
  /** Upright pixel size, the camera's orientation applied; null when the browser cannot decode the file (HEIC outside Safari). */
  px: Pixels | null;
  /** A downsized copy to draw from during this visit. */
  preview: string | null;
  /** What to upload: the file itself, or a re-encoded copy when it is over the limit. */
  upload: Blob;
};

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

function draw(bitmap: ImageBitmap, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function readPhoto(file: File): Promise<ReadPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Not decodable here; Cloudinary still takes it, and serves the preview back.
    return { px: null, preview: null, upload: file };
  }

  const px = { w: bitmap.width, h: bitmap.height };
  const scale = Math.min(1, PREVIEW_EDGE / Math.max(px.w, px.h));
  const small = await toBlob(draw(bitmap, scale), 0.86);

  // Over the limit: the same pixels at high JPEG quality usually fit; if not, as few pixels lost as will.
  let upload: Blob = file;
  if (file.size > UPLOAD_LIMIT) {
    let fitted = await toBlob(draw(bitmap, 1), 0.92);
    let s = 1;
    while (fitted && fitted.size > UPLOAD_LIMIT && s > 0.3) {
      s *= Math.sqrt((UPLOAD_LIMIT * 0.9) / fitted.size);
      fitted = await toBlob(draw(bitmap, s), 0.9);
    }
    if (fitted) {
      upload = fitted;
      if (s < 1) {
        px.w = Math.round(px.w * s);
        px.h = Math.round(px.h * s);
      }
    }
  }
  bitmap.close();
  return { px, preview: small ? URL.createObjectURL(small) : null, upload };
}

/** A stored photo, no wider or taller than `edge`, in the browser's best format. */
const cloudUrl = (publicId: string, version: number, edge: number) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/c_limit,w_${edge},h_${edge},f_auto,q_auto/v${version}/${publicId}`;

/** A stored file exactly as it was uploaded: no resizing, no format change, nothing applied. */
export const rawUrl = (publicId: string, version: number) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/v${version}/${publicId}`;

/** The browser keeps a canvas to about 16.7 million pixels (iPhone Safari's limit); a render past it is scaled to fit. */
const CANVAS_MAX = 16_000_000;

/**
 * An edited place, rendered at the photo's full resolution exactly as the
 * customer set it: turned, cut to the place, toned, and white wherever the
 * photo does not reach. This is the file the shop prints, so it is drawn
 * from the original, never from a preview.
 */
export async function bake(source: Blob, px: Pixels, slot: SlotNeed, edit: Edit): Promise<Blob> {
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  const b = cropBox(px, slot, edit);
  // Bitmap pixels per measured pixel (the decoded photo may differ in size from the
  // one the crop was measured on), then shrunk only if the canvas would be too big.
  const native = bitmap.width / (edit.rotate % 180 === 0 ? b.W : b.H);
  const fitIn = Math.min(1, Math.sqrt(CANVAS_MAX / (b.w * native * b.h * native)));
  const s = native * fitIn;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(b.w * s));
  canvas.height = Math.max(1, Math.round(b.h * s));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.filter = edit.grey ? "grayscale(1)" : "none";
  // Into the turned photo's space, then the photo turned about its own centre.
  ctx.translate((-b.x + b.W / 2) * s, (-b.y + b.H / 2) * s);
  ctx.rotate((edit.rotate * Math.PI) / 180);
  ctx.scale(fitIn, fitIn);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();

  // A browser without canvas filters (older Safari) gets its black and white by hand.
  if (edit.grey && ctx.filter !== "grayscale(1)") {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = y;
    }
    ctx.putImageData(img, 0, 0);
  }

  // High quality first; only a render over the upload limit is let down.
  for (const q of [0.95, 0.9, 0.82, 0.72]) {
    const blob = await toBlob(canvas, q);
    if (blob && blob.size <= UPLOAD_LIMIT) return blob;
  }
  throw new Error("The edited photo is too large to send.");
}

/**
 * The original to render an edit from: the file still in this browser, or,
 * after a reload, the upload fetched back from Cloudinary (as a JPEG, so a
 * phone's HEIC decodes here too).
 */
export async function sourceFor(local: Blob | undefined, publicId: string | undefined, version: number | undefined) {
  if (local) return local;
  if (!publicId || !version) throw new Error("The photo is not uploaded yet.");
  const res = await fetch(`https://res.cloudinary.com/${CLOUD}/image/upload/f_jpg,q_100/v${version}/${publicId}`);
  if (!res.ok) throw new Error("The photo could not be fetched to apply your edit.");
  return res.blob();
}

type Signed = { cloud: string; apiKey: string; signature: string; allowed_formats: string; folder: string; tags: string; timestamp: number };

let signed: { ref: string; at: number; value: Promise<Signed> } | null = null;

/**
 * A signature lasts an hour at Cloudinary; one is reused for half that. The
 * request itself is shared, so uploads starting together ask for one.
 */
function sign(ref: string): Promise<Signed> {
  if (signed && signed.ref === ref && Date.now() - signed.at < 30 * 60 * 1000) return signed.value;
  const value = fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ref }),
  }).then((res) => {
    if (!res.ok) throw new Error("The upload could not be started.");
    return res.json() as Promise<Signed>;
  });
  signed = { ref, at: Date.now(), value };
  // A failed request is not kept, so the next upload asks again.
  value.catch(() => {
    if (signed?.value === value) signed = null;
  });
  return value;
}

type Uploaded = { publicId: string; version: number; px: Pixels };

/** Sends one photo to the order's folder, reporting progress from 0 to 1. */
export async function upload(ref: string, blob: Blob, name: string, onProgress: (p: number) => void): Promise<Uploaded> {
  const s = await sign(ref);
  const form = new FormData();
  form.append("file", blob, name);
  form.append("api_key", s.apiKey);
  form.append("timestamp", String(s.timestamp));
  form.append("signature", s.signature);
  form.append("folder", s.folder);
  form.append("tags", s.tags);
  form.append("allowed_formats", s.allowed_formats);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${s.cloud}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("The connection dropped."));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 300) return reject(new Error(body?.error?.message ?? "The file wasn’t accepted."));
        resolve({ publicId: body.public_id, version: body.version, px: { w: body.width, h: body.height } });
      } catch {
        reject(new Error("The upload could not be confirmed."));
      }
    };
    xhr.send(form);
  });
}

/** Where to draw a photo from: the local preview this visit, Cloudinary's copy after a reload. */
export const photoSrc = (p: { preview?: string; publicId?: string; version?: number }, edge: number) =>
  p.preview ?? (p.publicId && p.version ? cloudUrl(p.publicId, p.version, edge) : null);
