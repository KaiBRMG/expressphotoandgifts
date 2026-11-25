import Image from "next/image";

import { rands } from "@/lib/catalog/listing";
import { GIFT_WRAP, WRAP_STORY } from "@/lib/catalog/wrap";

/**
 * What gift wrapping is, in the shop's own words beside a photograph of it:
 * on every product page, and once at checkout, where the tick is. The
 * picture's ground is white, so it sits on white and never on the blue.
 * `level` is the heading's, which differs between a page section and a
 * disclosure inside a form. `title` stands in where the page is already
 * called Gift Wrapping.
 */
export function GiftWrapStory({ level = 2, id, title = "Gift wrapping" }: { level?: 2 | 3; id: string; title?: string }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="wrapstory">
      <Image
        className="wrapstory__pic"
        src="/gift-wrap.webp"
        width={640}
        height={640}
        sizes="(min-width: 56rem) 360px, 280px"
        alt="A square gift box wrapped in brown paper, tied with a deep blue organza bow and a tag reading “Dear James, Happy Birthday, Love Mary”."
        loading="lazy"
        // A 29 KB file already cut to size: the image optimiser has nothing to add.
        unoptimized
      />
      <div className="wrapstory__copy">
        <Heading id={id} className={level === 2 ? "h2" : "wrapstory__title"}>
          {title}
        </Heading>
        <p className="wrapstory__text">{WRAP_STORY}</p>
        <ul className="wrapstory__how">
          <li>
            <strong>{rands(GIFT_WRAP)} for each item</strong>, added when you check your order.
          </li>
          <li>Tick Gift wrap on any item there, and every one of it is wrapped.</li>
          <li>Write what the tag should say in that item&rsquo;s note.</li>
        </ul>
      </div>
    </div>
  );
}
