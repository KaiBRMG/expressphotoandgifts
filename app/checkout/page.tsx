import type { Metadata } from "next";

import { buildNeeds } from "@/lib/catalog/checkout";
import { getProducts } from "@/lib/catalog/queries";
import { PhotoStep } from "./PhotoStep";

export const metadata: Metadata = {
  title: "Your photos",
  robots: { index: false },
};

export const revalidate = 3600;

/**
 * The photo step of checkout. The cart lives in the browser, so the page
 * ships what every variant on sale needs (worked out here from the catalogue)
 * and the browser matches it to the cart.
 */
export default async function CheckoutPage() {
  const needs = buildNeeds(await getProducts());
  return <PhotoStep needs={needs} />;
}
