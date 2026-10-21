import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { monthRange, parseMonth, thisMonth } from "@/lib/admin/payments";
import { statementPdf } from "@/lib/checkout/courier";

/** The Courier Guy's statement for a month (`?month=2026-10`), straight from TCG: a fresh signed link each visit. */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const { from, to } = monthRange(parseMonth(request.nextUrl.searchParams.get("month")) ?? thisMonth());
  const pdf = await statementPdf(from, to);
  if ("error" in pdf) return new Response(pdf.error, { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return Response.redirect(pdf.url, 303);
}
