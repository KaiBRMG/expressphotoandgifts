import { requireAdmin } from "@/lib/admin/auth";
import { marketingCsv } from "@/lib/admin/customers";

/** Everyone who has agreed to marketing email and not withdrawn, as a spreadsheet for the shop's mailing tool. */
export async function GET() {
  await requireAdmin();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${await marketingCsv()}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="express-photo-marketing-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
