import type { Metadata } from "next";

import { currentCustomer, savedDetails } from "@/lib/account/auth";
import { buildNeeds } from "@/lib/catalog/checkout";
import { getProducts } from "@/lib/catalog/queries";
import { courierReady } from "@/lib/checkout/courier";
import { payfastOnsite, payfastReady, payfastSandbox } from "@/lib/checkout/payfast";
import { DetailsStep } from "./DetailsStep";

export const metadata: Metadata = {
  title: "Your details",
  robots: { index: false },
};

/**
 * Checkout's last step: who the order is for, collection or courier, the
 * order once more with its photos, and payment. The cart and its photos are
 * read in the browser; the server adds what the catalogue says each line
 * needs, whether delivery and payment are switched on, and a signed-in
 * customer's saved details.
 */
export default async function DetailsPage({ searchParams }: PageProps<"/checkout/details">) {
  const [{ cancelled }, products, customer] = await Promise.all([searchParams, getProducts(), currentCustomer()]);
  const saved = customer ? await savedDetails(customer.uid) : null;
  return (
    <DetailsStep
      needs={buildNeeds(products)}
      account={customer ? { email: customer.email, saved } : null}
      courier={courierReady()}
      payments={payfastReady()}
      onsite={payfastOnsite()}
      sandbox={payfastSandbox()}
      cancelled={cancelled === "1"}
    />
  );
}
