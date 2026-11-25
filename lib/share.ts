import type { Metadata } from "next";
import { SHOP } from "@/app/site/data";

/** The app's default share preview (`app/opengraph-image.tsx`, the wordmark on the blue). */
const DEFAULT_IMAGE = { url: `${SHOP.url}/opengraph-image`, width: 1200, height: 630, alt: `${SHOP.name}, ${SHOP.town}` };

/**
 * A page's own link preview. Next replaces a layout's `openGraph` and `twitter`
 * whole when a page sets either, so a page that only set its `title` left its
 * shares saying the homepage's, and one that set `openGraph` alone lost the
 * site name, locale and type, and the file-based share image with them. This
 * gives every page all of it: its own title and description, and its own
 * `images` (a product's photo) or the default preview.
 */
export function share(page: { title: string; description: string; images?: { url: string; width: number; height: number; alt: string }[] }): Pick<Metadata, "openGraph" | "twitter"> {
  const title = `${page.title} — ${SHOP.name}`;
  const images = page.images ?? [DEFAULT_IMAGE];
  return {
    openGraph: { title, description: page.description, siteName: SHOP.name, locale: "en_ZA", type: "website", images },
    twitter: { card: "summary_large_image", title, description: page.description, images: images.map((i) => i.url) },
  };
}
