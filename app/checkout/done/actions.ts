"use server";

import { applyNotice, getOrder, orderForReceipt, orders } from "@/lib/checkout/orders";
import { afterPaid } from "@/lib/checkout/paid";
import { refreshIfStale } from "@/lib/checkout/shipments";
import { pfAmount } from "@/lib/checkout/payfast";
import type { Attempt, Order, OrderStatus } from "@/lib/checkout/order";

/** Whether the receipt's order is paid yet, for whoever holds its link. */
export async function receiptStatus(ref: string, token: string): Promise<OrderStatus | null> {
  const order = await orderForReceipt(String(ref), String(token));
  if (order?.status === "pending" && process.env.NODE_ENV === "development") return (await paidLocally(order)) ?? order.status;
  return order?.status ?? null;
}

/** When the receipt's order last changed, for whoever holds its link: the receipt redraws only when it moves. */
export async function receiptStamp(ref: string, token: string): Promise<string | null> {
  const order = await orderForReceipt(String(ref), String(token));
  if (!order) return null;
  refreshIfStale(order);
  return order.updatedAt;
}

/**
 * Local development only: PayFast can't reach localhost with its notice, so
 * the order's latest attempt is taken as paid, through the same path a
 * notice takes (`applyNotice`, then the emails).
 */
async function paidLocally(order: Order): Promise<OrderStatus | null> {
  if (!order.attempts) return null;
  const snap = await orders().doc(order.ref).collection("attempts").doc(`${order.ref}-${order.attempts}`).get();
  if (!snap.exists) return null;
  const attempt = snap.data() as Attempt;
  const amount = pfAmount(attempt.total);
  const applied = await applyNotice({ attempt: attempt.id, pfPaymentId: `local-${attempt.id}`, status: "COMPLETE", amountGross: amount, amountFee: "0.00", amountNet: amount });
  if (applied.outcome === "paid") await afterPaid(applied.order);
  return (await getOrder(order.ref))?.status ?? null;
}
