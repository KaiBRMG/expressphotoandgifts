import type { Metadata } from "next";
import { listCustomers } from "@/lib/admin/customers";
import { CustomersTable } from "./CustomersTable";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const [rows, params] = await Promise.all([listCustomers(), searchParams]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <CustomersTable rows={rows} initial={{ q: first(params.q), view: first(params.view) }} now={new Date().toISOString()} />;
}
