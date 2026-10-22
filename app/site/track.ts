import type { Beacon } from "@/lib/funnel";

type Step = { step: "view" | "cart"; slug: string } | { step: "checkout" | "details" } | { step: "miss"; q: string };

/** True the first time `key` is seen this visit, marking it seen. Private mode can't remember, so it's always true there, which only overcounts. */
function firstTime(key: string) {
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Private mode: nothing is remembered.
  }
  return true;
}

/**
 * Reports a step to the shop's counters (`/api/track`). A step counts once
 * a visit; a product's view or add once a visit for that product, carrying
 * whether it was the visit's first of its step; the same search once. Fire
 * and forget: a blocked or offline beacon costs the customer nothing.
 */
export function track(s: Step) {
  let beacon: Beacon;
  if ("slug" in s) {
    if (!firstTime(`track:${s.step}:${s.slug}`)) return;
    beacon = { ...s, first: firstTime(`track:${s.step}`) };
  } else {
    if (!firstTime(s.step === "miss" ? `track:miss:${s.q}` : `track:${s.step}`)) return;
    beacon = s;
  }

  const body = JSON.stringify(beacon);
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // Some browsers refuse a beacon on a page being hidden; fetch is the fallback.
  }
  void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}
