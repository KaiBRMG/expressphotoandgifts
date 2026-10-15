"use client";

import "@/app/shop/shop.css";

import { useMemo } from "react";
import { priceRange, type ProductDraft } from "@/lib/catalog/edit";
import { toListings } from "@/lib/catalog/listing";
import type { Product } from "@/lib/catalog/types";
import { ProductCard } from "@/app/shop/ProductCard";

/**
 * The card exactly as the shop draws it, from the draft as it is typed: the
 * shop's own component and stylesheet, so the preview cannot drift from the
 * real thing. It is inert; whether shoppers can see it is said once, under
 * the status.
 */
export function Preview({
  draft,
  slug,
  category,
}: {
  draft: ProductDraft;
  slug: string;
  category: string;
}) {
  const listing = useMemo(() => {
    const product = { ...draft, slug, currency: "ZAR", priceRange: priceRange(draft.variants), createdAt: "", updatedAt: "" } as Product;
    return toListings([product], new Map([[draft.categoryId, category]]))[0];
  }, [draft, slug, category]);

  return (
    <aside className="preview" aria-label="Preview">
      <h2 className="preview__title">Shop card preview</h2>
      <div className="preview__card" inert>
        <ProductCard listing={listing} sizes="280px" />
      </div>
    </aside>
  );
}
