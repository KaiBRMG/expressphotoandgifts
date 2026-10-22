import "../product.css";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { getCldImageUrl } from "next-cloudinary";

import {
  getCategories,
  getMovedProduct,
  getProduct,
  getProducts,
  getVocabulary,
} from "@/lib/catalog/queries";
import { dealOn, productHref, shelfHref } from "@/lib/catalog/listing";
import type { PurchaseItem } from "@/lib/catalog/purchase";
import { goesWith } from "@/lib/catalog/related";
import { tagValues, termLabel } from "@/lib/catalog/tags";
import { productSoldOut, type Availability } from "@/lib/catalog/stock";
import type { Product } from "@/lib/catalog/types";
import { getSoldOut } from "@/lib/stock";
import { getLiveDeals } from "@/lib/campaigns";
import { SHOP } from "@/app/site/data";
import { ProductImage } from "@/app/site/ProductImage";
import { Shelf } from "../../ProductCard";
import { getListings } from "../../shelves";
import { Gallery } from "../Gallery";
import { Purchase, PurchaseFallback } from "../Purchase";

/** Five minutes: a campaign starts and ends on its own time, so the prices it sets can't wait an hour. */
export const revalidate = 300;

/** Every live product is known from the catalogue, so each page is rendered ahead of time. */
export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

