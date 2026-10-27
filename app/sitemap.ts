import type { MetadataRoute } from "next";

import { getCategories, getProducts } from "@/lib/catalog/queries";
import { fromShopTime } from "@/lib/shopTime";
import { POLICIES_VERSION } from "@/lib/legal";
import { SHOP } from "./site/data";

/** An hour, like the catalogue it is made from: a new product is listed within the hour of staff publishing it. */
export const revalidate = 3600;

/**
 * Every page a search engine should list: the homepage, the shop, each shelf
 * that has something live, every product on sale (when it last changed), the
 * two policies. Checkout, the account, the console and filtered views of a shelf
 * are left out. Priority and change frequency are too: crawlers ignore them.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const policies = fromShopTime(`${POLICIES_VERSION} 12:00:00`);
  const stocked = new Set(products.map((p) => p.categoryId));

  return [
    { url: SHOP.url },
    { url: `${SHOP.url}/shop` },
    ...(products.length ? [{ url: `${SHOP.url}/shop/all` }] : []),
    ...categories.filter((c) => stocked.has(c.id)).map((c) => ({ url: `${SHOP.url}/shop/${c.id}` })),
    ...products.map((p) => ({ url: `${SHOP.url}/shop/product/${p.slug}`, lastModified: p.updatedAt })),
    { url: `${SHOP.url}/terms`, lastModified: policies },
    { url: `${SHOP.url}/privacy`, lastModified: policies },
  ];
}
