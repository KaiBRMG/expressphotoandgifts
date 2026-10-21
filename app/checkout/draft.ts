import { useEffect, type RefObject } from "react";

/** What the details step remembers on this device between visits. */
export const DRAFT_KEY = "epg:details:v1";

/** Forgets the saved contact and address: once an order is paid, or the customer signs out. */
export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private mode: nothing was kept.
  }
}

/**
 * Keeps `--dock-h` on the page as tall as the bar docked at the foot of a
 * phone, so the page's own bottom padding always clears it, however many
 * problems or picked-up actions it is carrying.
 */
export function useDockHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(([e]) => root.style.setProperty("--dock-h", `${Math.ceil(e.borderBoxSize[0].blockSize)}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--dock-h");
    };
  }, [ref]);
}
