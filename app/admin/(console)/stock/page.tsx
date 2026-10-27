import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listStock } from "@/lib/admin/stock";
import { StockTable } from "./StockTable";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage({ searchParams }: PageProps<"/admin/stock">) {
  await requireAdmin();
  const [rows, params] = await Promise.all([listStock(), searchParams]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <StockTable rows={rows} initial={{ q: first(params.q), show: first(params.show) }} now={new Date().toISOString()} />;
}
