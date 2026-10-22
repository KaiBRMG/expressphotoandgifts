import "server-only";

import { detailsFrom, saveDetails } from "@/lib/account/auth";
import { orderEmails } from "./emails";
import type { Order } from "./order";
import { orders } from "./orders";
import { lowStockEmail } from "@/lib/stock";
import { getLiveDeals } from "@/lib/campaigns";

/**
 * What follows a paid order, once PayFast has its answer (`after()` in the
 * notice route): its details saved to the customer's account when it has
 * one, and its two emails sent, with whether each went noted on the order;
 * and the shop warned of anything it took to the low-stock level, with the
 * live campaign selling it, if any.
 */
export async function afterPaid(order: Order): Promise<void> {
  const [, sent] = await Promise.all([
    order.uid ? saveDetails(order.uid, detailsFrom(order)).catch((e) => console.error("Details not saved", order.ref, e)) : null,
    orderEmails(order),
    (order.stock?.low.length ? getLiveDeals().then((deals) => lowStockEmail(order, deals)) : lowStockEmail(order)).catch((e) => console.error("Low-stock email not sent", order.ref, e)),
  ]);
  const update = Object.fromEntries(Object.entries(sent).map(([who, s]) => [`emails.${who}`, s]));
  await orders()
    .doc(order.ref)
    .update(update)
    .catch((e) => console.error("Email record not saved", order.ref, e));
}
