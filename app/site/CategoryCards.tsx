import Link from "next/link";

import {
  ArrowRight,
  Battery,
  Camera,
  Frame,
  GiftBox,
  Mug,
  Photos,
  Ring,
  Tag,
} from "./icons";
import { CATEGORIES } from "./data";

/** Each category's drawing, keyed by its slug. */
const ICONS: Record<string, typeof Photos> = {
  photos: Photos,
  frames: Frame,
  "personalised-gifts": Mug,
  batteries: Battery,
  jewellery: Ring,
  cameras: Camera,
  "gift-wrapping": GiftBox,
  specials: Tag,
};

/**
 * The shop's eight shelves as compact tiles, four by two on a wide screen and
 * two by four on a phone, so the whole range arrives in one glance.
 *
 * Every tile is a door: under the pointer it turns into a piece of the
 * catalogue's blue, its icon disc goes amber and the ring holding the arrow
 * fills. Specials wears that state at rest.
 *
 * `data-reveal` sits on the list item, not the link, so the entrance tween's
 * inline transform never pins the link's own hover lift.
 */
export function CategoryCards() {
  return (
    <ul className="cats">
      {CATEGORIES.map(({ name, slug, feature }) => {
        const Icon = ICONS[slug];
        return (
          <li key={slug} data-reveal>
            <Link
              className="cat"
              data-feature={feature ? "true" : undefined}
              href={`/shop/${slug}`}
              /* These routes ship with the catalogue in a later pass.
                 Prefetching a route that does not exist yet only buys a 404. */
              prefetch={false}
            >
              <span className="cat__icon" aria-hidden="true">
                <Icon size={28} />
              </span>
              <span className="cat__go" aria-hidden="true">
                <ArrowRight size={16} />
              </span>
              <span className="cat__name">{name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
