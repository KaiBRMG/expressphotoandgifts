import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GiftWrapStory } from "@/app/site/GiftWrap";
import { ArrowRight, WhatsApp } from "@/app/site/icons";
import { SHOP } from "@/app/site/data";
import { share } from "@/lib/share";
import { shopContact } from "@/lib/settings";
import { whatsappLink } from "@/lib/contact";
import { Catalogue, CatalogueFallback } from "../Catalogue";
import { ShelfJsonLd } from "../ShelfJsonLd";
import { ShelfRail } from "../ShelfRail";
import { getListings, getShelf, shelfSlugs, type Shelf } from "../shelves";
import { getVocabulary } from "@/lib/catalog/queries";

/** The homepage's Gift Wrapping tile: wrapping is a tick at checkout, not a product, so its shelf explains it. */
const WRAP_SLUG = "gift-wrapping";

/** Five minutes: a campaign starts and ends on its own time, so the prices it sets can't wait an hour. */
export const revalidate = 300;

/** Every shelf is known from the catalogue, so each is rendered ahead of time. */
export async function generateStaticParams() {
  return (await shelfSlugs()).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const shelf = await getShelf((await params).category);
  if (!shelf) return {};
  const description =
    shelf.listings.length > 0
      ? `${shelf.name} at ${SHOP.name}, ${SHOP.town}: ${shelf.listings.length} products with prices, to collect in store or have delivered.`
      : shelf.slug === WRAP_SLUG
        ? `Gift wrapping at ${SHOP.name}, ${SHOP.town}: brown paper, an organza bow and a tag with your message, added to any item at checkout.`
        : `${shelf.name} at ${SHOP.name}, ${SHOP.town}.`;
  return {
    title: shelf.name,
    // Its filters, sort and search are views of the same shelf.
    alternates: { canonical: `/shop/${shelf.slug}` },
    description,
    ...share({ title: shelf.name, description }),
  };
}

export default async function ShelfPage({ params }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const [shelf, vocabulary, everything] = await Promise.all([getShelf(category), getVocabulary(), getListings()]);
  if (!shelf) notFound();

  return (
    <>
      {shelf.listings.length > 0 ? <ShelfJsonLd slug={shelf.slug} name={shelf.name} listings={shelf.listings} /> : null}
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
            <Catalogue listings={shelf.listings} everything={shelf.kind === "all" ? undefined : everything} shelfName={shelf.name} byType={shelf.kind === "category"} vocabulary={vocabulary} />
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
async function EmptyShelf({ shelf }: { shelf: Shelf }) {
  if (shelf.slug === WRAP_SLUG) return <WrapShelf />;
  const contact = await shopContact();
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
              href={whatsappLink(contact, `Hi! What do you have in ${shelf.name.toLowerCase()}?`)}
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

/** Gift wrapping is added to any item at checkout, so its shelf says how, and sends people on to choose the gift. */
function WrapShelf() {
  return (
    <div className="catalog__main wrapshelf">
      <GiftWrapStory id="gift-wrapping" title="Any gift, wrapped and tagged" />
      <Link className="btn btn--gold on-gold wrapshelf__go" href="/shop/all">
        Choose a gift to wrap
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
