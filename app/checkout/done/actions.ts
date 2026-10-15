"use server";

import { orderForReceipt } from "@/lib/checkout/orders";
import type { OrderStatus } from "@/lib/checkout/order";

/** Whether the receipt's order is paid yet, for whoever holds its link. */
export async function receiptStatus(ref: string, token: string): Promise<OrderStatus | null> {
  const order = await orderForReceipt(String(ref), String(token));
  return order?.status ?? null;
}
