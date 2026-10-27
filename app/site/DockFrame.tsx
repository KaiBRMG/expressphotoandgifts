"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/** Where the dock floats over the page rather than beside it: a phone, where it hides while the page is read downwards. */
const PHONE = "(max-width: 45.99rem)";
/** Scrolled less than this from the top, or less than this from the foot, the dock is always there. */
const NEAR = 240;
/** A scroll shorter than this is a tremor of the thumb, not a direction. */
const DRIFT = 10;

/**
 * The dock's frame. On a phone it gets out of the way of reading: it slides
 * down while the page is scrolled down and comes straight back on any scroll
 * up, at the top of a page and at its foot. The header, with Search and the
 * Cart, stays where it is meanwhile.
 *
 * A product page's floating Add to cart takes the dock's place in CSS
 * (`product.css`), so there is never more than one floating action.
 *
 * Read again on each page, since the layout and the dock outlive navigation.
 */
export function DockFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The page the dock was last tucked away on, so a new page starts with it shown.
  const [quietOn, setQuietOn] = useState<string | null>(null);
  const quiet = quietOn === pathname;

  useEffect(() => {
    const phone = window.matchMedia(PHONE);
    let last = window.scrollY;
    let frame = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      // The layout read comes last, and only on a phone that has scrolled.
      if (!phone.matches || y < NEAR || y + window.innerHeight >= document.documentElement.scrollHeight - NEAR) {
        setQuietOn(null);
        last = y;
      } else if (Math.abs(y - last) > DRIFT) {
        setQuietOn(y > last ? pathname : null);
        last = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <div className={quiet ? "dock dock--away" : "dock"}>
      {children}
    </div>
  );
}
