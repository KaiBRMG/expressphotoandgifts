import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listOrders } from "@/lib/admin/orders";
import { OrdersTable } from "./OrdersTable";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const [rows, params] = await Promise.all([listOrders(), searchParams]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <OrdersTable rows={rows} initial={{ q: first(params.q), view: first(params.view), stage: first(params.stage) }} now={new Date().toISOString()} />;
}
