import type { MetadataRoute } from "next";

import { SHOP } from "./site/data";

/**
 * Everything a shopper can find is open to crawlers; what only they or the
 * shop use is not: the console, the API, checkout (its receipt's address carries
 * a token), the account and the emailed subscription links. Those pages say
 * `noindex` as well, for the links that reach them from elsewhere.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/checkout", "/subscription"] },
    sitemap: `${SHOP.url}/sitemap.xml`,
  };
}
