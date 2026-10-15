import type { Metadata } from "next";
import Link from "next/link";

import { getProducts } from "@/lib/catalog/queries";
import { PRICE_BANDS, productCount, shelfHref, type Listing } from "@/lib/catalog/listing";
import { tag, termCounts } from "@/lib/catalog/tags";
import { ProductImage } from "@/app/site/ProductImage";
import { ArrowRight, WhatsApp } from "@/app/site/icons";
import { CUSTOMER_PHOTOS, SHOP, whatsapp } from "@/app/site/data";
import { ProductCard, Shelf } from "./ProductCard";
import { SizeChart } from "./SizeChart";
import { ShelfRail } from "./ShelfRail";
import { getListings, sizeFamily } from "./shelves";

/** The catalogue is cached for an hour; the storefront follows it. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Mugs, puzzles, keyrings, snow globes and more printed with your own photo, plus frames, easels and albums — from a real photo shop in Scottburgh.",
};

/** The sample customer portrait the homepage already uses as "your" picture. */
const YOUR_PHOTO = CUSTOMER_PHOTOS[0];

/**
 * The board opens on the things the sign's lede names, so the first doors
 * after "Your photo" are photographs printed on objects. The coaster's shot
 * carries the shop's logo rather than a photo, so it goes to the end.
 */
const BOARD_LEAD = ["coffee-mug", "puzzle", "polymer-keyring", "photo-snow-globes"];
const BOARD_LAST = ["rubber-coaster"];

function boardOrder(listings: Listing[]): Listing[] {
  const place = (l: Listing) => {
    const lead = BOARD_LEAD.indexOf(l.slug);
    if (lead !== -1) return lead - BOARD_LEAD.length;
    return BOARD_LAST.includes(l.slug) ? 1 : 0;
  };
  // Stable: everything else keeps the shop's featured order.
  return [...listings].sort((a, b) => place(a) - place(b));
}

/** "A, B and C", the way the shop would say it. */
const NAMES = new Intl.ListFormat("en-ZA", { type: "conjunction" });

/** How many products a shelf shows before handing over to its full page. */
const SHELF_SIZE = 8;

