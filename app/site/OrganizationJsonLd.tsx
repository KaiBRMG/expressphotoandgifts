import { shopContact } from "@/lib/settings";
import { HOURS, SHOP } from "./data";
import { JsonLdScript } from "./JsonLdScript";

/**
 * Who the shop is, for search: the business and its site, and the shop it keeps in Scott
 * Street (a LocalBusiness, here its Store subtype) with its address and hours.
 * Only facts the shop has supplied: no coordinates, price range or service area
 * until it does. The number and email are Settings', through `shopContact`.
 */
export async function OrganizationJsonLd() {
  const contact = await shopContact();
  const organization = `${SHOP.url}/#organization`;

  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": organization,
            name: SHOP.name,
            url: SHOP.url,
            logo: `${SHOP.url}/logo/new.png`,
            sameAs: [SHOP.instagramUrl, SHOP.facebookUrl],
            contactPoint: { "@type": "ContactPoint", contactType: "customer service", telephone: `+${contact.phoneE164}`, email: contact.email },
          },
          { "@type": "WebSite", "@id": `${SHOP.url}/#website`, name: SHOP.name, url: SHOP.url, inLanguage: "en-ZA", publisher: { "@id": organization } },
          {
            "@type": ["LocalBusiness", "Store"],
            "@id": `${SHOP.url}/#store`,
            name: SHOP.name,
            url: SHOP.url,
            image: `${SHOP.url}/logo/new.png`,
            telephone: `+${contact.phoneE164}`,
            email: contact.email,
            address: {
              "@type": "PostalAddress",
              streetAddress: SHOP.street,
              addressLocality: SHOP.town,
              addressRegion: SHOP.province,
              postalCode: SHOP.postcode,
              addressCountry: "ZA",
            },
            hasMap: SHOP.mapsUrl,
            currenciesAccepted: "ZAR",
            openingHoursSpecification: HOURS.filter((h) => h.opens && h.closes).map((h) => ({
              "@type": "OpeningHoursSpecification",
              dayOfWeek: h.weekdays,
              opens: h.opens,
              closes: h.closes,
            })),
            sameAs: [SHOP.instagramUrl, SHOP.facebookUrl],
            parentOrganization: { "@id": organization },
          },
        ],
      }}
    />
  );
}
