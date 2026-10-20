/**
 * Where a customer's stored photo is seen: shared by the photo step in the
 * browser and the admin's order page, so both ask Cloudinary for the same
 * derived sizes (each distinct size counts against the free plan).
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/**
 * The only two sizes asked for: the tray's and the admin's thumbnail, and the
 * slot and editor's working copy (and the local preview's long edge: sharp in
 * the editor, small in memory). Each distinct size is a derived image on the
 * free plan, so there are two and no more.
 */
export const THUMB = 400;
export const WORKING = 1600;

/** A stored photo, no wider or taller than `edge`, in the browser's best format. */
export const fittedUrl = (publicId: string, version: number, edge: number) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/c_limit,w_${edge},h_${edge},f_auto,q_auto/v${version}/${publicId}`;

/** A stored photo as a full-quality JPEG, for the browser to render an edit from (any format it was uploaded in). */
export const jpgUrl = (publicId: string, version: number) => `https://res.cloudinary.com/${CLOUD}/image/upload/f_jpg,q_100/v${version}/${publicId}`;

/** A stored file exactly as it was uploaded: no resizing, no format change, nothing applied. What the shop prints from. */
export const rawUrl = (publicId: string, version: number) => `https://res.cloudinary.com/${CLOUD}/image/upload/v${version}/${publicId}`;
