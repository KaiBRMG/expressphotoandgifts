import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listCustomers } from "@/lib/admin/customers";
import { emailableCampaigns } from "@/lib/admin/mailings";
import { CustomersTable } from "./CustomersTable";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const [rows, campaigns, params] = await Promise.all([listCustomers(), emailableCampaigns(), searchParams]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <CustomersTable rows={rows} campaigns={campaigns} initial={{ q: first(params.q), view: first(params.view) }} now={new Date().toISOString()} />;
}
