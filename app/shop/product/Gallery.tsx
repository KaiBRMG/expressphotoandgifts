"use client";

import { useState } from "react";

import { ProductImage } from "@/app/site/ProductImage";

export type GalleryPhoto = { code: string; alt: string };

const SIZES = "(max-width: 62rem) calc(100vw - 2 * clamp(20px, 5vw, 56px)), 640px";

/**
 * The shop's own photograph, large, as a print rather than a door: it has its
 * corner and its lift and no edge, because pressing it goes nowhere. A product
 * with several photographs gets a row of small prints under it to choose by;
 * most have one, and then there is no row at all.
 */
export function Gallery({ photos, special }: { photos: GalleryPhoto[]; special: boolean }) {
  const [shown, setShown] = useState(0);
  const current = photos[shown];

  return (
    <div className="gallery">
      <div className="gallery__main">
        {current ? (
          <ProductImage
            key={current.code}
            code={current.code}
            alt={current.alt}
            width={640}
            height={640}
            sizes={SIZES}
            loading="eager"
            fetchPriority={shown === 0 ? "high" : "auto"}
          />
        ) : (
          /* The shop has not supplied this photograph yet. */
          <span className="gallery__none">Photo to come</span>
        )}
        {special ? <span className="pcard__special">Special</span> : null}
      </div>

      {photos.length > 1 ? (
        <ul className="gallery__thumbs" aria-label="Photographs">
          {photos.map((p, i) => (
            <li key={p.code}>
              <button
                type="button"
                className="gallery__thumb"
                aria-current={i === shown ? "true" : undefined}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                onClick={() => setShown(i)}
              >
                <ProductImage code={p.code} alt="" width={400} height={400} sizes="88px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
