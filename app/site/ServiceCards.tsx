import Link from "next/link";

import { ArrowRight } from "./icons";
import { SERVICES } from "./data";

/**
 * The four services, one card each, and each card a door into the shop.
 *
 * Centred and airy: the drawing sits on the card's own white with room around
 * it rather than in a tinted plate behind a rule, and the name and its one line
 * are centred under it. The one thing the reference composition does not have is
 * any sign that it can be pressed, so the card keeps its border and its lift and
 * ends on a hairline ring holding the arrow — the same ring the cover's scroll
 * cue uses, which is this page's way of drawing "there is more this way".
 *
 * Still compact: four across a wide screen, two-up on a phone, never stacked.
 *
 * No client JS: the whole card is a link, hover and focus are CSS, and the
 * entrance is the page's one reveal grammar via `data-reveal`.
 *
 * The art is a plain `<img>` rather than `next/image`: these are static SVGs
 * served from `/public`, so there is nothing for the optimiser to resize, and
 * routing them through it would mean turning on `dangerouslyAllowSVG`.
 */
export function ServiceCards() {
  return (
    <div className="svcs">
      {SERVICES.map((service) => (
        <Link
          className="svc"
          key={service.slug}
          href={`/shop/${service.slug}`}
          /* These routes ship with the catalogue in a later pass. Prefetching
             a route that does not exist yet only buys a 404 on hover. */
          prefetch={false}
          data-reveal
        >
          {/* Decorative: it restates the service the heading names. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="svc__art" src={`/illustrations/${service.art}.svg`} alt="" />

          <h3 className="svc__name">{service.name}</h3>
          <p className="svc__blurb">{service.blurb}</p>

          <span className="svc__go" aria-hidden="true">
            <ArrowRight size={16} />
          </span>
        </Link>
      ))}
    </div>
  );
}
