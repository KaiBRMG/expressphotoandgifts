import Link from "next/link";

import {
  ArrowRight,
  Battery,
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
  "photo-printing": Photos,
  frames: Frame,
  "photo-gifts": Mug,
  "add-ons": Battery,
  jewellery: Ring,
  "gift-wrapping": GiftBox,
  specials: Tag,
};

/**
 * The shop's seven shelves as compact tiles, four then three on a wide screen
 * and two by three on a phone, with Specials two columns wide closing the grid,
 * so the whole range arrives in one glance.
 *
 * Every tile is an amber door with a white icon disc: under the pointer it
 * turns into a piece of the catalogue's blue, its icon disc goes amber and the
 * ring holding the arrow fills. Specials wears that state at rest.
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
          <li key={slug} data-reveal data-wide={feature ? "true" : undefined}>
            <Link
              className="cat"
              data-feature={feature ? "true" : undefined}
              href={`/shop/${slug}`}
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
