import type { MetadataRoute } from "next";

import { SHOP } from "./site/data";

/** What a phone keeps when the shop is added to its home screen: the name, the brand blue and the shop's mark. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SHOP.name,
    short_name: "Express Photo",
    description: "Photo printing, ID photos, framing and personalised photo gifts, from a real shop in Scott Street, Scottburgh.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en-ZA",
    background_color: "#ffffff",
    theme_color: "#0126ba",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
