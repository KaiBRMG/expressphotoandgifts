"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

/** The width a chart has to draw in, followed as its box resizes; the box's CSS keeps it from taking its size from the chart. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** The day a chart is reading, set by pointer or by the arrow keys from `start`; Escape lets it go. */
export function useDayCursor(days: number, start: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    const from = active ?? start;
    if (e.key === "ArrowLeft") setActive(Math.max(1, from - 1));
    else if (e.key === "ArrowRight") setActive(Math.min(days, from + 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };
  return { active, setActive, onKeyDown, onBlur: () => setActive(null) };
}

/** A month's day ticks: each week's start and the last day, unless it would crowd the 22nd. */
export const dayTicks = (days: number) => [1, 8, 15, 22, days].filter((d) => d === days || days - d >= 4);

/** Where a tooltip centred on `x` sits, kept `margin` inside the chart's edges. */
export const tipAt = (x: number, width: number, margin: number) => Math.min(Math.max(x, margin), width - margin);
