import { getCategories, getProducts } from "@/lib/catalog/queries";
import { fromShopTime } from "@/lib/shopTime";
import { POLICIES_VERSION } from "@/lib/legal";
import { SHOP } from "@/app/site/data";

/** An hour, like the catalogue it is made from: a new product is listed within the hour of staff publishing it. */
export const revalidate = 3600;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * `/sitemap.xml`: every page a search engine should list: the homepage, the
 * shop, each shelf that has something live, every product on sale (when it
 * last changed), the two policies. Checkout, the account, the console and
 * filtered views of a shelf are left out. Priority and change frequency are
 * too: crawlers ignore them.
 *
 * A plain route handler rather than `app/sitemap.ts`: the metadata file's
 * `revalidate` was not honoured on Vercel, so the live sitemap stayed as it
 * was built (25 of 50 products) while `/llms.txt`, a route like this one,
 * stayed current. Same pages as the shelves and `/llms.txt`, one source.
 */
export async function GET() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const policies = fromShopTime(`${POLICIES_VERSION} 12:00:00`);
  const stocked = new Set(products.map((p) => p.categoryId));

  const entries: { url: string; lastModified?: Date | string }[] = [
    { url: SHOP.url },
    { url: `${SHOP.url}/shop` },
    ...(products.length ? [{ url: `${SHOP.url}/shop/all` }] : []),
    ...categories.filter((c) => stocked.has(c.id)).map((c) => ({ url: `${SHOP.url}/shop/${c.id}` })),
    ...products.map((p) => ({ url: `${SHOP.url}/shop/product/${p.slug}`, lastModified: p.updatedAt })),
    { url: `${SHOP.url}/terms`, lastModified: policies },
    { url: `${SHOP.url}/privacy`, lastModified: policies },
  ];

  const body = entries
    .map((e) => `<url>\n<loc>${escape(e.url)}</loc>${e.lastModified ? `\n<lastmod>${new Date(e.lastModified).toISOString()}</lastmod>` : ""}\n</url>`)
    .join("\n");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
