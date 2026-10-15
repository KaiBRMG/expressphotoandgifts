"use client";

import { useId, useState } from "react";

import { rands } from "@/lib/catalog/listing";
import type { ChartSize } from "@/lib/catalog/purchase";

/**
 * Every size on one ladder, drawn to true scale from a shared corner, the way
 * prints of different sizes stack on the counter. Picking a size lights its
 * outline and names its price, so "13 × 18" stops being a number and becomes a
 * shape the customer can hold their own photo up against.
 *
 * The list is a real radio group, so the arrow keys walk the sizes and a
 * screen reader hears "20 × 30 cm, R150, 5 of 6". The drawing repeats it for
 * the eye and is hidden from assistive tech.
 *
 * On the storefront it keeps its own choice, on blue. On a product page the
 * buy column holds the choice (`picked` and `onPick`) and it sits on white
 * (`tone="paper"`).
 */
export function SizeChart({
  sizes,
  picked: controlled,
  onPick,
  tone = "leather",
  legend = "Choose a size to see it to scale",
}: {
  sizes: ChartSize[];
  picked?: number;
  onPick?: (index: number) => void;
  tone?: "leather" | "paper";
  legend?: string;
}) {
  const name = useId();
  // Start on 20 × 30, the A4 size the shop's other frames are sold in, when it is there.
  const [own, setOwn] = useState(() =>
    Math.max(0, sizes.findIndex((s) => s.w === 20 && s.h === 30)),
  );
  const picked = controlled ?? own;
  const pick = onPick ?? setOwn;
  const W = Math.max(...sizes.map((s) => s.w));
  const H = Math.max(...sizes.map((s) => s.h));
  const current = sizes[picked];
  const u = H / 40;

  return (
    <div className={tone === "paper" ? "chart chart--paper" : "chart"}>
      <svg
        className="chart__drawing"
        viewBox={`-0.6 -0.6 ${W + 1.2} ${H + 1.2}`}
        aria-hidden="true"
      >
        {/* Largest first, so every smaller print sits on top of the one it fits inside. */}
        {sizes
          .map((s, i) => ({ s, i }))
          .sort((a, b) => b.s.w * b.s.h - a.s.w * a.s.h)
          .map(({ s, i }) => (
            <rect
              key={s.label}
              className="chart__print"
              data-picked={i === picked ? "true" : undefined}
              x={0}
              y={H - s.h}
              width={s.w}
              height={s.h}
              rx={0.5}
              onClick={() => pick(i)}
            />
          ))}
        {/* Set for the 40cm ladder and scaled with the drawing, so a tile's
            20cm ladder labels at the same apparent size. */}
        <text className="chart__tag" x={0.9 * u} y={H - current.h + 2.4 * u} style={{ fontSize: 1.7 * u }}>
          {`${current.w} × ${current.h} cm`}
        </text>
      </svg>

      <fieldset className="chart__sizes">
        <legend className="visually-hidden">{legend}</legend>
        {sizes.map((s, i) => (
          <label key={s.label} className="chart__size">
            <input
              type="radio"
              name={name}
              value={s.label}
              checked={i === picked}
              onChange={() => pick(i)}
            />
            <span className="chart__measure">{s.label}</span>
            <span className="chart__price">{s.price !== null ? rands(s.price) : "Ask us"}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