export default async function ShopPage() {
  const [products, listings] = await Promise.all([getProducts(), getListings()]);
  const yours = boardOrder(listings.filter((l) => l.personalisable));
  const specials = listings.filter((l) => l.special);
  const frames = listings.filter((l) => l.categoryId === "frames");
  const printing = listings.filter((l) => l.categoryId === "photo-printing");
  // Albums live under Add-ons, but they are where the prints go.
  const photos = [...printing, ...listings.filter((l) => l.tags.includes(tag("type", "albums")))];
  const occasions = termCounts(listings, "occasion").filter((o) => o.count > 0);
  const family = sizeFamily(products);
  const familySlugs = new Set(family?.products.map((p) => p.slug));
  const inFamily = (l: Listing) => familySlugs.has(l.slug);
  const familyListings = listings.filter(inFamily);
  // The size chart already shows its frames, so the shelf leads with the rest.
  const otherFrames = frames.filter((l) => !inFamily(l));

  return (
    <>
      {/* ---- The sign ------------------------------------------------- */}
      {/* The homepage's own device: a leaning brand-blue band carrying the
          one sentence, its lede on a slimmer band beneath. The count is read
          off the catalogue, so it is never a promise the shelves don't keep. */}
      <section className="storefront__sign">
        <div className="sign on-dark">
          <h1 className="sign__title">
            <span className="sign__line">Your photo,</span>{" "}
            <span className="sign__line">
              on <span className="sign__gold">{yours.length} things</span>
            </span>
          </h1>
          <p className="sign__lede">
            Mugs, puzzles, keyrings, snow globes and more, each printed with the
            picture you choose. Pick the thing; the photo is yours.
          </p>
        </div>
      </section>

      {/* ---- Every shelf, one tap away -------------------------------- */}
      <ShelfRail variant="shelves" />

      {/* ---- The photo board ------------------------------------------ */}
      {/* One photograph and everything it can go on. The portrait is not a
          door — it is the customer's picture — so it carries no card edge;
          every product around it is a door with its price. */}
      <section className="board shell" aria-labelledby="board-title">
        <h2 id="board-title" className="visually-hidden">
          Everything that takes your photo
        </h2>
        <ul className="board__grid">
          <li className="board__yours">
            <figure>
              <ProductImage
                code={YOUR_PHOTO.src}
                alt={YOUR_PHOTO.alt}
                width={640}
                height={640}
                sizes="(max-width: 46rem) 92vw, 440px"
                loading="eager"
              />
              <figcaption>
                <span className="board__yoursTitle">Your photo</span>
                <span className="board__yoursText">
                  Family, a pet, a wedding, a team. Any of these can carry it.
                </span>
              </figcaption>
            </figure>
          </li>
          {yours.map((l, i) => (
            <li key={l.slug}>
              <ProductCard
                listing={l}
                eager={i < 6}
                sizes="(max-width: 46rem) 46vw, (max-width: 62rem) 30vw, 220px"
              />
            </li>
          ))}
          <li className="board__more">
            <Link href="/shop/all?photo=1&sort=price-asc">
              <span>
                See all {yours.length} side by side, by price
              </span>
              <span className="board__moreGo" aria-hidden="true">
                <ArrowRight size={18} />
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* ---- Specials ------------------------------------------------- */}
      {/* Only when the shop has flagged something. No flag, no band — an
          empty "specials" shelf would be a promise with nothing behind it. */}
      {specials.length > 0 ? (
        <section className="specials on-dark" aria-labelledby="specials-title">
          <div className="shell">
            <div className="shelf__head">
              <h2 id="specials-title" className="h2">
                On special
              </h2>
              <Link className="inline-link shelf__all" href="/shop/specials">
                See all {specials.length} specials
              </Link>
            </div>
            <Shelf listings={specials.slice(0, SHELF_SIZE)} />
          </div>
        </section>
      ) : null}

      {/* ---- Shop by budget ------------------------------------------- */}
      <section className="budget shell" aria-labelledby="budget-title">
        <h2 id="budget-title" className="h2">
          Shop by budget
        </h2>
        <ul className="budget__doors">
          {PRICE_BANDS.map((band) => {
            const inBand = listings.filter((l) => band.test(l.min));
            if (inBand.length === 0) return null;
            const faces = inBand.filter((l) => l.photo).slice(0, 3);
            return (
              <li key={band.id}>
                <Link className="door" href={`/shop/all?price=${band.id}&sort=price-asc`}>
                  <span className="door__faces" aria-hidden="true">
                    {faces.map((l) => (
                      <ProductImage
                        key={l.slug}
                        code={l.photo!}
                        alt=""
                        width={400}
                        height={400}
                        sizes="96px"
                      />
                    ))}
                  </span>
                  <span className="door__label">{band.label}</span>
                  <span className="door__count">
                    {productCount(inBand.length)}
                    <span className="door__go" aria-hidden="true">
                      <ArrowRight size={16} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Shop by occasion ----------------------------------------- */}
      {/* Most gifts here are bought for a day, not a category. Each is a
          filtered view of the whole shop, so the link can be shared as is. */}
      {occasions.length > 0 ? (
        <section className="occasions shell" aria-labelledby="occasions-title">
          <h2 id="occasions-title" className="h2">
            Shop by occasion
          </h2>
          <ul>
            {occasions.map((o) => (
              <li key={o.value}>
                <Link href={shelfHref("all", "occasion", o.value)}>
                  <span>{o.label}</span>
                  <span className="occasions__count">{o.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---- The size chart ------------------------------------------- */}
      {family ? (
        <section className="sizes on-dark" aria-labelledby="sizes-title">
          <div className="shell sizes__grid">
            <div className="sizes__copy">
              <h2 id="sizes-title" className="h2">
                {family.sizes.length} sizes, drawn to scale
              </h2>
              <p className="lede">
                {NAMES.format(family.products.map((p) => p.name))} share one
                ladder of sizes, from {family.sizes[0].label} to{" "}
                {family.sizes[family.sizes.length - 1].label}. Pick a size to
                see it against the others.
              </p>
            </div>
            <SizeChart sizes={family.sizes} />
            <ul className="sizes__frames">
              {familyListings.map((l) => (
                <li key={l.slug}>
                  <ProductCard listing={l} sizes="(max-width: 46rem) 30vw, 160px" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---- Frames --------------------------------------------------- */}
      {frames.length > 0 ? (
        <section className="shelf shell" aria-labelledby="frames-title">
          <div className="shelf__head">
            <h2 id="frames-title" className="h2">
              Frames and easels
            </h2>
            <Link className="inline-link shelf__all" href="/shop/frames">
              See all {frames.length} frames
            </Link>
          </div>
          <Shelf listings={otherFrames.slice(0, SHELF_SIZE)} />
        </section>
      ) : null}

      {/* ---- Photos, and the prints that aren't online yet ------------- */}
      <section className="shelf shell" aria-labelledby="photos-title">
        <div className="shelf__head">
          <h2 id="photos-title" className="h2">
            Photos and albums
          </h2>
          {printing.length > 0 ? (
            <Link className="inline-link shelf__all" href="/shop/photo-printing">
              All photo printing
            </Link>
          ) : null}
        </div>
        <div className="prints">
          <ul className="prints__row">
            {photos.slice(0, SHELF_SIZE).map((l) => (
              <li key={l.slug}>
                <ProductCard listing={l} />
              </li>
            ))}
          </ul>
          {/* The core of a photo shop is not priced online yet. Say so, and
              hand over to the channel that does take the order today. */}
          <div className="prints__note">
            <h3 className="prints__title">Prints, collages and film strips</h3>
            <p>
              These aren&rsquo;t in the online shop yet. Send your photos to us
              on WhatsApp and we&rsquo;ll take the order from there, or bring
              them in to {SHOP.street}.
            </p>
            <a
              className="btn btn--blue"
              href={whatsapp("Hi! I'd like to order photo prints.")}
            >
              <WhatsApp size={18} />
              Order prints on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
