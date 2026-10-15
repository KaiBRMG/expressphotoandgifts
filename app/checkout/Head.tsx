"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cart } from "@/app/site/cartStore";

/** The steps of checkout, as the breadcrumb names them. The receipt has no way back. */
const STEPS = {
  photos: { label: "Your photos", trail: ["photos"] },
  details: { label: "Details", trail: ["photos", "details"] },
  done: { label: "Receipt", trail: null },
} as const;

const HREF = { photos: "/checkout", details: "/checkout/details" } as const;

export type Step = keyof typeof STEPS;

/**
 * The title band: the header's blue carried down. In checkout it carries the
 * trail back through the cart and the steps before this one; without a step
 * (the account page) it is the band alone. `aside` sits at the band's right,
 * such as the photo step's count.
 */
export function CheckoutHead({
  step,
  title,
  lede,
  aside,
  skipPhotos = false,
}: {
  step?: Step;
  title: string;
  lede?: ReactNode;
  aside?: ReactNode;
  /** The cart takes no photos, so the trail goes straight from cart to details. */
  skipPhotos?: boolean;
}) {
  const trail = step ? STEPS[step].trail : null;
  const before = (trail ?? []).slice(0, -1).filter((s) => !(skipPhotos && s === "photos"));
  return (
    <header className="shelfhead ckhead on-dark">
      <div className="shell ckhead__inner">
        <div>
          {step ? (
            <nav aria-label="Breadcrumb" className="shelfhead__crumbs">
              <ol>
                <li>
                  <Link href="/shop">Shop</Link>
                </li>
                {trail ? (
                  <li>
                    <button type="button" onClick={cart.open}>
                      Cart
                    </button>
                  </li>
                ) : null}
                {before.map((s) => (
                  <li key={s}>
                    <Link href={HREF[s]}>{STEPS[s].label}</Link>
                  </li>
                ))}
                <li aria-current="page">{STEPS[step].label}</li>
              </ol>
            </nav>
          ) : null}
          <h1 className="shelfhead__title">{title}</h1>
          {lede ? <p className="ckhead__lede">{lede}</p> : null}
        </div>
        {aside}
      </div>
    </header>
  );
}
