"use client";

import { useEffect, useRef } from "react";

const QUESTION = "You have changes that aren’t saved. Leave without saving them?";

/**
 * Stops the popstate the coming `history.back()` fires before the router sees
 * it (capture on window runs ahead of its listener). Disarmed if none arrives,
 * so it can never eat a later Back of the user's own.
 */
function swallowNextPop(then: () => void) {
  const disarm = () => {
    window.removeEventListener("popstate", swallow, true);
    clearTimeout(timer);
  };
  const swallow = (e: PopStateEvent) => {
    e.stopImmediatePropagation();
    disarm();
    then();
  };
  const timer = setTimeout(disarm, 1000);
  window.addEventListener("popstate", swallow, true);
}

/**
 * Asks before unsaved changes are left behind: on closing or reloading the
 * tab (the browser's own prompt), on following a link inside the console, and
 * on the browser's Back. The router can't be asked to wait, so while there are
 * changes a spare history entry for this same page sits on top: Back lands on
 * it first, out of the router's sight, and the question is asked there.
 */
export function useLeaveGuard(dirty: boolean) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (new URL(link.href).pathname === window.location.pathname) return;
      if (!window.confirm(QUESTION)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    let spare = true;
    window.history.pushState(window.history.state, "", window.location.href);
    const onPop = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      if (window.confirm(QUESTION)) {
        spare = false;
        window.removeEventListener("popstate", onPop, true);
        window.history.back();
      } else {
        window.history.pushState(window.history.state, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", onUnload);
    // Capture, so the question comes before Next's router takes the click.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop, true);
      // Saved or discarded while still here: take the spare entry back out, keeping
      // the address it had (a tab may have changed). Leaving the page leaves it be.
      queueMicrotask(() => {
        if (!spare || !mounted.current) return;
        const href = window.location.href;
        swallowNextPop(() => window.history.replaceState(window.history.state, "", href));
        window.history.back();
      });
    };
  }, [dirty]);
}
