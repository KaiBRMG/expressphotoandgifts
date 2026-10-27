import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { monthReport } from "@/lib/admin/analytics";
import { parseMonth, thisMonth } from "@/lib/admin/payments";
import { AnalyticsView } from "./View";

export const metadata: Metadata = { title: "Analytics" };

/** The owner's month: read fresh on every visit, from the orders, the shop's counters, PayFast and The Courier Guy. */
export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin();
  const current = thisMonth();
  const month = parseMonth((await searchParams).month) ?? current;
  return <AnalyticsView report={await monthReport(month)} current={current} />;
}
