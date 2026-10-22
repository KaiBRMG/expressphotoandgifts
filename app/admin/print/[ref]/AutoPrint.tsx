"use client";

import { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { Printer } from "@/app/site/icons";

/** Opens the print dialog once every photo on the page has loaded; the button prints again. */
export function AutoPrint() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const imgs = [...document.querySelectorAll<HTMLImageElement>(".pview__img")];
    let cancelled = false;
    const loaded = (i: HTMLImageElement) =>
      i.complete
        ? Promise.resolve()
        : new Promise<void>((done) => {
            i.addEventListener("load", () => done(), { once: true });
            i.addEventListener("error", () => done(), { once: true });
          });
    Promise.all(imgs.map(loaded)).then(() => {
        if (cancelled) return;
        setReady(true);
        window.print();
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <Button leftSection={<Printer size={18} />} loading={!ready} onClick={() => window.print()}>
      Print
    </Button>
  );
}
