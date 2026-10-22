import Link from "next/link";

import { priceLabel, productHref, type Listing } from "@/lib/catalog/listing";
import { ProductImage } from "@/app/site/ProductImage";
import { YourPhoto } from "@/app/site/icons";

/**
 * A product as a door: its photograph, its name, what it costs and how many
 * ways it comes, and — the thing this shop is for — whether it takes the
 * customer's own photo. Everything under the picture is 16px or more, so a
 * phone never has to be zoomed to read a price.
 *
 * On a shelf where every product takes a photo the line tells the visitor
 * nothing and lowers every price, so such a shelf passes `yours={false}`.
 */
export function ProductCard({
  listing,
  sizes = "(max-width: 46rem) 46vw, (max-width: 90rem) 24vw, 260px",
  eager = false,
  yours = true,
}: {
  listing: Listing;
  sizes?: string;
  eager?: boolean;
  yours?: boolean;
}) {
  const { slug, name, photo, hint, personalisable, special, soldOut, was, deals } = listing;
  return (
    <Link className="pcard" href={productHref(slug)}>
      <span className="pcard__photo">
        {photo ? (
          <ProductImage
            code={photo}
            alt=""
            width={640}
            height={640}
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
          />
        ) : (
          /* The shop has not supplied this photograph yet. Said plainly, so
             the gap reads as missing rather than broken. */
          <span className="pcard__nophoto">Photo to come</span>
        )}
        {/* The deal itself, in the shop's words, where there is one to say. */}
        {special ? <span className="pcard__special">{deals[0] ?? "Special"}</span> : null}
        {soldOut ? <span className="pcard__soldout">Sold out</span> : null}
      </span>

      <span className="pcard__body">
        <span className="pcard__name">{name}</span>
        <span className="pcard__price">
          {priceLabel(listing)}
          {was ? (
            <s className="pcard__was">
              <span className="visually-hidden">, was </span>
              {priceLabel(was)}
            </s>
          ) : null}
        </span>
        {hint ? <span className="pcard__hint">{hint}</span> : null}
        {personalisable && yours ? (
          <span className="pcard__yours">
            <YourPhoto size={18} />
            Takes your photo
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** A shelf of cards: a swipeable row on a phone, a grid of four from 62rem. */
export function Shelf({ listings }: { listings: Listing[] }) {
  const mixed = !listings.every((l) => l.personalisable);
  return (
    <ul className="shelf__row">
      {listings.map((l) => (
        <li key={l.slug}>
          <ProductCard listing={l} yours={mixed} />
        </li>
      ))}
    </ul>
  );
}
