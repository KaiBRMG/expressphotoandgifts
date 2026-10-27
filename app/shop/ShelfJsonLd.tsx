import type { Listing } from "@/lib/catalog/listing";
import { productHref } from "@/lib/catalog/listing";
import { SHOP } from "@/app/site/data";
import { JsonLdScript } from "@/app/site/JsonLdScript";

/** A shelf for search: the products on it in the shop's order, and where it sits. */
export function ShelfJsonLd({ slug, name, listings }: { slug: string; name: string; listings: Listing[] }) {
  const url = `${SHOP.url}/shop/${slug}`;
  return (
    <JsonLdScript
      data={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name,
          url,
          isPartOf: { "@id": `${SHOP.url}/#website` },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: listings.length,
            itemListElement: listings.map((l, i) => ({ "@type": "ListItem", position: i + 1, name: l.name, url: `${SHOP.url}${productHref(l.slug)}` })),
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { name: "Shop", item: `${SHOP.url}/shop` },
            { name, item: url },
          ].map((crumb, i) => ({ "@type": "ListItem", position: i + 1, ...crumb })),
        },
      ]}
    />
  );
}
