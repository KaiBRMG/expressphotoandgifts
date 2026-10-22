import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArrowRight, WhatsApp } from "@/app/site/icons";
import { SHOP, whatsapp } from "@/app/site/data";
import { Catalogue, CatalogueFallback } from "../Catalogue";
import { ShelfRail } from "../ShelfRail";
import { getShelf, shelfSlugs, type Shelf } from "../shelves";
import { getVocabulary } from "@/lib/catalog/queries";

/** Five minutes: a campaign starts and ends on its own time, so the prices it sets can't wait an hour. */
export const revalidate = 300;

/** Every shelf is known from the catalogue, so each is rendered ahead of time. */
export async function generateStaticParams() {
  return (await shelfSlugs()).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const shelf = await getShelf((await params).category);
  if (!shelf) return {};
  return {
    title: shelf.name,
    description:
      shelf.listings.length > 0
        ? `${shelf.name} at ${SHOP.name}, ${SHOP.town}: ${shelf.listings.length} products with prices, to collect in store or have delivered.`
        : `${shelf.name} at ${SHOP.name}, ${SHOP.town}.`,
  };
}

export default async function ShelfPage({ params }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const [shelf, vocabulary] = await Promise.all([getShelf(category), getVocabulary()]);
  if (!shelf) notFound();

  return (
    <>
      {/* The bar's blue carries on into the shelf's name, so the header and
          the title read as one ground and the white below is all products. */}
      <header className="shelfhead on-dark">
        <div className="shell">
          <nav aria-label="Breadcrumb" className="shelfhead__crumbs">
            <ol>
              <li>
                <Link href="/shop">Shop</Link>
              </li>
              <li aria-current="page">{shelf.name}</li>
            </ol>
          </nav>
          <h1 className="shelfhead__title">{shelf.name}</h1>
        </div>
      </header>

      <div className="shell catalog">
        <ShelfRail variant="rail" current={shelf.slug} />

        {shelf.listings.length > 0 ? (
          /* The controls read the URL, which a static render does not have;
             until it is read the shelf shows in the shop's own order. */
          <Suspense
            fallback={
              <CatalogueFallback
                listings={shelf.listings}
                shelfName={shelf.name}
                byType={shelf.kind === "category"}
                vocabulary={vocabulary}
              />
            }
          >
            <Catalogue listings={shelf.listings} shelfName={shelf.name} byType={shelf.kind === "category"} vocabulary={vocabulary} />
          </Suspense>
        ) : (
          <EmptyShelf shelf={shelf} />
        )}
      </div>
    </>
  );
}

/**
 * A shelf with nothing priced online. It is not a 404 — the homepage sends
 * people here — so it says what is true and hands over to what works today.
 */
function EmptyShelf({ shelf }: { shelf: Shelf }) {
  const specials = shelf.kind === "specials";
  return (
    <div className="catalog__main">
      <div className="empty">
        <h2 className="empty__title">
          {specials ? "No specials on right now" : "Not in the online shop yet"}
        </h2>
        <p className="empty__text">
          {specials
            ? "When the shop puts something on special it will be here. Until then, everything else is a tap away."
            : `${shelf.name} ${shelf.name.endsWith("s") ? "aren't" : "isn't"} on sale online yet. Ask us on WhatsApp what we have in, or come in to ${SHOP.street}, ${SHOP.town}.`}
        </p>
        <div className="empty__actions">
          {specials ? null : (
            <a
              className="btn btn--blue"
              href={whatsapp(`Hi! What do you have in ${shelf.name.toLowerCase()}?`)}
            >
              <WhatsApp size={18} />
              Ask on WhatsApp
            </a>
          )}
          <Link className="inline-link empty__all" href="/shop/all">
            Browse all products
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
