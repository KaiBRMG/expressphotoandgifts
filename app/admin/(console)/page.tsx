import type { Metadata } from "next";
import { getVocabulary } from "@/lib/catalog/queries";
import { countOrders } from "@/lib/admin/orders";
import { listProducts } from "@/lib/admin/products";
import { HiddenProducts } from "./HiddenProducts";
import { OrdersToDo } from "./OrdersToDo";

export const metadata: Metadata = { title: "Dashboard" };

/** The console's first page: small widgets, each one thing about the shop that may need doing. */
export default async function Dashboard() {
  const [products, vocabulary, orders] = await Promise.all([listProducts(), getVocabulary(), countOrders()]);

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__lede">What in the shop needs seeing to.</p>
        </div>
      </header>

      <div className="dash">
        <OrdersToDo counts={orders} />
        <HiddenProducts products={products} vocabulary={vocabulary} />
      </div>
    </div>
  );
}
