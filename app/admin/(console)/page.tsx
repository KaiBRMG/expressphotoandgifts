import type { Metadata } from "next";
import { getVocabulary } from "@/lib/catalog/queries";
import { countOrders } from "@/lib/admin/orders";
import { lastCheck } from "@/lib/admin/payments";
import { listProducts } from "@/lib/admin/products";
import { readLevels, stockRows } from "@/lib/admin/stock";
import { payfastStatus } from "@/lib/checkout/payfastApi";
import { getLiveDeals } from "@/lib/campaigns";
import { HiddenProducts } from "./HiddenProducts";
import { OrdersToDo } from "./OrdersToDo";
import { PayfastStatusNotice } from "./PayfastStatusNotice";
import { RunningLow } from "./RunningLow";

export const metadata: Metadata = { title: "Dashboard" };

/** The console's first page: small widgets, each one thing about the shop that may need doing. */
export default async function Dashboard() {
  const [products, vocabulary, orders, check, status, levels, deals] = await Promise.all([listProducts(), getVocabulary(), countOrders(), lastCheck(), payfastStatus(), readLevels({ trackedOnly: true }), getLiveDeals()]);

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__lede">What in the shop needs seeing to.</p>
        </div>
      </header>

      <PayfastStatusNotice status={status} />

      <div className="dash">
        <OrdersToDo counts={orders} check={check} now={new Date().toISOString()} />
        <HiddenProducts products={products} vocabulary={vocabulary} />
        <RunningLow rows={stockRows(products, levels)} deals={deals} />
      </div>
    </div>
  );
}
