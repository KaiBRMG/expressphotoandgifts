import type { Metadata } from "next";
import { listStock } from "@/lib/admin/stock";
import { StockTable } from "./StockTable";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage({ searchParams }: PageProps<"/admin/stock">) {
  const [rows, params] = await Promise.all([listStock(), searchParams]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <StockTable rows={rows} initial={{ q: first(params.q), show: first(params.show) }} now={new Date().toISOString()} />;
}
