"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redraws the page from the server every minute while it is open and in view,
 * and when the tab comes back after a while, so what The Courier Guy's webhook
 * has written since appears without a reload. Draws nothing.
 */
export function LiveRefresh({ every = 60_000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.hidden) return;
      last = Date.now();
      router.refresh();
    };
    const onShow = () => {
      if (!document.hidden && Date.now() - last > every) refresh();
    };
    const timer = setInterval(refresh, every);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [router, every]);
  return null;
}
