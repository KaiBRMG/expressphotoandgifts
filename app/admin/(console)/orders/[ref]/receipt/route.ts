import { requireAdmin } from "@/lib/admin/auth";
import { receiptPdf } from "@/lib/admin/receipt";
import { getOrder } from "@/lib/checkout/orders";

/** The order's receipt as an A4 PDF, read fresh and opened in the browser's viewer to print or save. */
export async function GET(_request: Request, ctx: RouteContext<"/admin/orders/[ref]/receipt">) {
  await requireAdmin();
  const { ref } = await ctx.params;
  const order = await getOrder(ref);
  if (!order) return new Response("No such order.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const pdf = await receiptPdf(order);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.status === "paid" ? "Receipt" : "Order"} ${order.ref}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
