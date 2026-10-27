import type { Metadata } from "next";
import Link from "next/link";

import { getProducts, getVocabulary } from "@/lib/catalog/queries";
import { PRICE_BANDS, productCount, shelfHref } from "@/lib/catalog/listing";
import { campaignsFor, type LiveCampaign } from "@/lib/catalog/campaigns";
import { comingUp } from "@/lib/catalog/seasons";
import type { Product } from "@/lib/catalog/types";
import { getLiveDeals } from "@/lib/campaigns";
import { SHOP_TZ } from "@/lib/shopTime";
import { tag, termCounts } from "@/lib/catalog/tags";
import { ProductImage } from "@/app/site/ProductImage";
import { ArrowRight, WhatsApp } from "@/app/site/icons";
import { CUSTOMER_PHOTOS, SHOP } from "@/app/site/data";
import { shopContact } from "@/lib/settings";
import { whatsappLink } from "@/lib/contact";
import { ProductCard, Shelf } from "./ProductCard";
import { ShelfRail } from "./ShelfRail";
import { getListings } from "./shelves";

/** Five minutes: the catalogue is cached for an hour, but a campaign starts and ends on its own time. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop",
  alternates: { canonical: "/shop" },
  description:
    "Mugs, puzzles, keyrings, snow globes and more printed with your own photo, plus frames, easels and albums — from a real photo shop in Scottburgh.",
};

/** The sample customer portrait the homepage already uses as "your" picture. */
const YOUR_PHOTO = CUSTOMER_PHOTOS[0];

/** How many occasions show before "More occasions". */
const OCCASIONS_SHOWN = 6;

/** How many products a shelf shows before handing over to its full page. */
const SHELF_SIZE = 8;

/**
 * The campaign the specials band leads with: the newest-started live one the
 * shop chose to feature, while something it reaches is still in stock.
 */
function featured(deals: LiveCampaign[], products: Product[], specials: Set<string>): LiveCampaign | null {
  for (const c of [...deals].reverse()) {
    if (!c.featured) continue;
    if (products.some((p) => specials.has(p.slug) && p.variants.some((v) => campaignsFor(v.sku, [c]).length > 0))) return c;
  }
  return null;
}

/** "Until 24 December": a campaign's last day, in the shop's own time. */
const until = (iso: string) =>
  `Until ${new Date(Date.parse(iso) - 1).toLocaleDateString("en-ZA", { timeZone: SHOP_TZ, day: "numeric", month: "long" })}`;

export default async function ShopPage() {
  const [products, listings, vocabulary, deals, contact] = await Promise.all([getProducts(), getListings(), getVocabulary(), getLiveDeals(), shopContact()]);
  // Already in the featured order, which opens on the lede's own products.
  const yours = listings.filter((l) => l.personalisable);
  const specials = listings.filter((l) => l.special);
  const lead = featured(deals, products, new Set(specials.map((l) => l.slug)));
  const frames = listings.filter((l) => l.categoryId === "frames");
  const printing = listings.filter((l) => l.categoryId === "photo-printing");
  // Albums live under Add-ons, but they are where the prints go.
  const photos = [...printing, ...listings.filter((l) => l.tags.includes(tag("type", "albums")))];
  const occasions = termCounts(vocabulary, listings, "occasion").filter((o) => o.count > 0);
  // The days coming up lead, soonest first; the rest of the row is the days
  // with the most to choose from, in the vocabulary's (calendar) order.
  const stocked = new Set(occasions.map((o) => o.value));
  const soon = comingUp().map((o) => o.value).filter((v) => stocked.has(v)).slice(0, OCCASIONS_SHOWN);
  const busiest = new Set([
    ...soon,
    ...[...occasions].filter((o) => !soon.includes(o.value)).sort((a, b) => b.count - a.count).map((o) => o.value),
  ].slice(0, OCCASIONS_SHOWN));
  const shown = [
    ...soon.map((v) => occasions.find((o) => o.value === v)!),
    ...occasions.filter((o) => busiest.has(o.value) && !soon.includes(o.value)),
  ];

  return (
    <>
      {/* The page opens on the shelves, with no hero. The heading stays for
          screen readers and search; the count is read off the catalogue. */}
      <h1 className="visually-hidden">Your photo, on {yours.length} things</h1>

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
                yours={false}
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
      {/* Only while a live campaign reaches something in stock. None, no
          band: an empty "specials" shelf would be a promise with nothing
          behind it. A featured campaign gives the band its name and line. */}
      {specials.length > 0 ? (
        <section className="specials on-dark" aria-labelledby="specials-title">
          <div className="shell">
            {lead ? (
              <div className="specials__lead">
                <p className="specials__blurb">{lead.blurb}</p>
                {lead.endsAt ? <p className="specials__until">{until(lead.endsAt)}</p> : null}
              </div>
            ) : null}
            <div className="shelf__head">
              <h2 id="specials-title" className="h2">
                {lead ? lead.name : "On special"}
              </h2>
              <Link className="inline-link shelf__all" href="/shop/specials">
                See all {specials.length} specials
              </Link>
            </div>
            <Shelf listings={specials.slice(0, SHELF_SIZE)} />
          </div>
        </section>
      ) : null}

      {/* ---- Shop by occasion ----------------------------------------- */}
      {/* Most gifts here are bought for a day, not a category, so this comes
          before budget. Each is a filtered view of the whole shop, so the
          link can be shared as is. The days coming up lead, then the busiest;
          the rest wait behind one more tap, so the row is a choice, not a wall.
          The page is rebuilt hourly, so the season is never more than an hour
          stale. */}
      {occasions.length > 0 ? (
        <section className="occasions shell" aria-labelledby="occasions-title">
          <h2 id="occasions-title" className="h2">
            Shop by occasion
          </h2>
          <OccasionList occasions={shown} />
          {occasions.length > busiest.size ? (
            <details className="occasions__more">
              <summary>
                More occasions <span className="occasions__count">{occasions.length - busiest.size}</span>
              </summary>
              <OccasionList occasions={occasions.filter((o) => !busiest.has(o.value))} />
            </details>
          ) : null}
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
          <Shelf listings={frames.slice(0, SHELF_SIZE)} />
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
              href={whatsappLink(contact, "Hi! I'd like to order photo prints.")}
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

/** A wrapped row of occasion pills, each a filtered view of the whole shop. */
function OccasionList({ occasions }: { occasions: { value: string; label: string; count: number }[] }) {
  return (
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
  );
}
