"use client";

import { useEffect } from "react";

const QUESTION = "You have changes that aren’t saved. Leave without saving them?";

/**
 * Asks before unsaved changes are left behind: on closing or reloading the
 * tab (the browser's own prompt) and on following a link inside the console.
 */
export function useLeaveGuard(dirty: boolean) {
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
    window.addEventListener("beforeunload", onUnload);
    // Capture, so the question comes before Next's router takes the click.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}
