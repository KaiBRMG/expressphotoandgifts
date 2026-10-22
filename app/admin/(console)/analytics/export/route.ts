import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { monthCsv } from "@/lib/admin/analytics";
import { parseMonth, thisMonth } from "@/lib/admin/payments";

/** A month's sales and refunds as a spreadsheet (`?month=2026-10`), for the shop's books. */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const month = parseMonth(request.nextUrl.searchParams.get("month")) ?? thisMonth();
  return new Response(`﻿${await monthCsv(month)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="express-photo-orders-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
