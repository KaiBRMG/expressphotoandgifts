import type { CSSProperties } from "react";

import Image from "next/image";
import Link from "next/link";

import { CAROUSEL } from "./data";

/** The index that sits at the top of the arc when the wheel has not turned. */
const MID = (CAROUSEL.length - 1) / 2;

/**
 * The cycle is laid down twice so the arc stays full once the wheel turns, which
 * means the back half names the same eight products a second time. Those copies
 * are there to fill the curve, not to be read or reached: a screen reader that
 * walks this row should hear eight products, and a keyboard should stop at
 * eight frames, not sixteen going to the same eight places.
 */
const UNIQUE = CAROUSEL.length / 2;

/**
 * The catalogue carousel: the shop's own work laid along a shallow arc, as if
 * the prints were pinned around a wheel far bigger than the screen.
 *
 * The geometry is CSS, not script. Every frame carries its index `--n`, and the
 * stylesheet gives it a place on the arc from that index and one shared `--spin`
 * — a drop proportional to the square of its distance from the top (which is a
 * circle, at these shallow angles) and a lean proportional to that distance.
 * Because `--spin` is inherited, moving the wheel is one number: the frames
 * re-seat themselves along the arc rather than sliding as a rigid shape.
 *
 * `Motion.tsx` ties that number to the page's own scroll — down turns the wheel
 * left, up turns it back — so the row never moves on its own and never moves
 * without the visitor asking. With motion reduced the arc flattens to a plain
 * horizontal rail that scrolls by hand.
 *
 * The row shows the middle of the catalogue, not all of it, and that is the
 * point: the way to everything is the link above it, not this row.
 */
export function Carousel() {
  return (
    <div className="carousel" style={{ "--mid": MID } as CSSProperties}>
      <div className="carousel__viewport">
        <div
          className="carousel__track"
          role="group"
          aria-label="Some of the things we make"
        >
          {CAROUSEL.map((print, n) => {
            const repeat = n >= UNIQUE;

            return (
              <Link
                className="frame"
                /* The cycle is laid down twice, so the source alone is not
                   unique — the place on the wheel is. */
                key={`${n}-${print.src}`}
                href="/shop"
                /* The catalogue page ships in a later pass; see ServiceCards. */
                prefetch={false}
                style={{ "--n": n } as CSSProperties}
                {...(repeat
                  ? { tabIndex: -1, "aria-hidden": true as const }
                  : null)}
              >
                <Image
                  src={`/products/web/${print.src}.webp`}
                  alt={repeat ? "" : print.alt}
                  width={640}
                  height={640}
                  sizes="(max-width: 48rem) 62vw, 280px"
                />
                <span className="frame__name">{print.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