/** The code `ProductImage` takes, from a Cloudinary public ID. */
const code = (publicId: string) => publicId.replace(/^products\//, "");

/** The primary photograph at the width the page already derives, for previews and search. */
function imageUrl(product: Product): string | undefined {
  const photo = product.media.find((m) => m.role === "photo");
  return photo
    ? getCldImageUrl({ src: photo.publicId, width: 640 })
    : undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/product/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  const image = imageUrl(product);
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/shop/product/${product.slug}` },
    openGraph: {
      title: `${product.name} | ${SHOP.name}`,
      description: product.description,
      ...(image
        ? {
            images: [
              { url: image, width: 640, height: 640, alt: product.name },
            ],
          }
        : {}),
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/shop/product/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    // A web address the shop has since changed goes on to the new one.
    const moved = await getMovedProduct(slug);
    if (moved) permanentRedirect(productHref(moved.slug));
    notFound();
  }
  if (!product.priceRange) notFound();

  const [categories, listings, products, vocabulary, soldOut, deals] = await Promise.all([
    getCategories(),
    getListings(),
    getProducts(),
    getVocabulary(),
    getSoldOut(),
    getLiveDeals(),
  ]);
  // Only this product's sold-out variants go to the page; the counts behind a limit are asked for in the browser.
  const out: Availability = Object.fromEntries(
    product.variants.filter((v) => v.sku in soldOut).map((v) => [v.sku, 0]),
  );
  const deal = dealOn(product, out, deals);
  const category = categories.find((c) => c.id === product.categoryId) ?? null;
  const [type] = tagValues(product.tags, "type");
  const shelf = listings.filter((l) => l.categoryId === product.categoryId);
  // Products in the shop's featured order, so `goesWith` breaks ties by it.
  const bySlug = new Map(listings.map((l) => [l.slug, l]));
  const rank = (slug: string) => bySlug.get(slug)?.rank ?? Infinity;
  const ordered = products.filter((p) => bySlug.has(p.slug)).sort((a, b) => rank(a.slug) - rank(b.slug));
  const goes = goesWith(product, ordered).map((p) => bySlug.get(p.slug)!);
  const more = shelf
    .filter((l) => l.slug !== product.slug && !goes.includes(l))
    .slice(0, 4);

  const photos = product.media
    .filter((m) => m.role === "photo")
    .map((m, i, all) => ({
      code: code(m.publicId),
      alt: all.length > 1 ? `${m.alt}, photo ${i + 1} of ${all.length}` : m.alt,
    }));
  const diagram = product.media.find((m) => m.role === "dimension") ?? null;

  // Only what the buy column uses is sent to the browser.
  const item: PurchaseItem = {
    name: product.name,
    personalisation: product.personalisation,
    // Only what the buy column reads: the photo count, print area and shape.
    tags: product.tags.filter((t) => /^(photos|print|shape):/.test(t)),
    options: product.options,
    variants: product.variants,
  };

  return (
    <>
      <JsonLd product={product} categoryName={category?.name ?? null} soldOut={productSoldOut(product, out)} range={deal.range} />

      <article className="shell pdp">
        <nav aria-label="Breadcrumb" className="crumbs">
          <ol>
            <li>
              <Link href="/shop">Shop</Link>
            </li>
            {category ? (
              <li>
                <Link href={shelfHref(category.id)}>{category.name}</Link>
              </li>
            ) : null}
            {category && type ? (
              <li>
                <Link href={shelfHref(category.id, "type", type)}>
                  {termLabel(vocabulary, "type", type)}
                </Link>
              </li>
            ) : null}
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>

        <div className="pdp__grid">
          <div className="pdp__media">
            <Gallery photos={photos} special={deal.headline} />
          </div>

          {/* The dock steps aside while this column passes under it, so the
              WhatsApp mark never sits on the total or Add to cart. */}
          <div className="pdp__buy" data-dock-clear>
            <h1 className="pdp__title">{product.name}</h1>
            {/* The variant lives in the URL, which a static render does not
                have; until it is read the column shows the first variant. */}
            <Suspense
              fallback={
                <PurchaseFallback
                  item={item}
                  description={product.description}
                  slug={product.slug}
                  photo={photos[0]?.code ?? null}
                  soldOut={out}
                  deal={deal}
                />
              }
            >
              <Purchase
                item={item}
                description={product.description}
                slug={product.slug}
                photo={photos[0]?.code ?? null}
                soldOut={out}
                deal={deal}
              />
            </Suspense>
          </div>
        </div>
      </article>

      <Details product={product} diagram={diagram} />

      {/* What it physically goes with, where "fits:" meets "holds:": a
          frame's easel, a tile's holder, a print's album. */}
      {goes.length > 0 ? (
        <section className="shell shelf pdp-more" aria-labelledby="goes-title">
          <div className="shelf__head">
            <h2 id="goes-title" className="h2">
              Goes with this
            </h2>
          </div>
          <Shelf listings={goes} />
        </section>
      ) : null}

      {more.length > 0 && category ? (
        <section className="shell shelf pdp-more" aria-labelledby="more-title">
          <div className="shelf__head">
            <h2 id="more-title" className="h2">
              More {category.name.toLowerCase()}
            </h2>
            <Link
              className="inline-link shelf__all"
              href={shelfHref(category.id)}
            >
              See all {shelf.length} {category.name.toLowerCase()}
            </Link>
          </div>
          <Shelf listings={more} />
        </section>
      ) : null}
    </>
  );
}

/**
 * The facts, on the catalogue's blue: what it measures and is made of, how to
 * look after it, and the shop's own sizing drawing, which appears nowhere but
 * here.
 */
function Details({
  product,
  diagram,
}: {
  product: Product;
  diagram: Product["media"][number] | null;
}) {
  const { specifications: specs, careNotes } = product;
  if (specs.length === 0 && !careNotes && !diagram) return null;

  return (
    <section className="details on-dark" aria-labelledby="details-title">
      <div
        className={
          diagram
            ? "shell details__grid details__grid--drawn"
            : "shell details__grid"
        }
      >
        <div className="details__copy">
          <h2 id="details-title" className="h2">
            Details and care
          </h2>
          {specs.length > 0 ? (
            <ul className="details__specs">
              {specs.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : null}
          {careNotes ? (
            <div className="details__care">
              <h3 className="details__careTitle">Care</h3>
              <p>{careNotes}</p>
            </div>
          ) : null}
        </div>

        {diagram ? (
          <figure className="details__diagram">
            <ProductImage
              code={code(diagram.publicId)}
              alt={diagram.alt}
              width={640}
              height={Math.round((640 * diagram.height) / diagram.width)}
              sizes="(max-width: 56rem) calc(100vw - 2 * clamp(20px, 5vw, 56px)), 560px"
            />
          </figure>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Structured data for search: the product, its price or price range in rand,
 * and where it sits in the shop. Availability is left out, because the shop
 * has not said what is in stock.
 */
function JsonLd({
  product,
  categoryName,
  soldOut,
  range: paid,
}: {
  product: Product;
  categoryName: string | null;
  soldOut: boolean;
  /** Its range after any live price deal: search quotes what shoppers pay. */
  range: { min: number; max: number } | null;
}) {
  const availability = `https://schema.org/${soldOut ? "OutOfStock" : "InStock"}`;
  const base = "https://expressphotoandgifts.com";
  const url = `${base}/shop/product/${product.slug}`;
  const range = paid ?? product.priceRange;
  const price = (cents: number) => (cents / 100).toFixed(2);
  const image = imageUrl(product);

  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      sku: product.code,
      url,
      ...(image ? { image } : {}),
      brand: { "@type": "Brand", name: SHOP.name },
      ...(range && {
        offers:
          range.min === range.max
            ? {
                "@type": "Offer",
                price: price(range.min),
                priceCurrency: product.currency,
                availability,
                url,
              }
            : {
                "@type": "AggregateOffer",
                lowPrice: price(range.min),
                highPrice: price(range.max),
                offerCount: product.variants.filter((v) => v.price !== null)
                  .length,
                priceCurrency: product.currency,
                availability,
                url,
              },
      }),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Shop", item: `${base}/shop` },
        ...(categoryName
          ? [{ name: categoryName, item: `${base}/shop/${product.categoryId}` }]
          : []),
        { name: product.name, item: url },
      ].map((crumb, i) => ({ "@type": "ListItem", position: i + 1, ...crumb })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
