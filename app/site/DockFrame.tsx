"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/** The foot of the viewport the dock occupies: its 60px, its inset and a margin. */
const BAND = 130;

/**
 * The dock's frame, which steps it aside while anything marked
 * `data-dock-clear` passes through the band at the foot of the screen where
 * the dock floats. On a product page that is the buy column, so the round
 * mark never sits on the total or Add to cart; it comes back as soon as the
 * column has scrolled by. The cart stays a tap away in the header meanwhile.
 *
 * Read again on each page, since the layout and the dock outlive navigation.
 */
export function DockFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The page the dock was last stepped aside on, so a new page starts with it shown.
  const [awayOn, setAwayOn] = useState<string | null>(null);
  const away = awayOn === pathname;

  useEffect(() => {
    const marked = [...document.querySelectorAll("[data-dock-clear]")];
    if (marked.length === 0 || !("IntersectionObserver" in window)) return;

    const crossing = new Set<Element>();
    let observer: IntersectionObserver | null = null;

    const watch = () => {
      observer?.disconnect();
      crossing.clear();
      // A root that is only the band: everything above it is margined away.
      const top = Math.max(0, window.innerHeight - BAND);
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) crossing.add(e.target);
            else crossing.delete(e.target);
          }
          setAwayOn(crossing.size > 0 ? pathname : null);
        },
        { rootMargin: `-${top}px 0px 0px 0px` },
      );
      marked.forEach((el) => observer!.observe(el));
    };

    watch();
    window.addEventListener("resize", watch);
    return () => {
      window.removeEventListener("resize", watch);
      observer?.disconnect();
    };
  }, [pathname]);

  return (
    <div className={away ? "dock dock--away" : "dock"} inert={away}>
      {children}
    </div>
  );
}
