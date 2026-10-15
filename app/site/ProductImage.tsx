"use client";

import Image, { type ImageLoader, type ImageProps } from "next/image";
import { getCldImageUrl } from "next-cloudinary";

/**
 * The only widths the homepage asks Cloudinary for. Thumbnails never show
 * wider than 280 CSS px, so 640 covers a 2x screen, and every derived size
 * counts against the free plan's transformations and storage. Product pages
 * will want larger copies; the full-size originals stay in Cloudinary for them.
 */
const WIDTHS = [400, 640];

const loader: ImageLoader = ({ src, width }) =>
  getCldImageUrl({
    src,
    width: WIDTHS.find((w) => w >= width) ?? WIDTHS[WIDTHS.length - 1],
  });

/**
 * A product shot served from Cloudinary, by the code it is filed under in
 * data.ts. The loader is a function, so it has to live in a client component.
 */
export function ProductImage({
  code,
  alt,
  ...props
}: Omit<ImageProps, "src" | "loader"> & { code: string }) {
  return <Image src={`products/${code}`} alt={alt} loader={loader} {...props} />;
}
