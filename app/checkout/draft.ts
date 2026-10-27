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

/** The order PayFast's window said was paid on this device, until its receipt confirms it. */
const PAID_KEY = "epg:paid:v1";

/** How long that is believed without the receipt confirming it: past it, the customer may pay again. */
const PAID_FOR_MS = 24 * 60 * 60 * 1000;

/** Notes that PayFast's window reported this order paid, so going back to the details step can't pay for it twice. */
export function rememberPaid(ref: string, receipt: string) {
  try {
    window.localStorage.setItem(PAID_KEY, JSON.stringify({ ref, receipt, at: Date.now() }));
  } catch {
    // Private mode: the shop flags a second payment instead.
  }
}

/** The receipt of this order, when PayFast's window reported it paid on this device lately; or null. */
export function paidReceipt(ref: string): string | null {
  try {
    const kept = JSON.parse(window.localStorage.getItem(PAID_KEY) ?? "null") as { ref?: unknown; receipt?: unknown; at?: unknown } | null;
    const fresh = typeof kept?.at === "number" && Date.now() - kept.at < PAID_FOR_MS;
    return fresh && kept?.ref === ref && typeof kept.receipt === "string" ? kept.receipt : null;
  } catch {
    return null;
  }
}

/** Forgets it: the receipt has confirmed the payment. */
export function forgetPaid() {
  try {
    window.localStorage.removeItem(PAID_KEY);
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
